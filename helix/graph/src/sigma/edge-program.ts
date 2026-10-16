import type { EdgePrimitives } from 'sigma/primitives'
import { type EdgeLayer, extremityArrow, pathLine } from 'sigma/rendering'

/** What the edge layer reads off a link, beyond what Sigma gives every link. */
export interface HelixEdgeData {
  /** How strongly the link glows, from 0 to 1: a link on the selected note's path. */
  glow?: number
  /** Whether the link is drawn heavy, with an arrowhead, as a link the selection lights is. */
  strong?: boolean
}

/**
 * How far past the line's own width a glowing link is drawn, as a multiple of
 * that width, which is the room its glow has. **Sigma draws nothing outside a
 * link's width**, so a glowing link is given the width of its glow and the
 * layer draws the line in its middle.
 */
export const REACH = 4

/** How many times its line's width a link that glows fully is drawn: the line and its glow either side. */
export const SPREAD = 1 + REACH

/**
 * The head's length and width, as multiples of the line's width: two and a
 * half and two, the head Sigma 3 drew. A link with a head is strong, and a
 * strong link glows, so the width the head is measured from is `SPREAD`
 * lines wide.
 */
const HEAD = { length: 2.5 / SPREAD, width: 2 / SPREAD }

const { FLOAT } = WebGL2RenderingContext

/**
 * A link as a line that reads in its direction, faint where it leaves a note
 * and full where it arrives, with a glow where the selection lights it, and
 * its head solid.
 */
const look: EdgeLayer = {
  attributes: [{ name: 'helixGlow', size: 1, source: 'glow', type: FLOAT }],
  glsl: /* glsl */ `
vec4 layer_helix(EdgeContext ctx) {
  /* Across the link, from its middle out, in the width it is drawn at: the
     line's own width and, where it glows, the glow either side. */
  float spread = 1.0 + v_helixGlow * ${REACH.toFixed(1)};
  float halfWidth = ctx.thickness * 0.5 / spread;
  float dist = ctx.sdf + ctx.thickness * 0.5;
  float line = v_helixGlow > 0.0 ? 1.0 - smoothstep(halfWidth - ctx.aaWidth, halfWidth, dist) : 1.0;

  /* The glow, outside the line: a soft light falling away from its edge, in
     the link's own color, as a note's halo falls away from its rim. */
  float past = max(dist - halfWidth, 0.0) / max(halfWidth * ${REACH.toFixed(1)}, 0.0001);
  float halo = v_helixGlow * (1.0 - line) * exp(-past * 3.2) * (1.0 - smoothstep(0.7, 1.0, past)) * 0.55;

  /* Faint where the link leaves and full where it arrives, so the direction
     reads along every link, and the one lit by the selection as a path. */
  float along = mix(0.4, 1.0, smoothstep(0.0, 1.0, ctx.t));

  float alpha = (line + halo) * along;

  /* The head, solid, narrowing from its base to its tip. Sigma's own cut
     there is the line's whole width near the base, glow and all. */
  if (v_zone > 1.5) {
    float headHalf = ctx.thickness * v_headWidthRatio * 0.5 * (1.0 - v_zoneT);
    alpha = max(alpha, 1.0 - smoothstep(headHalf - ctx.aaWidth, headHalf, dist));
  }

  return vec4(v_color.rgb, alpha * v_color.a);
}
`,
  name: 'helix',
  uniforms: [],
}

/**
 * The links' primitives: a straight line drawn by Helix's layer, and a head
 * on the strong ones only, at the note a link arrives at. Every link already
 * reads in its direction by its gradient, and a head on each of a graph's
 * thousands of links is a field of chevrons.
 */
export const edgePrimitives = (): EdgePrimitives => ({
  defaultHead: 'none',
  extremities: [extremityArrow({ lengthRatio: HEAD.length, widthRatio: HEAD.width })],
  layers: [look],
  paths: [pathLine()],
})
