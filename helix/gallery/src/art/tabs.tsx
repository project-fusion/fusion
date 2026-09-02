import type { CSSProperties, ReactNode } from 'react'

/**
 * A raised pill on the selected tab and nothing at all behind the row.
 *
 * The pill is `surface-raised` under a shadow, which is what the component
 * sets: it is lifted, not filled. Drawing it as the heaviest mark inverts the
 * whole idea.
 */
export const tabsArt: ReactNode = (
  <>
    <g className="artMotion artTravel" style={{ '--art-to': '76px' } as CSSProperties}>
      <g filter="url(#helixArtShadow)">
        <rect className="artRaised" height="40" rx="4" width="76" x="56" y="80" />
      </g>
    </g>
    <rect className="artInk" fillOpacity="0.55" height="8" rx="4" width="36" x="76" y="96" />
    <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="36" x="152" y="96" />
    <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="36" x="228" y="96" />
  </>
)
