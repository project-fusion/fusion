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
 * **Three lobes and a wash, which is what a still of the hero looks like.** The
 * lobes are large, soft and off-centre, because an evenly lit rectangle reads as
 * a swatch: light has to come from somewhere. Their positions are what differ
 * per topic, so the five are recognisably the same instrument at different
 * settings rather than five pictures.
 *
 * The seed colour is the series ramp, which follows a themed brand, and the
 * ground underneath is `surface-sunken`, so a card that has not painted yet
 * shows the recess it will fill rather than a white hole.
 */
const FIELD: Record<Topic, { lobes: [number, number, number][]; series: number }> = {
  /* Rising to the right: strands gathering. */
  Company: {
    lobes: [
      [18, 78, 62],
      [58, 34, 54],
      [88, 62, 46],
    ],
    series: 1,
  },
  /* Evenly spaced and level, which is what a system is. */
  'Design systems': {
    lobes: [
      [16, 44, 52],
      [50, 58, 56],
      [84, 42, 52],
    ],
    series: 3,
  },
  /* Two anchors and a span between them, under tension. */
  Engineering: {
    lobes: [
      [12, 30, 58],
      [50, 76, 44],
      [90, 28, 58],
    ],
    series: 5,
  },
  /* One source, and the field falling away from it. */
  Intelligence: {
    lobes: [
      [24, 24, 70],
      [62, 60, 44],
      [92, 84, 36],
    ],
    series: 7,
  },
  /* Two whole fields, meeting but not merged. */
  Sovereignty: {
    lobes: [
      [22, 50, 60],
      [78, 50, 60],
      [50, 96, 40],
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
  const lobes = field.lobes
    .map(
      ([x, y, size], at) =>
        `radial-gradient(${size}% ${size}% at ${x}% ${y}%, ` +
        `color-mix(in oklab, ${seed} ${[46, 34, 24][at]}%, transparent) 0%, ` +
        `transparent 70%)`,
    )
    .join(', ')

  return (
    <div aria-hidden="true" className="insightArt" slot={slot} style={{ backgroundImage: lobes }} />
  )
}
