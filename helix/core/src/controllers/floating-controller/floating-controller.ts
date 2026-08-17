import {
  arrow,
  autoUpdate,
  computePosition,
  flip,
  type Middleware,
  offset,
  type Placement,
  shift,
  size,
} from '@floating-ui/dom'
import type { ReactiveController, ReactiveControllerHost } from 'lit'

export type { Placement }

export interface FloatingOptions {
  /** The element being pointed at. */
  anchor: () => HTMLElement | null | undefined

  /**
   * An element to point at the anchor, positioned against whichever side the
   * floating element landed on.
   */
  arrow?: () => HTMLElement | null | undefined

  /** The element being placed. */
  floating: () => HTMLElement | null | undefined

  /**
   * Whether to try another side when the preferred one does not fit.
   *
   * On by default. A menu that opens off the bottom of the window is one the
   * reader cannot use.
   */
  flip?: boolean

  /**
   * Space between the anchor and the floating element, in pixels.
   *
   * A function where it can change. Options are read at construction, and a
   * host's own properties are still at their class defaults then, before any
   * attribute has been parsed.
   */
  offset?: number | (() => number)

  /**
   * Preferred placement. Defaults to `bottom-start`.
   *
   * A function where it can change. Passing the host's property directly reads
   * it at construction, when it is still the class default, so every instance
   * gets the same placement whatever its markup said.
   */
  placement?: Placement | (() => Placement)

  /**
   * Whether to cap the floating element to the space available.
   *
   * On by default, written as `--floating-available-height` and
   * `--floating-available-width` rather than as a height. A list decides for
   * itself whether to scroll or to shrink; a controller that sets the height
   * has decided that for every element it places.
   */
  resize?: boolean

  /** Whether to slide along the side to stay in view. On by default. */
  shift?: boolean
}

/**
 * Places one element against another, and keeps it there.
 *
 * Positioning is `@floating-ui/dom` rather than arithmetic written here. Two
 * things in particular are why. A `position: fixed` element inside an ancestor
 * carrying `transform`, `filter`, `will-change`, or `contain` is positioned
 * against that ancestor and not the viewport, so viewport coordinates land it
 * somewhere else entirely. And an overlay has to clear its nearest *clipping*
 * ancestor, not just the window, or it is placed correctly inside a scrolling
 * panel and clipped out of sight by it. Both are ordinary here, and both are a
 * long tail of browser behavior rather than a formula.
 *
 * `autoUpdate` keeps the position through scrolling on any ancestor, resizes of
 * either element, and layout shifts.
 *
 * The side the element actually landed on is written back as `data-placement`,
 * so a styled tier can animate from it rather than from the side that was
 * asked for.
 */
export class FloatingController implements ReactiveController {
  private readonly options: FloatingOptions
  private cleanup: (() => void) | undefined

  constructor(host: ReactiveControllerHost & HTMLElement, options: FloatingOptions) {
    this.options = options
    // Registered so the host's disconnect releases the tracking, which is the
    // whole reason this is a controller rather than a function.
    host.addController(this)
  }

  /** The placement in use after the last measurement. */
  placement: Placement = 'bottom-start'

  /** Starts placing, and keeps placing until stopped. */
  start(): void {
    const anchor = this.options.anchor()
    const floating = this.options.floating()
    if (!anchor || !floating || this.cleanup) {
      return
    }
    this.cleanup = autoUpdate(anchor, floating, this.update)
  }

  /** Stops placing and releases everything it was tracking. */
  stop(): void {
    this.cleanup?.()
    this.cleanup = undefined
    this.options.floating()?.removeAttribute('data-placed')
  }

