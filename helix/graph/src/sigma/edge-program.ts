import { createEdgeCompoundProgram, EdgeProgram, type EdgeProgramType } from 'sigma/rendering'
import type { EdgeDisplayData, NodeDisplayData, RenderParams } from 'sigma/types'
import { floatColor } from 'sigma/utils'

/** What the edge program reads off a link, beyond what Sigma gives every link. */
export interface HelixEdgeData {
  /** How strongly the link glows, from 0 to 1: a link on the selected note's path. */
  glow?: number
  /** Whether the link is drawn heavy, with an arrowhead, as a link the selection lights is. */
  strong?: boolean
}

/**
 * How far past the line's own width the quad it is drawn in reaches, as a
 * multiple of that width, which is the room its glow has.
 */
const REACH = 4

/** Transparent, for an arrowhead that is not drawn. */
const NONE = 'rgba(0, 0, 0, 0)'

// language=GLSL
const VERTEX = /* glsl */ `
attribute vec4 a_id;
attribute vec4 a_color;
attribute vec2 a_normal;
attribute float a_normalCoef;
attribute vec2 a_positionStart;
attribute vec2 a_positionEnd;
attribute float a_positionCoef;
attribute float a_glow;

uniform mat3 u_matrix;
uniform float u_sizeRatio;
uniform float u_zoomRatio;
uniform float u_pixelRatio;
uniform float u_correctionRatio;
uniform float u_minEdgeThickness;
uniform float u_feather;

varying vec4 v_color;
varying vec2 v_normal;
varying float v_thickness;
varying float v_feather;
varying float v_along;
varying float v_glow;
varying float v_spread;

const float bias = 255.0 / 254.0;

void main() {
  float minThickness = u_minEdgeThickness;

  vec2 normal = a_normal * a_normalCoef;
  vec2 position = a_positionStart * (1.0 - a_positionCoef) + a_positionEnd * a_positionCoef;

  float normalLength = length(normal);
  vec2 unitNormal = normal / normalLength;

  /* At least the minimum thickness on screen, in the WebGL referential, as
     Sigma's own rectangle does it. */
  float pixelsThickness = max(normalLength, minThickness * u_sizeRatio);
  float webGLThickness = pixelsThickness * u_correctionRatio / u_sizeRatio;

  /* The quad reaches past the line by the room its glow needs, and only
     where it glows: a resting link's quad is the line's own width. */
  float spread = 1.0 + a_glow * ${REACH.toFixed(1)};
  gl_Position = vec4((u_matrix * vec3(position + unitNormal * webGLThickness * spread, 1)).xy, 0, 1);

  v_thickness = webGLThickness / u_zoomRatio;
  v_normal = unitNormal;
  v_feather = u_feather * u_correctionRatio / u_zoomRatio / u_pixelRatio * 2.0;
  v_along = a_positionCoef;
  v_glow = a_glow;
  v_spread = spread;

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
precision mediump float;

varying vec4 v_color;
varying vec2 v_normal;
varying float v_thickness;
varying float v_feather;
varying float v_along;
varying float v_glow;
varying float v_spread;

void main(void) {
  #ifdef PICKING_MODE
  gl_FragColor = v_color;
  #else
  /* Across the quad, from the line's middle out: the normal interpolates
     through zero at the middle, so its length is the distance in half-widths
     of the quad, and the quad is the line widened by its spread. */
  float dist = length(v_normal) * v_spread * v_thickness;
  float line = 1.0 - smoothstep(v_thickness - v_feather, v_thickness, dist);

  /* The glow, outside the line: a soft light falling away from its edge, in
     the link's own color, as a note's halo falls away from its rim. */
  float past = max(dist - v_thickness, 0.0) / max(v_thickness * ${REACH.toFixed(1)}, 0.0001);
  float halo = v_glow * (1.0 - line) * exp(-past * 3.2) * (1.0 - smoothstep(0.7, 1.0, past)) * 0.55;

  /* Faint where the link leaves and full where it arrives, so the direction
     reads along every link, and the one lit by the selection as a path. */
  float along = mix(0.4, 1.0, smoothstep(0.0, 1.0, v_along));

  float alpha = (line + halo) * along * v_color.a;
  /* Premultiplied, as Sigma blends. */
  gl_FragColor = vec4(v_color.rgb * alpha, alpha);
  #endif
}
`

const { FLOAT, UNSIGNED_BYTE } = WebGLRenderingContext

const UNIFORMS = [
  'u_matrix',
  'u_zoomRatio',
  'u_sizeRatio',
  'u_correctionRatio',
  'u_pixelRatio',
  'u_feather',
  'u_minEdgeThickness',
] as const

/**
 * Draws a link as a line that reads in its direction, faint where it leaves
 * a note and full where it arrives, with a glow where the selection lights
 * it: one quad a link, as Sigma's own rectangle is, widened where it glows.
 */
