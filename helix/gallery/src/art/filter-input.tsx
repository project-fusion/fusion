import type { CSSProperties, ReactNode } from 'react'

/**
 * A field with the tags already narrowing it sitting inside it, and a caret
 * still going after them.
 *
 * Combobox's card is the same field over a list, and that is the difference
 * worth drawing: there the typing narrows a list the answer is chosen from, so
 * the panel is the point; here the answer is already in the field and the
 * typing adds to it. No panel, and the tags are inside the frame rather than
 * under it.
 *
 * The chips are Tag's own derivation, the fill at 12% and the label at 55%,
 * because that is what a consumer slots into the row.
 *
 * The third arrives, which is the one motion this component has: a filter is a
 * set being added to, and nothing else on the card moves.
 */
export const filterInputArt: ReactNode = (
  <>
    <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="56" x="56" y="56" />
    <rect className="artSunken" height="40" rx="4" width="208" x="56" y="76" />
    <rect className="artEdge" height="39" rx="4" width="207" x="56.5" y="76.5" />

    <rect className="artInk" fillOpacity="0.12" height="24" rx="4" width="56" x="64" y="84" />
    <rect className="artInk" fillOpacity="0.55" height="8" rx="4" width="32" x="76" y="92" />

    <rect className="artInk" fillOpacity="0.12" height="24" rx="4" width="48" x="128" y="84" />
    <rect className="artInk" fillOpacity="0.55" height="8" rx="4" width="24" x="140" y="92" />

    {/* A hundred and forty puts it past the frame's edge before it comes back,
        so nothing shows it part-way in at rest. */}
    <g className="artMotion artEdgeIn" style={{ '--art-from': '140px' } as CSSProperties}>
      <rect className="artInk" fillOpacity="0.12" height="24" rx="4" width="44" x="184" y="84" />
      <rect className="artInk" fillOpacity="0.55" height="8" rx="4" width="20" x="196" y="92" />
    </g>

    {/* Filled rather than stroked, for the reason Combobox's is: a hairline
        half-renders at the card's three-quarter scale. */}
    <rect className="artSolid" height="12" rx="1" width="2" x="236" y="90" />
  </>
)
