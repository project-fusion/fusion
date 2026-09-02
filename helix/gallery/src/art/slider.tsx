import type { ReactNode } from 'react'

export const sliderArt: ReactNode = (
  <>
    <rect className="artInk" fillOpacity="0.28" height="7" rx="3.5" width="52" x="48" y="56" />
    <rect className="artRule" height="4" rx="2" width="200" x="48" y="98" />
    <rect className="artSolid artMotion artFill" height="4" rx="2" width="104" x="48" y="98" />
    <g className="artMotion artTravel">
      <circle className="artInk" cx="152" cy="100" fillOpacity="0.12" r="14" />
      <g filter="url(#helixArtShadow)">
        <circle className="artOverlay" cx="152" cy="100" r="10" />
      </g>
    </g>
  </>
)
