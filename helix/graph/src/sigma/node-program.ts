import { NodeProgram } from 'sigma/rendering'
import type { NodeDisplayData, RenderParams } from 'sigma/types'
import { floatColor } from 'sigma/utils'

/** The shapes a note is drawn in, numbered as the shader reads them. */
export const SHAPES = { circle: 0, diamond: 2, ring: 3, square: 1 } as const

/** How heavily a note is drawn, numbered as the shader reads them. */
export const EMPHASES = { outlined: 1, solid: 0, subtle: 2 } as const

/** What a note is made of, numbered as the shader reads them. */
export const MATERIALS = { flat: 0, frosted: 2, glass: 1 } as const

/** What the node program reads off a note, beyond what Sigma gives every note. */
export interface HelixNodeData {
  /** `EMPHASES`. */
  emphasisCode?: number
  /** How strongly the note glows, from 0 to 1: the selected note's halo. */
  glow?: number
  /** `MATERIALS`. */
  materialCode?: number
  /** `SHAPES`. */
  shapeCode?: number
}

/**
 * How far past the note the triangle it is drawn in reaches, as a share of
 * its radius, which is the room its glow has.
 */
const REACH = 2.6

// language=GLSL
const VERTEX = /* glsl */ `
attribute vec4 a_id;
attribute vec4 a_color;
attribute vec2 a_position;
attribute float a_size;
attribute float a_shape;
attribute float a_emphasis;
attribute float a_material;
attribute float a_glow;
attribute float a_angle;

uniform mat3 u_matrix;
uniform float u_sizeRatio;
uniform float u_correctionRatio;

varying vec4 v_color;
varying vec2 v_diffVector;
varying float v_radius;
varying float v_shape;
varying float v_emphasis;
varying float v_material;
varying float v_glow;

const float bias = 255.0 / 254.0;

void main() {
  float size = a_size * u_correctionRatio / u_sizeRatio * 4.0;
  vec2 diffVector = size * ${REACH.toFixed(2)} * vec2(cos(a_angle), sin(a_angle));
  gl_Position = vec4((u_matrix * vec3(a_position + diffVector, 1)).xy, 0, 1);
  v_diffVector = diffVector;
  v_radius = size / 2.0;
  v_shape = a_shape;
  v_emphasis = a_emphasis;
  v_material = a_material;
  v_glow = a_glow;
  #ifdef PICKING_MODE
  v_color = a_id;
  #else
  v_color = a_color;
  #endif
  v_color.a *= bias;
}
`

// language=GLSL
const FRAGMENT = /* glsl */ `
precision highp float;

varying vec4 v_color;
varying vec2 v_diffVector;
varying float v_radius;
varying float v_shape;
varying float v_emphasis;
varying float v_material;
varying float v_glow;

uniform float u_correctionRatio;

/* How far a point is outside the note's shape, in radii: below zero inside. */
float outside(vec2 p, float shape) {
  if (shape > 0.5 && shape < 1.5) {
    vec2 q = abs(p) - vec2(0.7);
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - 0.18;
  }
  if (shape > 1.5 && shape < 2.5) {
    return (abs(p.x) + abs(p.y)) * 0.7071 - 0.86;
  }
  return length(p) - 1.0;
}

void main(void) {
  vec2 p = v_diffVector / v_radius;
  float d = outside(p, v_shape);

  #ifdef PICKING_MODE
  if (d > 0.0) discard;
  gl_FragColor = v_color;
  #else
  float aa = u_correctionRatio * 2.0 / v_radius;
  float inside = 1.0 - smoothstep(-aa, 0.0, d);

  /* A ring is a circle drawn outlined, whatever its emphasis says. */
  float emphasis = v_shape > 2.5 ? 1.0 : v_emphasis;
  float edge = smoothstep(-0.32 - aa, -0.32, d);
  float fill = emphasis > 1.5 ? mix(0.3, 1.0, edge) : emphasis > 0.5 ? edge : 1.0;

  vec3 color = v_color.rgb;
  float alpha = 1.0;
  /* How large the note is drawn, in pixels: a highlight that suits a hub is
     a speck of noise on a leaf, so the detail grows in with the size. */
  float drawn = smoothstep(4.0, 14.0, v_radius / u_correctionRatio);
  /* Lit from above on the left, as every surface here is. */
  float lit = clamp(0.5 + 0.5 * dot(normalize(vec2(-0.45, 0.9)), p), 0.0, 1.0);
  /* A fine rim a shade darker, so notes that touch stay two. */
  float rim = smoothstep(-0.2 - aa, -0.2, d);
  if (v_material > 0.5 && v_material < 1.5) {
    /* Glass: shaded like a sphere, a highlight, and light at its rim. */
    color *= mix(0.72, 1.12, lit);
    float highlight = exp(-pow(length(p - vec2(-0.32, 0.38)) / 0.26, 2.0));
    color = mix(color, vec3(1.0), highlight * mix(0.25, 0.6, drawn));
    color = mix(color, vec3(1.0), rim * 0.22 * drawn);
    alpha = 0.94;
  } else if (v_material > 1.5) {
    /* Frosted: a milky body, a soft fall of light, and no sharp highlight. */
    color = mix(color * mix(0.86, 1.06, lit), vec3(1.0), 0.16);
    color = mix(color, vec3(1.0), rim * 0.14);
    alpha = 0.86;
  } else {
    color = mix(color, color * 0.72, rim * 0.6);
  }

  float body = inside * fill * alpha * v_color.a;
  /* The glow, outside the shape: a crisp ring just clear of the edge and a
     soft light falling away beyond it, both in the note's own color. */
  float reach = ${(REACH - 1).toFixed(2)};
  float ring = 1.0 - smoothstep(0.0, 0.07 + aa, abs(d - 0.32));
  float falloff = exp(-d * 2.4) * (1.0 - smoothstep(reach * 0.8, reach, d));
  float halo = v_glow * step(0.0, d) * clamp(ring * 0.95 + falloff * 0.55, 0.0, 1.0) * v_color.a;
  /* Premultiplied, as Sigma blends: the body over its glow. */
  gl_FragColor = vec4(color * body + v_color.rgb * halo * (1.0 - body), body + halo * (1.0 - body));
  #endif
}
`

