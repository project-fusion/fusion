import {
  handsOver,
  roomToward,
  SCROLL_LOCK,
  type SwipeEdge,
  swipeAxis,
  towardEdge,
} from '@fusion.dev/helix-core'
import type { ReactiveController, ReactiveControllerHost } from 'lit'
import { listAt } from './swipe-start.js'

/** How far a touch travels along the swipe before the drawer decides whose drag it is, in pixels. */
const DECIDES = 3

/** What `DrawerHandOff` reads of the drawer. */
export interface HandOffOptions {
  /** The edge the panel leaves through. */
  readonly edge: () => SwipeEdge
  /** How far the panel rests toward its edge from the whole, in pixels. */
  readonly rest: () => number
  /** The region that scrolls what the drawer holds. */
  readonly scroller: () => HTMLElement | null
  /** The panel, which hears the touch move. */
  readonly surface: () => HTMLElement | null
}

/**
 * **A list inside a drawer hands its drag to the panel**, as core's
 * `handsOver` says and a phone's drawer does: a drag toward the edge is the
 * panel's once the list can scroll no further that way, its top for a drawer
 * at the bottom, and has stood still for `SCROLL_LOCK`, and a drag away from
 * the edge is the panel's while it rests short of the whole. Any other drag
 * is the list's, which the browser scrolls.
 *
 * **The decision is made as the touch starts to move**, and a drag the panel
 * takes keeps the browser from scrolling the list for the rest of the touch:
 * the browser owns a touch once it has started to scroll, so a list that
 * reaches its top during a drag stays the list's until the next touch. The
 * time the list last moved is read from its own `scroll`, which its momentum
 * sends too.
 */
export class DrawerHandOff implements ReactiveController {
  private readonly options: HandOffOptions

  /** The list the press landed in, while a press inside one is down. */
  private list: Element | undefined

  /** Where the press began. */
  private origin = { x: 0, y: 0 }

  /** Whose drag it is, once decided: the panel's, or the list's. */
  private decided: boolean | undefined

  /** When the list last moved, in milliseconds on the page's clock. */
  private scrolledAt = Number.NEGATIVE_INFINITY

  /** The scroller listened to for `scroll`, which is the shadow root's and never bubbles out. */
  private heard: HTMLElement | null = null

  /**
   * The panel listened to for `touchmove`. **On the panel and not the host**:
   * a browser asks a touch's listeners whether they refuse it only where a
   * box that listens lies under the touch, and the host draws no box.
   */
  private touched: HTMLElement | null = null

  constructor(host: ReactiveControllerHost & HTMLElement, options: HandOffOptions) {
    this.options = options
    host.addController(this)
  }

  hostDisconnected(): void {
    this.heard?.removeEventListener('scroll', this.handleScroll)
    this.touched?.removeEventListener('touchmove', this.handleTouchMove, { capture: true })
    this.heard = null
    this.touched = null
  }

  hostUpdated(): void {
    const scroller = this.options.scroller()
    if (scroller !== this.heard) {
      this.heard?.removeEventListener('scroll', this.handleScroll)
      scroller?.addEventListener('scroll', this.handleScroll, { passive: true })
      this.heard = scroller
    }
    const surface = this.options.surface()
    if (surface !== this.touched) {
      this.touched?.removeEventListener('touchmove', this.handleTouchMove, { capture: true })
      surface?.addEventListener('touchmove', this.handleTouchMove, {
        capture: true,
        passive: false,
      })
      this.touched = surface
    }
  }

  /** Hears a press that may start a swipe, and the list it landed in, where it landed in one. */
  begin(event: PointerEvent): void {
    this.list = listAt(
      event.composedPath(),
      swipeAxis(this.options.edge()),
      this.options.scroller(),
    )
    this.origin = { x: event.clientX, y: event.clientY }
    this.decided = undefined
  }

  /**
   * Whether a drag `dx` and `dy` from the press moves the panel: always
   * outside a list, and as decided inside one, deciding now where it has not.
   */
  takes(dx: number, dy: number): boolean {
    if (this.list === undefined) {
      return true
    }
    return this.decide(dx, dy) === true
  }

  /** Whether the press that just ended was inside a list that kept its drag. */
  get kept(): boolean {
    return this.list !== undefined && this.decided !== true
  }

  /** Whose drag it is, deciding once the drag has gone far enough along the swipe. */
  private decide(dx: number, dy: number): boolean | undefined {
    if (this.decided !== undefined || this.list === undefined) {
      return this.decided
    }
    const edge = this.options.edge()
    const toward = towardEdge(edge, dx, dy)
    const along = Math.abs(swipeAxis(edge) === 'x' ? dx : dy)
    const across = Math.abs(swipeAxis(edge) === 'x' ? dy : dx)
    if (along < DECIDES || across > along) {
      return undefined
    }
    const list = this.list
    const x = swipeAxis(edge) === 'x'
    this.decided = handsOver({
      rest: this.options.rest(),
      room: roomToward(edge, {
        content: x ? list.scrollWidth : list.scrollHeight,
        frame: x ? list.clientWidth : list.clientHeight,
        offset: x ? Math.abs(list.scrollLeft) : list.scrollTop,
      }),
      still: performance.now() - this.scrolledAt >= SCROLL_LOCK,
      toward,
    })
    return this.decided
  }

  /** The list's own scroll, which starts the lock again. */
  private readonly handleScroll = (): void => {
    this.scrolledAt = performance.now()
  }

  /** A touch moving inside a list: decided, and kept from scrolling the list where the panel takes it. */
  private readonly handleTouchMove = (event: TouchEvent): void => {
    const touch = event.touches[0]
    if (this.list === undefined || touch === undefined) {
      return
    }
    const decided = this.decide(touch.clientX - this.origin.x, touch.clientY - this.origin.y)
    if (decided === true && event.cancelable) {
      event.preventDefault()
    }
  }
}
