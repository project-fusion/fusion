import type { CSSProperties, ReactNode } from 'react'

export const toastArt: ReactNode = (
  <>
    <rect className="artSunken" height="144" rx="4" width="232" x="44" y="28" />
    <defs>
      <clipPath id="helixArtToastClip">
        <rect height="144" rx="4" width="232" x="44" y="28" />
      </clipPath>
    </defs>
    <g clipPath="url(#helixArtToastClip)">
      {[
        { i: 0, y: 76 },
        { i: 1, y: 120 },
      ].map((toast) => (
        <g
          className="artMotion artEdgeIn"
          key={toast.y}
          style={{ '--art-from': '200px', animationDelay: `${toast.i * 170}ms` } as CSSProperties}
        >
          <g filter="url(#helixArtShadow)">
            <rect className="artOverlay" height="36" rx="4" width="164" x="96" y={toast.y} />
          </g>
          <rect
            className="artInk"
            fillOpacity="0.28"
            height="6"
            rx="3"
            width="88"
            x="118"
            y={toast.y + 15}
          />
        </g>
      ))}
    </g>
  </>
)