const { FLOAT, UNSIGNED_BYTE } = WebGLRenderingContext

const UNIFORMS = ['u_sizeRatio', 'u_correctionRatio', 'u_matrix'] as const

/**
 * Draws a note in its shape, its emphasis and its material, with a glow where
 * it is selected: one triangle a note, as Sigma's own circle is, cut to the
 * shape where it is drawn. Pressing reads the shape and not the glow, so a
 * press beside a note is not a press on it.
 */
export class HelixNodeProgram extends NodeProgram<(typeof UNIFORMS)[number]> {
  getDefinition() {
    return {
      ATTRIBUTES: [
        { name: 'a_position', size: 2, type: FLOAT },
        { name: 'a_size', size: 1, type: FLOAT },
        { name: 'a_color', normalized: true, size: 4, type: UNSIGNED_BYTE },
        { name: 'a_id', normalized: true, size: 4, type: UNSIGNED_BYTE },
        { name: 'a_shape', size: 1, type: FLOAT },
        { name: 'a_emphasis', size: 1, type: FLOAT },
        { name: 'a_material', size: 1, type: FLOAT },
        { name: 'a_glow', size: 1, type: FLOAT },
      ],
      CONSTANT_ATTRIBUTES: [{ name: 'a_angle', size: 1, type: FLOAT }],
      CONSTANT_DATA: [[0], [(2 * Math.PI) / 3], [(4 * Math.PI) / 3]],
      FRAGMENT_SHADER_SOURCE: FRAGMENT,
      METHOD: WebGLRenderingContext.TRIANGLES,
      UNIFORMS,
      VERTEX_SHADER_SOURCE: VERTEX,
      VERTICES: 3,
    }
  }

  processVisibleItem(nodeIndex: number, startIndex: number, data: NodeDisplayData & HelixNodeData) {
    const array = this.array
    let at = startIndex
    array[at++] = data.x
    array[at++] = data.y
    array[at++] = data.size
    array[at++] = floatColor(data.color)
    array[at++] = nodeIndex
    array[at++] = data.shapeCode ?? SHAPES.circle
    array[at++] = data.emphasisCode ?? EMPHASES.solid
    array[at++] = data.materialCode ?? MATERIALS.flat
    array[at] = data.glow ?? 0
  }

  setUniforms(
    params: RenderParams,
    {
      gl,
      uniformLocations,
    }: { gl: WebGLRenderingContext; uniformLocations: Record<string, WebGLUniformLocation> },
  ) {
    gl.uniform1f(uniformLocations.u_correctionRatio as WebGLUniformLocation, params.correctionRatio)
    gl.uniform1f(uniformLocations.u_sizeRatio as WebGLUniformLocation, params.sizeRatio)
    gl.uniformMatrix3fv(uniformLocations.u_matrix as WebGLUniformLocation, false, params.matrix)
  }
}
