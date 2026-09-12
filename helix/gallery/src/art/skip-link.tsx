import type { ReactNode } from 'react'

/**
 * A plate over the corner of a header, and the content it skips to.
 *
 * **The header is the context and the plate is the subject.** The bar and the
 * text below it carry the fainter ink, because what says `skip-link` rather
 * than `app-header` is the one solid mark sitting over the bar's corner, where
 * the component appears when the keyboard reaches it.
 *
 * **Only the plate moves, and it arrives rather than swells.** It is the one
 * thing on a page that is absent until it is needed, so the card draws it
 * appearing over a bar that stays put.
 */
export const skipLinkArt: ReactNode = (
  <>
    <rect className="artSurface" height="40" width="232" x="44" y="56" />
    <rect className="artRule" height="1" width="232" x="44" y="96" />
    <rect className="artInk" fillOpacity="0.12" height="8" rx="4" width="32" x="164" y="72" />
    <rect className="artInk" fillOpacity="0.12" height="8" rx="4" width="28" x="208" y="72" />
    {[116, 132, 148].map((y, row) => (
      <rect
        className="artInk"
        fillOpacity="0.12"
        height="8"
        key={y}
        rx="4"
        width={[176, 200, 144][row]}
        x="60"
        y={y}
      />
    ))}
    <g className="artMotion artOpen">
      <rect className="artSolid" height="28" rx="8" width="96" x="52" y="62" />
      <rect className="artOnSolid" height="6" rx="3" width="64" x="68" y="73" />
    </g>
  </>
)
