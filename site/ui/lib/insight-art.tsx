import type { Topic } from './insights'

/**
 * A still field for each topic, painted rather than run.
 *
 * **An image, not a shader.** `Aura` was here and drew the right thing at the
 * wrong cost: six live WebGL contexts on `/insights` and seven on the landing
 * page, against a browser ceiling in the mid teens, so the gallery could not
 * grow and every card carried a running program to be atmosphere behind a
 * title. This is the same light, resolved once, as gradients the compositor
 * already knows how to paint.
 *
 * **Per topic, and it is the same argument as before.** A field for every post
 * is a field somebody makes before publishing, so the fifth post is illustrated
 * and the fiftieth is not. Five cover every post there will be.
 *
 * **Two to four lobes, of three kinds, because the pieces differ.** The first
 * version gave every topic three round lobes in different places, which made
 * five pictures of one idea: the difference between Engineering and Intelligence
 * was where the light sat, and nobody reads that as a difference. Count, kind
 * and weight all vary now. What they share is that the light is large, soft and
 * off-centre, because an evenly lit rectangle reads as a swatch.
 *
 * The seed colour is the series ramp, which follows a themed brand, and the
 * ground underneath is `surface-sunken`, so a card that has not painted yet
 * shows the recess it will fill rather than a white hole.
 */
/**
 * A layer of light: where it sits, how big, how strong, and what kind.
 *
 * `kind` is the shape of the falloff and is what stops the five being one dial
 * at five settings. A `pool` is round and even, a `beam` is stretched along one
 * axis, and a `sweep` is angular rather than radial, which is a different
 * instrument rather than the same one moved.
 */
type Lobe = {
  alpha: number
  kind: 'beam' | 'pool' | 'sweep'
  size: number
  x: number
  y: number
}

/**
 * A field per topic, and deliberately not five of the same thing.
 *
 * The first version gave every topic three round lobes in different places,
 * which made five pictures of one idea: the difference between Engineering and
 * Intelligence was where the light sat, and nobody reads that as a difference.
 * These vary in count, in kind and in weight, because the pieces are not
 * variations on each other either.
 */
const FIELD: Record<Topic, { lobes: Lobe[]; series: number }> = {
  /* Two pools converging: the company as things brought together. Few and
     large, because it is the least technical of the five. */
  Company: {
    lobes: [
      { alpha: 44, kind: 'pool', size: 74, x: 22, y: 76 },
      { alpha: 30, kind: 'pool', size: 66, x: 74, y: 30 },
    ],
    series: 1,
  },
  /* Four even beams: a ramp, regular by construction, which is what a system
     is. The only field where the lobes are the same size as each other. */
  'Design systems': {
    lobes: [
      { alpha: 34, kind: 'beam', size: 40, x: 12, y: 50 },
      { alpha: 34, kind: 'beam', size: 40, x: 38, y: 50 },
      { alpha: 34, kind: 'beam', size: 40, x: 64, y: 50 },
      { alpha: 34, kind: 'beam', size: 40, x: 90, y: 50 },
    ],
    series: 3,
  },
  /* Two anchors and a span carried between them: load held by the
     arrangement. The span is weakest, because it is the part being carried. */
  Engineering: {
    lobes: [
      { alpha: 46, kind: 'pool', size: 44, x: 10, y: 26 },
      { alpha: 22, kind: 'beam', size: 88, x: 50, y: 62 },
      { alpha: 46, kind: 'pool', size: 44, x: 90, y: 26 },
    ],
    series: 5,
  },
  /* One bright source and a sweep falling away from it: a signal read at a
     distance, brightest where it starts. */
  Intelligence: {
    lobes: [
      { alpha: 58, kind: 'pool', size: 30, x: 18, y: 22 },
      { alpha: 26, kind: 'sweep', size: 96, x: 34, y: 40 },
      { alpha: 16, kind: 'pool', size: 60, x: 84, y: 78 },
    ],
    series: 7,
  },
  /* Two whole fields, equal and not merged, with nothing in the middle: the
     shape of a thing that comes apart without losing either half. */
  Sovereignty: {
    lobes: [
      { alpha: 40, kind: 'pool', size: 52, x: 20, y: 44 },
      { alpha: 40, kind: 'pool', size: 52, x: 80, y: 56 },
    ],
    series: 8,
  },
}

/**
 * The field across the top of an insight card.
 *
 * `slot` is a declared prop rather than a spread, because React types an
 * intrinsic element's props from the element rather than from the component
 * around it: without it the attribute is refused at the call site and the field
 * renders inside the card's inset like content.
 */
export function InsightArt({ slot, topic }: { slot?: string; topic: Topic }) {
  const field = FIELD[topic]
  const seed = `var(--helix-color-series-${field.series})`
  const paint = ({ alpha, kind, size, x, y }: Lobe) => {
    const ink = `color-mix(in oklab, ${seed} ${alpha}%, transparent)`
    if (kind === 'sweep') {
      /* Angular rather than radial, so the falloff runs around the point
         instead of away from it: the same colour reading as a different
         instrument. */
      return `conic-gradient(from 210deg at ${x}% ${y}%, ${ink} 0turn, transparent 0.42turn)`
    }
    /* A beam is the pool stretched: taller than wide, so a row of them reads as
       columns of light rather than as a line of dots. */
    const [w, h] = kind === 'beam' ? [size * 0.5, size * 1.6] : [size, size]
    return `radial-gradient(${w}% ${h}% at ${x}% ${y}%, ${ink} 0%, transparent 70%)`
  }
  const lobes = field.lobes.map(paint).join(', ')

  return (
    <div aria-hidden="true" className="insightArt" slot={slot} style={{ backgroundImage: lobes }} />
  )
}
