import type { CSSProperties, ReactNode } from 'react'

/**
 * One rule, and the two groups it makes.
 *
 * One line either side, not two. The subject is the rule; the lines are only
 * there to be separated by it, and a second line on each side says nothing
 * the first did not while making the rule the smallest thing in the frame.
 */
export const dividerArt: ReactNode = (
  <>
    {/* Centered on 160, all three, so the only ragged thing left is the line
        lengths, which is what a line length is for. Flush left, two lines
        hang under a rule reaching further right than either of them. */}
    <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="160" x="80" y="84" />
    {/* The rule draws itself out, from the middle, and 224 is where it ends
        rather than where it starts.
     *
     * At rest it is 176, which is exactly the width of the longer line below
     * it: the rule spans its content and no further. Hovered it reaches 224,
     * running 48 to 272, which is the full measure every other drawing in the
     * gallery is built out to. So the gesture is the rule going from "as wide
     * as what it divides" to "as wide as the frame allows", and both ends of
     * it are a number that already meant something rather than a percentage
     * picked to be visible.
     *
     * `artFill` rather than the baseline swell, because a divider has exactly
     * one dimension worth moving and the baseline scales the whole drawing,
     * the two lines included. Those hold still: the rule is the component and
     * the lines are only there to be divided.
     *
     * `transform-origin` overridden to `center`. `artFill` pivots at `left
     * center`, which is right for a value growing out of a track's start and
     * wrong for a rule that has no start: off a fixed left end it would
     * extend rightward, which is a progress bar. */}
    <rect
      className="artRule artMotion artFill"
      height="1"
      style={{ '--art-grow': 224 / 176, transformOrigin: 'center' } as CSSProperties}
      width="176"
      x="72"
      y="100"
    />
    <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="176" x="72" y="108" />
  </>
)