export class HelixEdgeLineProgram extends EdgeProgram<(typeof UNIFORMS)[number]> {
  getDefinition() {
    return {
      ATTRIBUTES: [
        { name: 'a_positionStart', size: 2, type: FLOAT },
        { name: 'a_positionEnd', size: 2, type: FLOAT },
        { name: 'a_normal', size: 2, type: FLOAT },
        { name: 'a_color', normalized: true, size: 4, type: UNSIGNED_BYTE },
        { name: 'a_id', normalized: true, size: 4, type: UNSIGNED_BYTE },
        { name: 'a_glow', size: 1, type: FLOAT },
      ],
      CONSTANT_ATTRIBUTES: [
        { name: 'a_positionCoef', size: 1, type: FLOAT },
        { name: 'a_normalCoef', size: 1, type: FLOAT },
      ],
      CONSTANT_DATA: [
        [0, 1],
        [0, -1],
        [1, 1],
        [1, 1],
        [0, -1],
        [1, -1],
      ],
      FRAGMENT_SHADER_SOURCE: FRAGMENT,
      METHOD: WebGLRenderingContext.TRIANGLES,
      UNIFORMS,
      VERTEX_SHADER_SOURCE: VERTEX,
      VERTICES: 6,
    }
  }

  processVisibleItem(
    edgeIndex: number,
    startIndex: number,
    sourceData: NodeDisplayData,
    targetData: NodeDisplayData,
    data: EdgeDisplayData & HelixEdgeData,
  ) {
    const thickness = data.size || 1
    const dx = targetData.x - sourceData.x
    const dy = targetData.y - sourceData.y
    let len = dx * dx + dy * dy
    let n1 = 0
    let n2 = 0
    if (len) {
      len = 1 / Math.sqrt(len)
      n1 = -dy * len * thickness
      n2 = dx * len * thickness
    }
    const array = this.array
    let at = startIndex
    array[at++] = sourceData.x
    array[at++] = sourceData.y
    array[at++] = targetData.x
    array[at++] = targetData.y
    array[at++] = n1
    array[at++] = n2
    array[at++] = floatColor(data.color)
    array[at++] = edgeIndex
    array[at] = data.glow ?? 0
  }

  setUniforms(
    params: RenderParams,
    {
      gl,
      uniformLocations,
    }: { gl: WebGLRenderingContext; uniformLocations: Record<string, WebGLUniformLocation> },
  ) {
    gl.uniformMatrix3fv(uniformLocations.u_matrix as WebGLUniformLocation, false, params.matrix)
    gl.uniform1f(uniformLocations.u_zoomRatio as WebGLUniformLocation, params.zoomRatio)
    gl.uniform1f(uniformLocations.u_sizeRatio as WebGLUniformLocation, params.sizeRatio)
    gl.uniform1f(uniformLocations.u_correctionRatio as WebGLUniformLocation, params.correctionRatio)
    gl.uniform1f(uniformLocations.u_pixelRatio as WebGLUniformLocation, params.pixelRatio)
    gl.uniform1f(uniformLocations.u_feather as WebGLUniformLocation, params.antiAliasingFeather)
    gl.uniform1f(
      uniformLocations.u_minEdgeThickness as WebGLUniformLocation,
      params.minEdgeThickness,
    )
  }
}

// language=GLSL
const HEAD_VERTEX = /* glsl */ `
attribute vec2 a_position;
attribute vec2 a_normal;
attribute float a_radius;
attribute vec3 a_barycentric;
attribute vec4 a_id;
attribute vec4 a_color;

uniform mat3 u_matrix;
uniform float u_sizeRatio;
uniform float u_correctionRatio;
uniform float u_minEdgeThickness;
uniform float u_lengthToThicknessRatio;
uniform float u_widenessToThicknessRatio;

varying vec4 v_color;

const float bias = 255.0 / 254.0;

void main() {
  float minThickness = u_minEdgeThickness;

  float normalLength = length(a_normal);
  vec2 unitNormal = a_normal / normalLength;

  /* As Sigma's own arrowhead: the thickness on screen, the note's radius,
     and the head's length and width from the thickness. */
  float pixelsThickness = max(normalLength / u_sizeRatio, minThickness);
  float webGLThickness = pixelsThickness * u_correctionRatio;
  float webGLNodeRadius = a_radius * 2.0 * u_correctionRatio / u_sizeRatio;
  float webGLArrowHeadLength = webGLThickness * u_lengthToThicknessRatio * 2.0;
  float webGLArrowHeadThickness = webGLThickness * u_widenessToThicknessRatio;

  float da = a_barycentric.x;
  float db = a_barycentric.y;
  float dc = a_barycentric.z;

  vec2 delta = vec2(
      da * (webGLNodeRadius * unitNormal.y)
    + db * ((webGLNodeRadius + webGLArrowHeadLength) * unitNormal.y + webGLArrowHeadThickness * unitNormal.x)
    + dc * ((webGLNodeRadius + webGLArrowHeadLength) * unitNormal.y - webGLArrowHeadThickness * unitNormal.x),

      da * (-webGLNodeRadius * unitNormal.x)
    + db * (-(webGLNodeRadius + webGLArrowHeadLength) * unitNormal.x + webGLArrowHeadThickness * unitNormal.y)
    + dc * (-(webGLNodeRadius + webGLArrowHeadLength) * unitNormal.x - webGLArrowHeadThickness * unitNormal.y)
  );

  gl_Position = vec4((u_matrix * vec3(a_position + delta, 1)).xy, 0, 1);

  #ifdef PICKING_MODE
  v_color = a_id;
  #else
  v_color = a_color;
  #endif

  v_color.a *= bias;
}
`

