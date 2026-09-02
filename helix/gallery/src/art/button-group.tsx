import type { ReactNode } from 'react'

/**
 * Separate controls, one shape: the inner corners go flat and the outer ones
 * keep their radius. At a true 4 pixel radius that is a quiet idea, and it is
 * quiet in the component too.
 */
export const buttonGroupArt: ReactNode = (
  <>
    <g className="artMotion artLift">
      <g className="artLiftShadow" filter="url(#helixArtShadow)">
        <rect className="artSurface" height="40" rx="4" width="216" x="52" y="80" />
      </g>
      <path className="artSurface" d="M56 80h68v40H56a4 4 0 0 1-4-4V84a4 4 0 0 1 4-4z" />
      <path className="artSurface" d="M124 80h72v40h-72z" />
      <path className="artSurface" d="M196 80h68a4 4 0 0 1 4 4v32a4 4 0 0 1-4 4h-68z" />
      <rect className="artEdge" height="39" rx="4" width="215" x="52.5" y="80.5" />
      <rect className="artRule" height="40" width="1" x="124" y="80" />
      <rect className="artRule" height="40" width="1" x="196" y="80" />
      {[74, 146, 218].map((x) => (
        <rect
          className="artInk"
          fillOpacity="0.55"
          height="8"
          key={x}
          rx="4"
          width="28"
          x={x}
          y="96"
        />
      ))}
    </g>
  </>
)
