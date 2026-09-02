import type { ReactNode } from 'react'

/**
 * One box and the thing it is an answer to, at twenty pixels.
 *
 * Not ticked, unticked and mixed side by side: a state table belongs on the
 * API page, and three boxes in a row read as Checkbox Group. One box with a
 * label beside it is the component, and the label is what separates the two
 * cards.
 */
export const checkboxArt: ReactNode = (
  <>
    {/* No edge on a filled control. `artEdge` is a `non-scaling-stroke`, so it
        renders one device pixel wide whatever the card is scaled to, which
        here is wider than the one unit it is inset by: the stroke spilled past
        the fill it was tracing and the page showed through between the two.
        A checked box has no border in the component either. The border
        belongs to the empty state, and the empty state is not drawn. */}
    <rect className="artSolid artMotion artOn" height="20" rx="4" width="20" x="94" y="90" />
    <path
      className="artOnSolid artMotion artMark"
      d="M98 100l3.5 3.5 7-7.5 1.4 1.4-8.4 8.9-4.9-4.9z"
    />
    <rect className="artInk" fillOpacity="0.55" height="8" rx="4" width="96" x="130" y="96" />
  </>
)
