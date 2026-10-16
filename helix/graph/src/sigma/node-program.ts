import type { NodePrimitives } from 'sigma/primitives'
import type { FragmentLayer, SDFShape } from 'sigma/rendering'

/** The shapes a note is drawn in, by the name each is registered under. A ring is a circle drawn outlined. */
export const SHAPES = {
  circle: 'helixCircle',
  diamond: 'helixDiamond',
  ring: 'helixCircle',
  square: 'helixSquare',
} as const

/** How heavily a note is drawn, numbered as the shader reads them. */
export const EMPHASES = { outlined: 1, solid: 0, subtle: 2 } as const

/** What a note is made of, numbered as the shader reads them. */
export const MATERIALS = { flat: 0, frosted: 2, glass: 1, mark: 3 } as const

/**
 * How much larger a diamond is drawn than its size says. **Sigma draws a note
 * in a square as wide as the note**, and a diamond's tips are its widest
 * points: one that reached past the square, as Helix's did at 1.22 radii, was
 * cut off there. So the diamond is drawn to the square's edge and the note
 * made larger by the reach it lost, and it covers what it covered before.
 */
export const DIAMOND = 0.86 / Math.SQRT1_2

/** What the node layer reads off a note, beyond what Sigma gives every note. */
export interface HelixNodeData {
  /** `EMPHASES`. */
  emphasisCode?: number
  /** `MATERIALS`. */
  materialCode?: number
}

/*
 * Each shape's signed distance, in radii, as the one program drew them before
 * Sigma 4: below zero inside. Sigma passes `size` a hair under 1, the room it
 * keeps for the edge's smoothing.
 */
const circle: SDFShape = {
  glsl: /* glsl */ `
float sdf_helixCircle(vec2 uv, float size) {
  return length(uv) - size;
}
`,
  name: 'helixCircle',
  uniforms: [],
}

const square: SDFShape = {
  glsl: /* glsl */ `
float sdf_helixSquare(vec2 uv, float size) {
  vec2 q = abs(uv) - vec2(0.7 * size);
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - 0.18 * size;
}
`,
  /* The middle of a side over the far point of a rounded corner. */
  inradiusFactor: 0.88 / (0.7 * Math.SQRT2 + 0.18),
  name: 'helixSquare',
  uniforms: [],
}

const diamond: SDFShape = {
  glsl: /* glsl */ `
float sdf_helixDiamond(vec2 uv, float size) {
  return (abs(uv.x) + abs(uv.y)) * 0.7071 - 0.7071 * size;
}
`,
  inradiusFactor: Math.SQRT1_2,
  name: 'helixDiamond',
  uniforms: [],
}

const { FLOAT, UNSIGNED_BYTE } = WebGL2RenderingContext

/**
 * A note's emphasis and its material, in its color, inside the shape Sigma has
 * already cut it to. The glow a selected note and a mark have is outside the
 * shape, which Sigma does not draw for a note's own pass, so it is the
 * backdrop's: see `sigma-options.ts`.
 */
const look: FragmentLayer = {
  attributes: [
    { name: 'helixColor', normalized: true, size: 4, source: 'color', type: UNSIGNED_BYTE },
    { name: 'helixEmphasis', size: 1, source: 'emphasisCode', type: FLOAT },
    { name: 'helixMaterial', size: 1, source: 'materialCode', type: FLOAT },
  ],
  glsl: /* glsl */ `
vec4 layer_helix(vec4 v_helixColor, float v_helixEmphasis, float v_helixMaterial) {
  vec2 p = context.uv;
  float d = context.sdf;
  float aa = context.aaWidth;

  float edge = smoothstep(-0.32 - aa, -0.32, d);
  float fill = v_helixEmphasis > 1.5 ? mix(0.3, 1.0, edge) : v_helixEmphasis > 0.5 ? edge : 1.0;

  vec3 color = v_helixColor.rgb;
  float alpha = 1.0;
  /* How large the note is drawn, in pixels: a highlight that suits a hub is
     a speck of noise on a leaf, so the detail grows in with the size. */
  float drawn = smoothstep(4.0, 14.0, 1.0 / context.pixelToUV);
  /* Lit from above on the left, as every surface here is. */
  float lit = clamp(0.5 + 0.5 * dot(normalize(vec2(-0.45, 0.9)), p), 0.0, 1.0);
  /* A fine rim a shade darker, so notes that touch stay two. */
  float rim = smoothstep(-0.2 - aa, -0.2, d);
  if (v_helixMaterial > 0.5 && v_helixMaterial < 1.5) {
    /* Glass: shaded like a sphere, a highlight, and light at its rim. */
    color *= mix(0.72, 1.12, lit);
    float highlight = exp(-pow(length(p - vec2(-0.32, 0.38)) / 0.26, 2.0));
    color = mix(color, vec3(1.0), highlight * mix(0.25, 0.6, drawn));
    color = mix(color, vec3(1.0), rim * 0.22 * drawn);
    alpha = 0.94;
  } else if (v_helixMaterial > 2.5) {
    /* Mark: a flat dot of its color, as a marker on a table is. What says it
       is a mark is the band and the light its backdrop draws around it. */
    alpha = 1.0;
  } else if (v_helixMaterial > 1.5) {
    /* Frosted: a milky body, a soft fall of light, and no sharp highlight. */
    color = mix(color * mix(0.86, 1.06, lit), vec3(1.0), 0.16);
    color = mix(color, vec3(1.0), rim * 0.14);
    alpha = 0.86;
  } else {
    /* Flat, which unset is: matte, with a gentle fall of light across it so
       a note reads as round, brighter toward its middle the larger it is
       drawn, and a fine rim a shade darker so notes that touch stay two. */
    color *= mix(0.82, 1.1, lit);
    color = mix(color, min(color * 1.25, vec3(1.0)), (1.0 - smoothstep(0.0, 0.8, length(p - vec2(-0.25, 0.3)))) * 0.35 * drawn);
    color = mix(color, color * 0.72, rim * 0.6);
  }

  return vec4(color, fill * alpha * v_helixColor.a);
}
`,
  name: 'helix',
  uniforms: [],
}

/**
 * The notes' primitives: Helix's shapes and the layer that draws a note's
 * emphasis and material. Pressing reads the shape, so a press beside a note is
 * not a press on it.
 */
export const nodePrimitives = (): NodePrimitives => ({
  /* The glow's pass, whose look each note's display data says. */
  backdrop: {},
  layers: [look],
  shapes: [circle, square, diamond],
})
