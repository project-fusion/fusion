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
 * long tail of browser behaviour rather than a formula.
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
          apply: ({ availableHeight, availableWidth, elements }) => {
            elements.floating.style.setProperty(
              '--floating-available-height',
              `${Math.round(availableHeight)}px`,
            )
            elements.floating.style.setProperty(
              '--floating-available-width',
              `${Math.round(availableWidth)}px`,
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
        transform: `translate(${Math.round(x)}px, ${Math.round(y)}px)`,
      })
      floating.setAttribute('data-placement', placement)

      const point = middlewareData.arrow
      if (pointer && point) {
        Object.assign(pointer.style, {
          insetBlockStart: point.y === undefined ? '' : `${point.y}px`,
          insetInlineStart: point.x === undefined ? '' : `${point.x}px`,
        })
      }
    })
  }

  hostDisconnected(): void {
    this.stop()
  }
}
