import type { CSSProperties, ReactNode } from 'react'

/**
 * A field with words half-typed in it, over a list those words have already
 * cut down. Select's card is the same field over four rows; this one is two,
 * and that difference is the whole component: the typing is not the answer,
 * it is what narrowed the list the answer comes from.
 *
 * The caret is a filled bar rather than a stroke, for the reason the number
 * input's rules are: a hairline half-renders at the card's three-quarter
 * scale. It grows on hover, which is the one thing on the card that reads as
 * typing rather than as pointing.
 */
export const comboboxArt: ReactNode = (
  <>
    <rect className="artSunken" height="40" rx="4" width="208" x="56" y="36" />
    <rect className="artEdge" height="39" rx="4" width="207" x="56.5" y="36.5" />
    <rect className="artInk" fillOpacity="0.55" height="8" rx="4" width="40" x="72" y="52" />
    <rect
      className="artSolid artMotion artFill"
      height="12"
      rx="1"
      style={{ '--art-grow': 2 } as CSSProperties}
      width="2"
      x="116"
      y="50"
    />
    <path className="artInk" d="M236.5 54l5.5 5.5 5.5-5.5-1.5-1.5-4 4-4-4z" fillOpacity="0.28" />
    <g className="artMotion artOpen" style={{ transformOrigin: 'center top' } as CSSProperties}>
      <g filter="url(#helixArtShadow)">
        <rect className="artOverlay" height="80" rx="4" width="208" x="56" y="88" />
      </g>
      {/* Two rows where Select's card has four, both starting with the same
          forty-unit run the field holds: what survived the filter is what
          begins with what was typed. */}
      <rect className="artRaised" height="28" rx="4" width="192" x="64" y="100" />
      <rect className="artInk" fillOpacity="0.55" height="8" rx="4" width="40" x="76" y="110" />
      <rect className="artInk" fillOpacity="0.55" height="8" rx="4" width="52" x="120" y="110" />
      <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="40" x="76" y="142" />
      <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="36" x="120" y="142" />
    </g>
  </>
)
