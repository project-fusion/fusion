import { LayoutMotionController } from '../../controllers/layout-motion-controller/layout-motion-controller.js'
import { readTiming, runOn } from '../plain-host/plain-host.js'

/** How `moveItems` moves the items of an element. */
export interface MoveItemsOptions {
  /**
   * Which elements move: a selector matched inside the element, or a function
   * that returns them in the order they are drawn. Defaults to the element's
   * children.
   */
  items?: string | (() => readonly HTMLElement[]) | undefined
  /**
   * How long a move takes: milliseconds, a time such as `320ms`, or a custom
   * property such as `--helix-duration-slow`. Defaults to
   * `--helix-duration-normal`. `0` moves nothing.
   */
  duration?: number | string | undefined
  /** The curve a move follows, or a custom property that holds one. Defaults to `--helix-easing-standard`. */
  easing?: string | undefined
  /**
   * A positioned box around the element, such as a wrapper with
   * `position: relative`, where a copy of an item that leaves fades out where
   * it was. Not the element itself, whose children are what moves. Left out,
   * an item that leaves is gone at once and the items after it slide into
   * its room.
   */
  leaving?: HTMLElement | undefined
  /** Whether the first items into an empty element fade in, as a reader's first choice does. Off by default. */
  arriveIntoEmpty?: boolean | undefined
  /** The box the items scroll in, where it is not the page. */
  scroller?: Element | undefined
}

/**
 * Moves the items of any element from where they were to where they are,
 * whenever the page adds, removes, reorders or hides them, as Helix's own
 * lists do. Returns the function that stops it.
 *
 * ```js
 * import { moveItems } from '@fusion.dev/helix-core'
 *
 * const stop = moveItems(document.querySelector('ul'))
 * ```
 *
 * **The element is watched, not told.** Change its children however the page
 * or its framework does, and each item slides from its old place to its new
 * one. An item that arrives fades in, unless every item is new at once, which
 * is a list drawn again and stands still. A move interrupted by another
 * carries on from where the item is drawn.
 *
 * **Nothing moves for a reader who asked for less motion.** Only `transform`
 * and `opacity` animate, so a move never sets off layout, and each one is
 * added to the item's own transform.
 *
 * A copy of an item that leaves is never laid among the element's children,
 * which a framework reconciles. It goes into `leaving`, and is skipped as an
 * item.
 */
export const moveItems = (element: HTMLElement, options: MoveItemsOptions = {}): (() => void) => {
  const { items } = options
  const pick =
    typeof items === 'function'
      ? items
      : () =>
          [...element.querySelectorAll<HTMLElement>(items ?? ':scope > *')].filter(
            (one) => !one.hasAttribute('data-leaving'),
          )
  const running = runOn(
    element,
    (host) =>
      new LayoutMotionController(host, {
        arriveIntoEmpty: options.arriveIntoEmpty ?? false,
        items: pick,
        leaving: () => options.leaving,
        scroller: () => options.scroller,
        timing: () => ({
          duration: readTiming(element, options.duration, '--helix-duration-normal', '200ms'),
          easing: readTiming(
            element,
            options.easing,
            '--helix-easing-standard',
            'cubic-bezier(0.2, 0, 0, 1)',
          ),
        }),
      }),
  )
  return running.release
}
