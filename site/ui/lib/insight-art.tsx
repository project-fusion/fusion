import type { Topic } from './insights'

/**
 * A mark for each topic, drawn rather than photographed.
 *
 * **One family, five members.** Every mark is built from the same primitives on
 * the same 120 by 48 field: strokes on a coarse grid, no fills, no glyphs. A set
 * assembled from unrelated pictures reads as five decisions; a set built from
 * one vocabulary reads as a series, which is what a topic is.
 *
 * **The series ramp rather than the brand.** `--helix-color-series-*` are the
 * palette's own way of saying "these are things being compared", which is
 * exactly what topics are, and they follow a themed seed: a page reskinned to
 * another brand takes these with it. `currentColor` would have tied every mark
 * to the card's text and made the set one colour.
 *
 * **`aria-hidden`, because the topic is already a tag on the card.** A mark that
 * announced itself would say the word a screen reader has just read, and there
 * is no information here that the tag does not carry.
 */
const MARKS: Record<Topic, { series: number; paths: string[] }> = {
  /* A rising set of steps: the company as the thing being built up. */
  Company: {
    paths: ['M8 40h16V28', 'M32 40h16V20', 'M56 40h16V12', 'M80 40h32'],
    series: 1,
  },
  /* A scale: the same shape at four sizes, which is what a token ramp is. */
  'Design systems': {
    paths: ['M12 24h8', 'M32 18h14', 'M58 12h22', 'M92 6h20', 'M12 36h100'],
    series: 3,
  },
  /* A truss: members meeting at a joint, load carried by the arrangement. */
  Engineering: {
    paths: ['M8 40h104', 'M8 40 32 12l24 28 24-28 24 28', 'M32 12h48'],
    series: 5,
  },
  /* Concentric arcs leaving a point: a signal, and what reads it. */
  Intelligence: {
    paths: [
      'M20 40a12 12 0 0 1 12-12',
      'M20 40a24 24 0 0 1 24-24',
      'M20 40a36 36 0 0 1 36-36',
      'M76 40h36',
    ],
    series: 7,
  },
  /* A closed boundary with one way through it, drawn as a gap rather than a
     gate: the shape of a thing you can leave. */
  Sovereignty: {
    paths: ['M12 8h44', 'M68 8h40v32H68', 'M56 40H12V8', 'M56 24h12'],
    series: 8,
  },
}

/**
 * The band across the top of an insight card.
 *
 * `slot` is a declared prop rather than a spread, because this renders an
 * `<svg>` and React types an intrinsic element's props from the element, not
 * from the component wrapping it: without it the attribute is refused at the
 * call site, and the mark would render inside the card's inset like content.
 *
 * Sized by the card rather than by itself: it goes in the `media` slot, which is
 * the one region that escapes the card's inset, and `--card-media-block-size`
 * is what gives a drawing a height, `auto` being an image's own shape and not a
 * thing a mark has.
 */
export function InsightArt({ slot, topic }: { slot?: string; topic: Topic }) {
  const mark = MARKS[topic]
  return (
    <svg
      aria-hidden="true"
      className="insightArt"
      preserveAspectRatio="xMidYMid meet"
      slot={slot}
      style={{ ['--_insight-series' as string]: `var(--helix-color-series-${mark.series})` }}
      viewBox="0 0 120 48"
    >
      {mark.paths.map((d) => (
        <path d={d} key={d} />
      ))}
    </svg>
  )
}
