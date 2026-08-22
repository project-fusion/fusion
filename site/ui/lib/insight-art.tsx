import type { ReactElement } from 'react'
import type { Topic } from './insights'

/**
 * A composition for each topic, in the same vocabulary the gallery draws
 * components in.
 *
 * **Per topic and not per insight, which is the decision worth stating.** A
 * drawing for every post is a drawing somebody has to make before publishing,
 * so the fifth post is illustrated and the fiftieth is not: art that scales with
 * the writing is art nobody draws. Five compositions cover every post there will
 * ever be, and a reader meeting two Engineering pieces sees a family rather than
 * a repeat, which is what a topic is.
 *
 * **The gallery's grammar, deliberately.** Surfaces, a recess, ink at two
 * weights and one solid mark, laid out on a 320 by 200 field: the same pieces
 * `ComponentArt` builds from, so a card on `/insights` and a card on `/helix`
 * read as one publication rather than two design exercises. What differs is the
 * subject, since a component drawing shows a control and this shows an idea.
 *
 * **The solid mark takes the series colour** and everything else is neutral.
 * One accent per composition is what keeps five drawings a set: colour used to
 * point rather than to decorate, and the ramp follows a themed seed so a
 * reskinned page takes these with it.
 */
const ART: Record<Topic, { series: number; body: ReactElement }> = {
  /* Panels stacking upward, the last one solid: a thing being built up. */
  Company: {
    body: (
      <>
        <rect className="artSurface" height="52" rx="4" width="72" x="36" y="120" />
        <rect className="artSurface" height="84" rx="4" width="72" x="124" y="88" />
        <rect className="artSolid" height="116" rx="4" width="72" x="212" y="56" />
        <path className="artRule" d="M20 180h280" />
      </>
    ),
    series: 1,
  },
  /* One shape at four sizes on a shared baseline, which is what a ramp is. */
  'Design systems': {
    body: (
      <>
        <rect className="artSurface" height="24" rx="3" width="24" x="40" y="132" />
        <rect className="artSurface" height="40" rx="3" width="40" x="88" y="116" />
        <rect className="artSurface" height="60" rx="4" width="60" x="152" y="96" />
        <rect className="artSolid" height="84" rx="5" width="84" x="228" y="72" />
        <path className="artRule" d="M20 168h280" />
      </>
    ),
    series: 3,
  },
  /* Members meeting at joints: load carried by the arrangement, not the parts. */
  Engineering: {
    body: (
      <>
        <path className="artRule" d="M32 152h256" />
        <path className="artInk" d="M32 152 96 56l64 96 64-96 64 96" />
        <path className="artInk" d="M96 56h128" />
        <circle className="artSolid" cx="160" cy="152" r="9" />
        <circle className="artNode" cx="96" cy="56" r="7" />
        <circle className="artNode" cx="224" cy="56" r="7" />
      </>
    ),
    series: 5,
  },
  /* A signal leaving one point and something further out reading it. */
  Intelligence: {
    body: (
      <>
        <path className="artInk" d="M64 168a48 48 0 0 1 48-48" />
        <path className="artInk" d="M64 168a88 88 0 0 1 88-88" />
        <path className="artInk" d="M64 168a128 128 0 0 1 128-128" />
        <circle className="artSolid" cx="64" cy="168" r="11" />
        <rect className="artSurface" height="56" rx="4" width="76" x="212" y="60" />
        <rect className="artSunken" height="12" rx="2" width="44" x="228" y="78" />
      </>
    ),
    series: 7,
  },
  /* Two panels and a clean break: the shape of a thing that comes apart whole. */
  Sovereignty: {
    body: (
      <>
        <rect className="artSurface" height="104" rx="4" width="108" x="32" y="56" />
        <rect className="artSunken" height="12" rx="2" width="68" x="48" y="76" />
        <rect className="artSunken" height="12" rx="2" width="48" x="48" y="100" />
        <rect className="artSolid" height="104" rx="4" width="108" x="180" y="56" />
        <path className="artRule" d="M160 40v136" />
      </>
    ),
    series: 8,
  },
}

/**
 * The band across the top of an insight card.
 *
 * `slot` is a declared prop rather than a spread, because React types an
 * intrinsic element's props from the element rather than from the component
 * around it: without it the attribute is refused at the call site and the mark
 * renders inside the card's inset like content.
 */
export function InsightArt({ slot, topic }: { slot?: string; topic: Topic }) {
  const art = ART[topic]
  return (
    <svg
      aria-hidden="true"
      className="insightArt"
      slot={slot}
      style={{ ['--_insight-series' as string]: `var(--helix-color-series-${art.series})` }}
      viewBox="0 0 320 200"
    >
      {art.body}
    </svg>
  )
}
