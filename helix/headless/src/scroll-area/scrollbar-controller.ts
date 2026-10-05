import { capturePointer, DelayController, isRtl } from '@fusion.dev/helix-core'
import type { ReactiveController, ReactiveControllerHost } from 'lit'
import {
  type Axis,
  alongTrack,
  type Extent,
  extentOf,
  hasScrollbar,
  offsetAt,
  type Scrollbars,
  scrollFraction,
  scrollPerPixel,
  showsScrollbar,
  thumbFraction,
} from './scrollbar.js'

/** What one drawn scrollbar shows: whether it is there, and its thumb's facts. */
export interface Bar {
  /** Whether the axis has a scrollbar at all. See `hasScrollbar`. */
  drawn: boolean
  /** How far along the axis is scrolled, from 0 to 1. */
  along: number
  /** The share of the track the thumb covers, from 0 to 1. */
  thumb: number
}

/** A thumb being dragged, from where it was taken. */
interface Drag {
  axis: Axis
  /** The offset the axis was at when the drag began, or where a press on the track sent it. */
  from: number
  /** How far the content moves for each pixel the pointer moves. */
  perPixel: number
  /** The pointer's coordinate along the axis when the drag began. */
  pointer: number
  /** `-1` where moving the pointer right moves the thumb toward the start, on a right-to-left page. */
  sign: number
}

/** What the controller needs of the scroll area it serves. */
export interface ScrollbarOptions {
  /** The box that scrolls, or null before it renders. */
  box: () => HTMLElement | null
  /** The host's `hide-delay`, in milliseconds. */
  hideDelay: () => number
  /** The host's `scrollbars`, or undefined for the browser's own. */
  mode: () => Scrollbars | undefined
  /** Sends a `scrollend` from the host, for the one a drag held back. */
  scrollEnd: () => void
}

/**
 * How long after a drag ends a held `scrollend` waits for the browser's own,
 * in milliseconds: a frame or two, which is when the last step's would come.
 */
const SETTLE = 100

/**
 * The scrollbars a scroll area draws under `scrollbars`: what each shows, when
 * they show, and the thumb a pointer drags.
 *
 * **A controller, so the element only draws.** It holds the drag, whether the
 * pointer is over the area or a scrollbar, and the wait that puts the
 * scrollbars away, and asks the host to render when any of them changes.
 *
 * **A drag sends one `scrollend`.** The thumb moves the content by
 * `scrollTo`, and the browser ends each of those steps with a `scrollend` of
 * its own, so a drag sent a burst of them. While a thumb is held they are held
 * back, and once it is let go one is sent: the browser's own for the last
 * step, or the held one where none comes.
 */
export class ScrollbarController implements ReactiveController {
  /** What each scrollbar shows, measured, and `undefined` until it has been. */
  bars: Record<Axis, Bar> | undefined

  /** Whether the content moved, or the pointer left, within the hide delay. */
  active = false

  /** Whether the pointer is over the scroll area. */
  hovered = false

  /** Whether the pointer is over a scrollbar. */
  over = false

  /** The thumb being dragged, if one is. */
  private drag: Drag | undefined

  /** Whether a `scrollend` was held back by a drag and not sent yet. */
  private heldEnd = false

  private readonly host: ReactiveControllerHost & HTMLElement

  private readonly options: ScrollbarOptions

  /** Puts the scrollbars away once nothing has moved for the hide delay. */
  private readonly hide: DelayController

  /** Waits after a drag for the browser's last `scrollend`. */
  private readonly settle: DelayController

  constructor(host: ReactiveControllerHost & HTMLElement, options: ScrollbarOptions) {
    this.host = host
    this.options = options
    this.hide = new DelayController(host, { renders: false })
    this.settle = new DelayController(host, { renders: false })
    host.addController(this)
  }

  hostConnected(): void {
    this.host.addEventListener('pointerenter', this.handleEnter)
    this.host.addEventListener('pointerleave', this.handleLeave)
  }

  hostDisconnected(): void {
    this.host.removeEventListener('pointerenter', this.handleEnter)
    this.host.removeEventListener('pointerleave', this.handleLeave)
    /* The waits were canceled on the way out, so nothing would put the
       scrollbars away again. */
    this.drag = undefined
    this.heldEnd = false
    this.active = false
    this.hovered = false
    this.over = false
  }

  /** Whether a thumb is held. */
  get dragging(): boolean {
    return this.drag !== undefined
  }

  /** Whether the scrollbars that are drawn are showing at this moment. */
  get shown(): boolean {
    const mode = this.options.mode()
    return mode
      ? showsScrollbar(mode, {
          active: this.active,
          held: this.over || this.drag !== undefined,
          hovered: this.hovered,
        })
      : false
  }

