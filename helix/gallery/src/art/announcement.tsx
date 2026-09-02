import type { CSSProperties, ReactNode } from 'react'

/**
 * The band, its message and the way out of it.
 *
 * No masthead and no page under it. An announcement does sit *above* chrome,
 * and drawing that makes the card mostly a picture of App Header: the band
 * takes a fifth of the frame and the relationship belongs in the prose.
 *
 * It unfurls from its own top edge rather than fading, which is the one thing
 * an announcement does that a static notice does not.
 */
export const announcementArt: ReactNode = (
  <>
    <g className="artMotion artOpen" style={{ transformOrigin: 'center top' } as CSSProperties}>
      {/* No edge. The band is `surface-sunken`, which in light mode is oklch
          0.96 against a 1.0 page: a four percent step, the same one Callout's
          panel carries with nothing tracing it. App Header keeps its outline
          because its bar is `surface` at 0.985, a step of one and a half
          percent, which is not a silhouette at all. Same question, opposite
          answers, and the fill is what decides it. */}
      <rect className="artSunken" height="40" rx="4" width="232" x="44" y="80" />
      <rect className="artInk" fillOpacity="0.55" height="8" rx="4" width="96" x="60" y="96" />
      <path
        className="artInk"
        d="M248 96l1.5-1.5 9 9-1.5 1.5zM257 94.5l1.5 1.5-9 9-1.5-1.5z"
        fillOpacity="0.28"
      />
    </g>
  </>
)
