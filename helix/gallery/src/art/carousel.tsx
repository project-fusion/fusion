import type { ReactNode } from 'react'

export const carouselArt: ReactNode = (
  <>
    <rect className="artSunken" height="72" rx="4" width="56" x="56" y="56" />
    <rect className="artSunken" height="72" rx="4" width="56" x="208" y="56" />
    <g className="artMotion artLift">
      <g className="artLiftShadow" filter="url(#helixArtShadow)">
        <rect className="artSurface" height="104" rx="4" width="128" x="96" y="40" />
      </g>
      <rect className="artSurface" height="104" rx="4" width="128" x="96" y="40" />
      <rect className="artEdge" height="103" rx="4" width="127" x="96.5" y="40.5" />
    </g>
    {[146, 160, 174].map((cx) => (
      <circle
        className={cx === 160 ? 'artSolid' : 'artInk'}
        cx={cx}
        cy="164"
        fillOpacity={cx === 160 ? 1 : 0.28}
        key={cx}
        r="3.5"
      />
    ))}
  </>
)
