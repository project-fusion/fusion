import type { CSSProperties, ReactNode } from 'react'

/**
 * A closed list, opened. The indicator is what says it was ever closed, and
 * the panel grows out of the edge it is anchored to rather than its middle.
 */
export const selectArt: ReactNode = (
  <>
    <rect className="artSunken" height="40" rx="4" width="208" x="56" y="36" />
    <rect className="artEdge" height="39" rx="4" width="207" x="56.5" y="36.5" />
    <rect className="artInk" fillOpacity="0.55" height="8" rx="4" width="72" x="72" y="52" />
    <path className="artInk" d="M236.5 54l5.5 5.5 5.5-5.5-1.5-1.5-4 4-4-4z" fillOpacity="0.28" />
    <g className="artMotion artOpen" style={{ transformOrigin: 'center top' } as CSSProperties}>
      <g filter="url(#helixArtShadow)">
        <rect className="artOverlay" height="80" rx="4" width="208" x="56" y="88" />
      </g>
      <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="88" x="76" y="104" />
      <rect className="artRaised" height="24" rx="4" width="192" x="64" y="120" />
      <rect className="artInk" fillOpacity="0.55" height="8" rx="4" width="104" x="76" y="128" />
      <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="72" x="76" y="150" />
    </g>
  </>
)