  /** Measures both elements and writes the position. */
  readonly update = (): void => {
    const anchor = this.options.anchor()
    const floating = this.options.floating()
    if (!anchor || !floating) {
      return
    }

    const pointer = this.options.arrow?.()
    const gap =
      typeof this.options.offset === 'function' ? this.options.offset() : this.options.offset
    const preferred =
      typeof this.options.placement === 'function'
        ? this.options.placement()
        : this.options.placement
    const middleware: Middleware[] = [offset(gap ?? 0)]
    if (this.options.flip !== false) {
      middleware.push(flip())
    }
    if (this.options.shift !== false) {
      middleware.push(shift({ padding: 8 }))
    }
    if (this.options.resize !== false) {
      middleware.push(
        size({
          apply: ({ availableHeight, availableWidth, elements, rects }) => {
            elements.floating.style.setProperty(
              '--floating-available-height',
              `${Math.round(availableHeight)}px`,
            )
            elements.floating.style.setProperty(
              '--floating-available-width',
              `${Math.round(availableWidth)}px`,
            )
            /* The anchor's width, which a panel that has to match the control
               it hangs off cannot get any other way. `min-inline-size: 100%`
               reads the containing block, and this positions with
               `position: fixed`, so that percentage is the viewport: a select's
               list came out the full width of the window, flush to its left
               edge. It looked like a positioning fault and was a percentage
               resolving against something the CSS could not see. */
            elements.floating.style.setProperty(
              '--floating-anchor-width',
              `${Math.round(rects.reference.width)}px`,
            )
          },
          padding: 8,
        }),
      )
    }
    if (pointer) {
      middleware.push(arrow({ element: pointer }))
    }

    computePosition(anchor, floating, {
      middleware,
      placement: preferred ?? 'bottom-start',
      // `fixed` so the overlay clears an ancestor with `overflow: hidden`.
      // Floating UI resolves the containing block either way, so this is about
      // clipping rather than about which coordinates are correct.
      strategy: 'fixed',
    }).then(({ middlewareData, placement, x, y }) => {
      this.placement = placement
      Object.assign(floating.style, {
        insetBlockStart: '0',
        insetInlineStart: '0',
        position: 'fixed',
        // A translate rather than insets, so the position never lands on a
        // subpixel boundary and blurs the text inside it.
        //
        // **The `translate` property, not `transform`.** They are not
        // interchangeable here. The individual properties compose ahead of
        // `transform`, so a panel that also sets `scale` for an entrance ends
        // up with `scale() translate()`, and a concatenation applies its right
        // hand side first: the position is computed and *then* multiplied by
        // the scale factor. A tooltip 600px down the page scaling from 0.9
        // therefore opens 60px out of place and slides into position, and one
        // scaling from 0 flies in from the viewport corner. As `translate` it
        // composes as `translate() scale()`, the offset is applied in the
        // parent's coordinates, and the scale cannot reach it.
        translate: `${Math.round(x)}px ${Math.round(y)}px`,
      })
      floating.setAttribute('data-placement', placement)
      /* Placed, and it is a separate fact from shown. `computePosition` is
         async, so between the render that reveals a panel and the microtask
         that positions it there is a frame where the panel is visible at
         whatever its stylesheet said, which for an absolutely positioned one
         with no offsets is its host's top-left. Measured on the select: the
         panel appeared 24px up and to the left of the trigger for one frame on
         the first open, and looked correct on every open after, because the
         inline styles from last time were still on it.

         A panel that wants to fade in on placement selects on this. Nothing has
         to: `data-placement` has been written here all along and this is its
         pair, so a component that ignores both is exactly as it was. */
      floating.setAttribute('data-placed', '')

      const point = middlewareData.arrow
      if (pointer && point) {
        Object.assign(pointer.style, {
          insetBlockStart: point.y === undefined ? '' : `${point.y}px`,
          insetInlineStart: point.x === undefined ? '' : `${point.x}px`,
        })
        /* Where the pointer ended up, as the centre of it, published for
           anything that has to grow out of the thing it points at.
         *
         * A panel scaling in wants its `transform-origin` on its own arrow, and
         * the arrow is not reliably where the placement says: `top-start` puts
         * it near one end, and `shift` slides it anywhere along the edge to
         * keep the panel on screen. Selecting on `data-placement` alone gets
         * the axis right and the position wrong, which reads as the panel
         * growing out of a point next to the trigger rather than out of it.
         *
         * Only the axis the arrow travels on is written. On a `top` placement
         * the arrow moves horizontally and its vertical position is the panel's
         * edge, so `--floating-arrow-y` is left unset and a consumer's fallback
         * stands. Cleared rather than zeroed when absent, so the fallback in
         * `var()` is what applies. */
        floating.style.setProperty(
          '--floating-arrow-x',
          point.x === undefined ? '' : `${Math.round(point.x + pointer.offsetWidth / 2)}px`,
        )
        floating.style.setProperty(
          '--floating-arrow-y',
          point.y === undefined ? '' : `${Math.round(point.y + pointer.offsetHeight / 2)}px`,
        )
      }
    })
  }

  hostDisconnected(): void {
    this.stop()
  }
}