// language=GLSL
const HEAD_FRAGMENT = /* glsl */ `
precision mediump float;

varying vec4 v_color;

void main(void) {
  #ifdef PICKING_MODE
  gl_FragColor = v_color;
  #else
  /* Premultiplied, as Sigma blends. */
  gl_FragColor = vec4(v_color.rgb * v_color.a, v_color.a);
  #endif
}
`

const HEAD_UNIFORMS = [
  'u_matrix',
  'u_sizeRatio',
  'u_correctionRatio',
  'u_minEdgeThickness',
  'u_lengthToThicknessRatio',
  'u_widenessToThicknessRatio',
] as const

/** The head's length and width, as multiples of the line's thickness: Sigma's own proportions. */
const HEAD = { length: 2.5, wideness: 2 }

/**
 * An arrowhead on a strong link only, at the note it arrives at: Sigma's own
 * head, one triangle a link, drawn transparent where the link is not strong.
 * Every link already reads in its direction by its gradient, and a head on
 * each of a graph's thousands of links is a field of chevrons.
 */
export class HelixArrowHeadProgram extends EdgeProgram<(typeof HEAD_UNIFORMS)[number]> {
  getDefinition() {
    return {
      ATTRIBUTES: [
        { name: 'a_position', size: 2, type: FLOAT },
        { name: 'a_normal', size: 2, type: FLOAT },
        { name: 'a_radius', size: 1, type: FLOAT },
        { name: 'a_color', normalized: true, size: 4, type: UNSIGNED_BYTE },
        { name: 'a_id', normalized: true, size: 4, type: UNSIGNED_BYTE },
      ],
      CONSTANT_ATTRIBUTES: [{ name: 'a_barycentric', size: 3, type: FLOAT }],
      CONSTANT_DATA: [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ],
      FRAGMENT_SHADER_SOURCE: HEAD_FRAGMENT,
      METHOD: WebGLRenderingContext.TRIANGLES,
      UNIFORMS: HEAD_UNIFORMS,
      VERTEX_SHADER_SOURCE: HEAD_VERTEX,
      VERTICES: 3,
    }
  }

  processVisibleItem(
    edgeIndex: number,
    startIndex: number,
    sourceData: NodeDisplayData,
    targetData: NodeDisplayData,
    data: EdgeDisplayData & HelixEdgeData,
  ) {
    const thickness = data.size || 1
    const dx = targetData.x - sourceData.x
    const dy = targetData.y - sourceData.y
    let len = dx * dx + dy * dy
    let n1 = 0
    let n2 = 0
    if (len) {
      len = 1 / Math.sqrt(len)
      n1 = -dy * len * thickness
      n2 = dx * len * thickness
    }
    const array = this.array
    let at = startIndex
    array[at++] = targetData.x
    array[at++] = targetData.y
    array[at++] = -n1
    array[at++] = -n2
    array[at++] = targetData.size || 1
    array[at++] = floatColor(data.strong ? data.color : NONE)
    array[at] = edgeIndex
  }

  setUniforms(
    params: RenderParams,
    {
      gl,
      uniformLocations,
    }: { gl: WebGLRenderingContext; uniformLocations: Record<string, WebGLUniformLocation> },
  ) {
    gl.uniformMatrix3fv(uniformLocations.u_matrix as WebGLUniformLocation, false, params.matrix)
    gl.uniform1f(uniformLocations.u_sizeRatio as WebGLUniformLocation, params.sizeRatio)
    gl.uniform1f(uniformLocations.u_correctionRatio as WebGLUniformLocation, params.correctionRatio)
    gl.uniform1f(
      uniformLocations.u_minEdgeThickness as WebGLUniformLocation,
      params.minEdgeThickness,
    )
    gl.uniform1f(uniformLocations.u_lengthToThicknessRatio as WebGLUniformLocation, HEAD.length)
    gl.uniform1f(uniformLocations.u_widenessToThicknessRatio as WebGLUniformLocation, HEAD.wideness)
  }
}

/** The line and its head, as one program a link is drawn with. */
export const HelixEdgeProgram: EdgeProgramType = createEdgeCompoundProgram([
  HelixEdgeLineProgram,
  HelixArrowHeadProgram,
])
