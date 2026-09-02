import type { CSSProperties, ReactNode } from 'react'

/**
 * The thing being pointed at, lit, and the panel that says why.
 *
 * No scrim, by the rule at the top of this file: a wash is a modal saying the
 * page is held back, and a tour is the opposite claim. What it draws instead
 * is one control brighter than the row it is in, which is the whole of what a
 * spotlight means, and the ring around it that says the light is deliberate.
 */
export const tourArt: ReactNode = (
  <>
    {/* A row of controls, one of them lit. */}
    <rect className="artSunken" height="20" rx="4" width="40" x="112" y="44" />
    <rect className="artSunken" height="20" rx="4" width="28" x="160" y="44" />
    <rect className="artRaised" height="20" rx="4" width="44" x="60" y="44" />
    <rect className="artEdge" height="30" rx="8" width="54" x="55" y="39" />
    <g className="artMotion artOpen" style={{ transformOrigin: 'left top' } as CSSProperties}>
      <g filter="url(#helixArtShadow)">
        <rect className="artOverlay" height="72" rx="4" width="168" x="56" y="84" />
      </g>
      <rect className="artInk" fillOpacity="0.55" height="8" rx="4" width="76" x="72" y="100" />
      <rect className="artInk" fillOpacity="0.28" height="6" rx="3" width="120" x="72" y="118" />
      <rect className="artInk" fillOpacity="0.28" height="6" rx="3" width="88" x="72" y="130" />
      <rect className="artRaised" height="18" rx="4" width="40" x="168" y="126" />
    </g>
  </>
)
