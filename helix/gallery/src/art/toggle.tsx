import type { CSSProperties, ReactNode } from 'react'

/**
 * A sunken track at `radii-lg` with an indicator at `radii-sm` raised out of
 * it, which is the one control in the set carrying two different radii.
 */
export const toggleArt: ReactNode = (
  <>
    <rect className="artSunken" height="40" rx="12" width="192" x="64" y="80" />
    <rect className="artEdge" height="39" rx="11.5" width="191" x="64.5" y="80.5" />
    <g className="artMotion artTravel" style={{ '--art-to': '64px' } as CSSProperties}>
      <g filter="url(#helixArtShadow)">
        <rect className="artOverlay" height="32" rx="4" width="60" x="68" y="84" />
      </g>
    </g>
    <rect className="artInk" fillOpacity="0.55" height="8" rx="4" width="28" x="84" y="96" />
    <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="28" x="146" y="96" />
    <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="28" x="210" y="96" />
  </>
)
