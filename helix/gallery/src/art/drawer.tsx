import type { CSSProperties, ReactNode } from 'react'

export const drawerArt: ReactNode = (
  <>
    <defs>
      <clipPath id="helixArtDrawerClip">
        <rect height="144" rx="4" width="232" x="44" y="28" />
      </clipPath>
    </defs>
    <rect className="artPage" height="144" rx="4" width="232" x="44" y="28" />
    <path className="artSurface" d="M44 32a4 4 0 0 1 4-4h224a4 4 0 0 1 4 4v28H44z" />
    <rect className="artSunken" height="34" rx="4" width="100" x="56" y="72" />
    <rect className="artInk" fillOpacity="0.28" height="6" rx="3" width="164" x="56" y="122" />
    <rect className="artInk" fillOpacity="0.28" height="6" rx="3" width="128" x="56" y="140" />
    <rect className="artScrim" height="144" rx="4" width="232" x="44" y="28" />
    <g clipPath="url(#helixArtDrawerClip)">
      {/* Flush to the page edge, and traveling exactly the distance that
          clears it.
       *
       * A panel stopping short of the page leaves a sliver of page down its
       * outer side, and a drawer not touching the edge it came in from is a
       * tall card. Travel is 100, just past the 96 that clears the clip:
       * further out and part of the run happens off-screen, so the panel
       * enters the frame already at speed and decelerates into place, which
       * reads as overshoot. The easing cannot overshoot. It is
       * `cubic-bezier(0.22, 1, 0.36, 1)`, whose control points are both at
       * y=1, so the curve is monotonic and cannot exceed its end value.
       *
       * The right corners are square here and rounded by the clip, which is
       * the page's own radius, so the panel takes the page's corner rather
       * than carrying a second one just inside it. */}
      <g className="artMotion artEdgeIn" style={{ '--art-from': '100px' } as CSSProperties}>
        <g filter="url(#helixArtShadow)">
          <path className="artOverlay" d="M180 28h96v144h-96z" />
        </g>
        <rect className="artInk" fillOpacity="0.55" height="8" rx="4" width="56" x="196" y="52" />
        <rect className="artInk" fillOpacity="0.28" height="6" rx="3" width="64" x="196" y="72" />
        <rect className="artInk" fillOpacity="0.28" height="6" rx="3" width="44" x="196" y="88" />
        <rect className="artSolid" height="20" rx="4" width="40" x="196" y="140" />
      </g>
    </g>
  </>
)
