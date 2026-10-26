/**
 * How an element follows the page it stands over as the page scrolls. Read
 * as syntax, as `tree.ts` says.
 */

/**
 * The page an element follows as it scrolls, the states it is in as the page
 * stands, and the event it sends as the page leaves its top, as an app header
 * lifts off the page once it has scrolled:
 *
 * ```ts
 * pageScroll: { hidden: 'hidden', hideOnScroll: 'hideOnScroll', keepInView: 'open', onScrolledChange: 'scrolled', scrolled: 'scrolled', scroller: 'scroller' }
 * ```
 *
 * **The page is the window on the web, and the scroll view the element is
 * drawn in on a phone**, unless `scroller` names what scrolls by its id: an
 * element on the web, and a view a phone registers with `useTarget`, such as
 * the `ScrollArea` an app draws its page in. `scrolled` holds once the page
 * has moved 8 pixels or points from its top, and lets go within 2 of it, so
 * the state does not flicker where scroll positions cluster. Under `hideOnScroll`,
 * a scroll down past the element's own height puts it in `hidden`, and a
 * scroll up of more than 4 takes it out, as does a return to the top, while
 * `keepInView` holds nothing hides it.
 */
export interface Page {
  /** The state that holds while a scroll down has moved the element out of the way. */
  readonly hidden?: string
  /** The prop that moves the element out of the way on a scroll down, and back on a scroll up. */
  readonly hideOnScroll?: string
  /** The state that holds while the page stands scrolled from its top. */
  readonly scrolled: string
  /** The prop that holds the id of what scrolls, where it is not the page around the element. */
  readonly scroller?: string
  /** The event sent as `scrolled` turns, its detail `scrolled`. */
  readonly onScrolledChange?: string
  /** The prop that keeps the element in view while it holds. */
  readonly keepInView?: string
}
