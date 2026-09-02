import type { CSSProperties, ReactNode } from 'react'

/**
 * Two panes and the divider between them, which is the whole component.
 *
 * The panes are surfaces rather than the ink bars the rest of this group uses
 * for text, because what a splitter arranges is regions and not sentences:
 * filling them with lines would make this a card about content and it is a
 * card about the boundary.
 *
 * The divider is a rule at one unit, which is the vocabulary this file fixes
 * for a rule, and it is the only mark that has to survive at thumbnail size:
 * two panes with nothing between them is `grid`.
 */
export const splitterArt: ReactNode = (
  <>
    {/* All three move, because a divider that slides across two panes which
        stay put is not a splitter, it is a line on top of a picture of one.
        The panes are what the drag is *for*.
     *
     * The numbers are one number. The divider travels 24, so the left pane
     * has to end 24 wider (128 over 104, a scale of 1.231 from its left edge)
     * and the right 24 narrower (88 over 112, 0.786 from its right edge).
     * Each pane keeps its outer edge nailed down and gives way at the seam,
     * which is what `transform-origin` is doing on both.
     *
     * `artFill` takes a scale under one here: the sustain interpolates the
     * delta rather than the scale, so a value below one shrinks toward the
     * hold exactly as one above it grows. */}
    <g
      className="artMotion artFill"
      style={{ '--art-grow': 1.231, transformOrigin: 'left center' } as CSSProperties}
    >
      <rect className="artSunken" height="96" rx="4" width="104" x="48" y="52" />
    </g>
    <g
      className="artMotion artFill"
      style={{ '--art-grow': 0.786, transformOrigin: 'right center' } as CSSProperties}
    >
      <rect className="artSunken" height="96" rx="4" width="112" x="160" y="52" />
    </g>
    <rect
      className="artSolid artMotion artTravel"
      height="96"
      style={{ '--art-to': '24px' } as CSSProperties}
      width="2"
      x="155"
      y="52"
    />
  </>
)