  /**
   * Reads what each scrollbar shows off the box.
   *
   * An axis scrolls unless its `overflow` says it cannot. An empty reading is a
   * harness with no layout, where the mark `core` puts on the viewport is
   * `overflow: auto` on both axes, so it counts as one that scrolls.
   *
   * Asks for a render only on a change, so a scroll that moves no thumb
   * renders nothing.
   */
  read(box: HTMLElement): void {
    const mode = this.options.mode() ?? 'auto'
    const style = getComputedStyle(box)
    const bar = (axis: Axis, overflow: string): Bar => {
      const extent = extentOf(box, axis)
      return {
        along: scrollFraction(extent),
        drawn: hasScrollbar(
          mode,
          !['clip', 'hidden', 'visible'].includes(overflow),
          extent.offset > 1 || extent.client < extent.scroll - 1,
        ),
        thumb: thumbFraction(extent),
      }
    }
    const next = {
      horizontal: bar('horizontal', style.overflowX),
      vertical: bar('vertical', style.overflowY),
    }
    if (JSON.stringify(next) !== JSON.stringify(this.bars)) {
      this.bars = next
      this.host.requestUpdate()
    }
  }

  /**
   * Shows the scrollbars and starts the wait that puts them away again, under
   * `scroll` and `hover`.
   */
  wake(): void {
    const mode = this.options.mode()
    if (mode !== 'scroll' && mode !== 'hover') {
      return
    }
    this.set('active', true)
    this.hide.start(this.options.hideDelay(), () => {
      this.set('active', false)
    })
  }

  /**
   * Whether to hold back a `scrollend` the viewport sent: true while a thumb is
   * held. One arriving after the drag ends is the browser's last, and stands
   * for the one held back.
   */
  holdsScrollEnd(): boolean {
    if (this.drag) {
      this.heldEnd = true
      return true
    }
    if (this.heldEnd) {
      this.heldEnd = false
      this.settle.cancel()
    }
    return false
  }

  /** Writes one of the moment's facts, and renders where it changed. */
  private set(key: 'active' | 'hovered' | 'over', value: boolean): void {
    if (this[key] !== value) {
      this[key] = value
      this.host.requestUpdate()
    }
  }

  /** Sends the content to `offset` along an axis, counted from its start. */
  private scrollAlong(box: HTMLElement, axis: Axis, offset: number): void {
    box.scrollTo(
      axis === 'vertical'
        ? { behavior: 'instant', top: offset }
        : { behavior: 'instant', left: isRtl(box) ? -offset : offset },
    )
  }

  /**
   * Takes hold of a thumb, or presses the track.
   *
   * A press on the track sends the thumb's middle to the press first, and the
   * drag carries on from there, so a press and a drag are one gesture as they
   * are on the browser's own scrollbar. `preventDefault` keeps the press from
   * starting a text selection, and from moving focus off the viewport.
   */
  private grab(event: PointerEvent, axis: Axis): void {
    const box = this.options.box()
    const bar = event.currentTarget as HTMLElement
    const thumb = bar.querySelector<HTMLElement>('[part~="thumb"]')
    if (event.button !== 0 || !box || !thumb) {
      return
    }
    event.preventDefault()
    const vertical = axis === 'vertical'
    const rtl = !vertical && isRtl(box)
    const track = bar.getBoundingClientRect()
    const held = thumb.getBoundingClientRect()
    const length = vertical ? track.height : track.width
    const size = vertical ? held.height : held.width
    const extent: Extent = extentOf(box, axis)
    const pointer = vertical ? event.clientY : event.clientX
    let from = extent.offset
    if (!thumb.contains(event.target as Node)) {
      from = offsetAt(extent, alongTrack(pointer, track, axis, rtl), length, size)
      this.scrollAlong(box, axis, from)
    }
    this.drag = {
      axis,
      from,
      perPixel: scrollPerPixel(extent, length, size),
      pointer,
      sign: rtl ? -1 : 1,
    }
    capturePointer(bar, event.pointerId)
    this.host.requestUpdate()
  }

  readonly handleVerticalDown = (event: PointerEvent): void => {
    this.grab(event, 'vertical')
  }

  readonly handleHorizontalDown = (event: PointerEvent): void => {
    this.grab(event, 'horizontal')
  }

  /** Moves the content with a dragged thumb. Nothing while no thumb is held. */
  readonly handleDragMove = (event: PointerEvent): void => {
    const drag = this.drag
    const box = this.options.box()
    if (!drag || !box) {
      return
    }
    const pointer = drag.axis === 'vertical' ? event.clientY : event.clientX
    this.scrollAlong(
      box,
      drag.axis,
      drag.from + (pointer - drag.pointer) * drag.sign * drag.perPixel,
    )
  }

  /**
   * Lets go of the thumb. A `scrollend` the drag held back goes out once the
   * browser's last one has had a frame or two to arrive and has not.
   */
  readonly handleDragEnd = (): void => {
    if (!this.drag) {
      return
    }
    this.drag = undefined
    if (this.heldEnd) {
      this.settle.start(SETTLE, () => {
        if (this.heldEnd) {
          this.heldEnd = false
          this.options.scrollEnd()
        }
      })
    }
    this.wake()
    this.host.requestUpdate()
  }

  readonly handleBarEnter = (): void => {
    this.set('over', true)
  }

  readonly handleBarLeave = (): void => {
    this.set('over', false)
    this.wake()
  }

  private readonly handleEnter = (): void => {
    this.set('hovered', true)
  }

  private readonly handleLeave = (): void => {
    this.set('hovered', false)
    if (this.options.mode() === 'hover') {
      this.wake()
    }
  }
}
