import type { CSSProperties, ReactNode } from 'react'

/**
 * Headings on this page, with a marker on the one being read.
 *
 * The hairline down the left is the component's own: a repeating background
 * rather than a border, with each item carrying a transparent
 * `border-inline-start` that the current one colors in. So the marker sits
 * *on* the rule rather than beside it.
 */
export const outlineArt: ReactNode = (
  <>
    <rect className="artRule" height="112" width="1" x="64" y="44" />
    <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="88" x="80" y="48" />
    <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="64" x="96" y="76" />
    {/* The one marker in the set that travels down rather than across, which
        is the axis the component reads on. `--art-to: 0` on its own parses,
        animates, and moves nothing, so the block axis has to be named:
        `--art-to-block` is what carries this one. */}
    <rect
      className="artSolid artMotion artTravel"
      height="16"
      style={{ '--art-to': '0px', '--art-to-block': '28px' } as CSSProperties}
      width="2"
      x="63"
      y="100"
    />
    <rect className="artInk" fillOpacity="0.55" height="8" rx="4" width="72" x="96" y="104" />
    <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="80" x="80" y="132" />
  </>
)
