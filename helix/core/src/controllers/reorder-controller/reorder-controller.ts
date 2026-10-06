import type { ReactiveController, ReactiveControllerHost } from 'lit'
import { HelixBeforeReorderEvent } from '../../events/before-reorder.js'
import type { ReorderDetail } from '../../events/details.js'
import { HelixReorderEvent } from '../../events/reorder.js'
import { fillTemplate } from '../../utils/fill-template/fill-template.js'
import { deepActiveElement } from '../../utils/focusable-elements/focusable-elements.js'
import { formatNumbers } from '../../utils/format-numbers/format-numbers.js'
import { isRtl } from '../../utils/is-rtl/is-rtl.js'
import { localeOf } from '../../utils/locale-of/locale-of.js'
import {
  centersOf,
  dropMark,
  edgeSpeed,
  IDLE,
  passedCount,
  type ReorderAxis,
  type ReorderHold,
  type ReorderInput,
  type ReorderState,
  reorderKey,
  reorderStep,
} from '../../utils/reorder/reorder.js'

/** How far a press on a grip travels before it is a drag, in pixels. */
const SLOP = 4

/**
 * What a screen reader hears as an item moves. `{name}` is the item's name,
 * and `{position}` and `{count}` say where it would go.
 */
export interface ReorderWords {
  /** Said when a key or a click puts the item back where it was. */
  canceled: string
  /** Said when the item is let go. */
  dropped: string
  /** Said each time a key moves the held item. */
  moved: string
  /** Said when a key or a click takes hold of the item. */
  pickedUp: string
}

/** A move a drop asks for, counted from 0 in the order the items are drawn. */
export interface ReorderMove {
  from: number
  key: string
  to: number
}

export interface ReorderOptions {
  /** Which way the items run: rows down the block axis, or columns along the inline one. */
  axis: ReorderAxis

  /** The box an item is drawn in, or nothing for one a window did not draw. */
  box: (key: string) => DOMRect | undefined

  /**
   * Called when an item is let go at a new place. Returns whether the move
   * stood: `false` where a listener refused it.
   */
  drop: (move: ReorderMove) => boolean

  /** Whether a grip may be taken hold of now. Every grip may where this is not given. */
  enabled?: () => boolean

  /**
   * The grip an event passed through, and the key of the item it moves, or
   * nothing for an event that passed through none.
   */
  grip: (event: Event) => { element: HTMLElement; key: string } | undefined

  /**
   * Whether a key or a click holds the item for the arrow keys. `true` where
   * this is not given. Data Table's columns move a place for each arrow on the
   * grip and say `false`, so they are only dragged.
   */
  holds?: boolean

  /**
   * The key of the item an event passed through, anywhere in it. A click there
   * drops a held item at that place, which is the move a single pointer makes
   * without a drag.
   */
  item?: (event: Event) => string | undefined

  /** The keys of the items, in the order they are drawn. */
  keys: () => readonly string[]

  /** An item's name, for the words. */
  name?: (key: string) => string

  /** Speaks words in the host's live region. Nothing is said where this is not given. */
  say?: (words: string) => void

  /**
   * The box to scroll while a dragged item nears one of its edges, or `null`
   * for the window. Nothing scrolls where this is not given.
   */
  scroller?: () => HTMLElement | null

  /** The words a screen reader hears. */
  words?: () => ReorderWords
}

/**
 * Asks to move a row or an item and reports whether the move stood:
 * `helix-before-reorder`, which can refuse it, and then `helix-reorder`, which
 * is when you move your data.
 */
export const requestReorder = (host: HTMLElement, detail: ReorderDetail): boolean => {
  const asked = new HelixBeforeReorderEvent(detail)
  host.dispatchEvent(asked)
  if (asked.defaultPrevented) {
    return false
  }
  const told = new HelixReorderEvent({ ...detail, keys: [...detail.keys] })
  host.dispatchEvent(told)
  return !told.defaultPrevented
}

/**
 * Moves one item of a collection to a new place, by pointer, by keyboard, and
 * by a screen reader, and says each step in words.
 *
 * - **A pointer** drags an item by its grip. The page under it scrolls near an
 *   edge, and `mark` says where a drop indicator goes.
 * - **A key or a click** on a grip holds the item. The arrows move it, Home
 *   and End move it to either end, Enter, Space, or a second click drops it,
 *   and Escape puts it back. A click on another item drops it there, so one
 *   pointer can move an item without dragging, as WCAG 2.5.7 asks.
 *
 * **It moves nothing.** A drop calls `drop`, and the host asks its page,
 * which owns the items, to move them. The host reads `held` and `mark` when
 * it renders, and this asks it for an update at each change of state.
 *
 * Each change of state is worked out by `reorderStep`, a pure function, and
 * what it calls for runs here: the words, the scrolling, and the drop.
 */
export class ReorderController implements ReactiveController {
  private readonly host: ReactiveControllerHost & HTMLElement

  private readonly options: ReorderOptions

  /** The state of the move. */
  private state: ReorderState = IDLE

  /** The grip a key or a click took hold of, which has to keep focus. */
  private holder: Element | null = null

  /** Where the pointer was last, for the scrolling to place the item by. */
  private pointer = { x: 0, y: 0 }

  /** The frame the next scroll waits for. */
  private frame = 0

  constructor(host: ReactiveControllerHost & HTMLElement, options: ReorderOptions) {
    this.host = host
    this.options = options
    host.addController(this)
  }

  /** The item held and where it would go, or nothing while none is. */
  get held(): { by: ReorderHold; from: number; key: string; to: number } | undefined {
    const state = this.state
    return state.phase === 'held'
      ? { by: state.by, from: state.from, key: state.key, to: state.to }
      : undefined
  }

  /**
   * Where the drop indicator goes: before or after the item with that key, or
   * nothing while no item is held away from its place.
   */
  get mark(): { edge: 'after' | 'before'; key: string } | undefined {
    const held = this.held
    const at = held && dropMark(held.from, held.to)
    const key = at && this.options.keys()[at.index]
    return at && key !== undefined ? { edge: at.edge, key } : undefined
  }

  hostConnected(): void {
    this.host.addEventListener('pointerdown', this.handleDown)
    this.host.addEventListener('click', this.handleClick, true)
    this.host.addEventListener('keydown', this.handleKey, true)
    this.host.addEventListener('focusout', this.handleFocusOut)
  }

  hostDisconnected(): void {
    this.host.removeEventListener('pointerdown', this.handleDown)
    this.host.removeEventListener('click', this.handleClick, true)
    this.host.removeEventListener('keydown', this.handleKey, true)
    this.host.removeEventListener('focusout', this.handleFocusOut)
    this.listen(false)
    this.state = IDLE
    this.holder = null
  }

  /** Puts a held item back where it was, as Escape does. */
  cancel(): void {
    this.send({ type: 'cancel' })
  }

  /** Moves the state on, and runs what the change calls for. */
  private send(input: ReorderInput): boolean {
    const before = this.state
    const next = reorderStep(before, input)
    if (!next) {
      return false
    }
    this.state = next
    this.host.requestUpdate()
    this.enter(before, next)
    return true
  }

  /** What a change of state calls for. */
  private enter(before: ReorderState, next: ReorderState): void {
    if (next.phase === 'held') {
      if (before.phase !== 'held') {
        if (next.by === 'keyboard') {
          this.speak('pickedUp', next.key)
        } else {
          this.scroll()
        }
      } else if (next.by === 'keyboard') {
        this.speak('moved', next.key, next.to)
      }
      return
    }
    if (next.phase === 'dropped') {
      this.listen(false)
      this.holder = null
      const moved = next.to !== next.from
      const stood = !moved || this.options.drop({ from: next.from, key: next.key, to: next.to })
      this.speak(stood ? 'dropped' : 'canceled', next.key)
      this.send({ type: 'settle' })
      return
    }
    if (next.phase === 'canceled') {
      this.listen(false)
      this.holder = null
      this.speak('canceled', next.key)
      this.send({ type: 'settle' })
      return
    }
    if (next.phase === 'idle') {
      this.listen(false)
    }
  }

  /** Says one of the words, with the item's name and place filled in. */
  private speak(which: keyof ReorderWords, key: string, to?: number): void {
    const { name, say, words } = this.options
    if (!say || !words) {
      return
    }
    const number = formatNumbers(localeOf(this.host))
    say(
      fillTemplate(words()[which], {
        count: number(this.options.keys().length),
        name: name ? name(key) : key,
        position: number((to ?? 0) + 1),
      }),
    )
  }

  /** The place among the others that the pointer is over, for the item with that key. */
  private placeAt(key: string, x: number, y: number): number {
    const block = this.options.axis === 'block'
    const reversed = !block && isRtl(this.host)
    const spans = this.options
      .keys()
      .filter((one) => one !== key)
      .map((one) => {
        const box = this.options.box(one)
        return (
          box && (block ? { end: box.bottom, start: box.top } : { end: box.right, start: box.left })
        )
      })
    return passedCount(centersOf(spans, reversed), block ? y : x, reversed)
  }

  private enabled(): boolean {
    return this.options.enabled?.() ?? true
  }

  private readonly handleDown = (event: PointerEvent): void => {
    if (this.state.phase === 'held' && this.state.by === 'keyboard') {
      this.press()
      return
    }
    if (event.button !== 0 || !this.enabled() || this.state.phase !== 'idle') {
      return
    }
    const grip = this.options.grip(event)
    const from = grip ? this.options.keys().indexOf(grip.key) : -1
    if (!grip || from < 0) {
      return
    }
    /* A press on a grip that holds keeps the browser from selecting the text
       the drag crosses. Its click still takes hold, and focuses the grip. */
    if (this.options.holds !== false) {
      event.preventDefault()
    }
    this.pointer = { x: event.clientX, y: event.clientY }
    if (
      this.send({
        from,
        key: grip.key,
        pointer: event.pointerId,
        type: 'press',
        x: event.clientX,
        y: event.clientY,
      })
    ) {
      this.listen(true)
    }
  }

  private readonly handleMove = (event: PointerEvent): void => {
    const state = this.state
    if (
      (state.phase !== 'pressed' && !(state.phase === 'held' && state.by === 'pointer')) ||
      (state.phase === 'pressed' && event.pointerId !== state.pointer)
    ) {
      return
    }
    this.pointer = { x: event.clientX, y: event.clientY }
    this.drag()
  }

  /** Places the dragged item under the pointer's last reading. */
  private drag(): void {
    const state = this.state
    if (state.phase !== 'pressed' && state.phase !== 'held') {
      return
    }
    const { x, y } = this.pointer
    this.send({ slop: SLOP, to: this.placeAt(state.key, x, y), type: 'drag', x, y })
  }

  private readonly handleUp = (): void => {
    const dragged = this.state.phase === 'held'
    this.send({ type: 'release' })
    if (dragged) {
      /* The click a release raises lands on the grip, and would take hold of
         the item again. */
      window.addEventListener('click', swallow, { capture: true, once: true })
      setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 0)
    }
  }

  private readonly handleCancel = (): void => {
    this.send({ type: 'cancel' })
  }

  /** Starts or stops hearing the pointer on the window, and the scrolling with it. */
  private listen(on: boolean): void {
    if (on) {
      window.addEventListener('pointermove', this.handleMove)
      window.addEventListener('pointerup', this.handleUp)
      window.addEventListener('pointercancel', this.handleCancel)
      return
    }
    window.removeEventListener('pointermove', this.handleMove)
    window.removeEventListener('pointerup', this.handleUp)
    window.removeEventListener('pointercancel', this.handleCancel)
    if (this.frame) {
      cancelAnimationFrame(this.frame)
      this.frame = 0
    }
  }

  /** Scrolls the box while the dragged item is near one of its edges, a frame at a time. */
  private scroll(): void {
    const scroller = this.options.scroller
    if (!scroller || this.frame || typeof requestAnimationFrame !== 'function') {
      return
    }
    const tick = (): void => {
      this.frame = 0
      const state = this.state
      if (state.phase !== 'held' || state.by !== 'pointer') {
        return
      }
      const box = scroller()
      const block = this.options.axis === 'block'
      const edges = box
        ? box.getBoundingClientRect()
        : { bottom: innerHeight, left: 0, right: innerWidth, top: 0 }
      const speed = block
        ? edgeSpeed(this.pointer.y, edges.top, edges.bottom)
        : edgeSpeed(this.pointer.x, edges.left, edges.right)
      if (speed !== 0) {
        const by = block ? { top: speed } : { left: speed }
        if (box) {
          box.scrollBy(by)
        } else {
          window.scrollBy(by)
        }
        this.drag()
      }
      this.frame = requestAnimationFrame(tick)
    }
    this.frame = requestAnimationFrame(tick)
  }

  /**
   * A click on a grip takes hold of its item, and a second one drops it. While
   * one is held, a click on another item drops it there. Heard in the capture
   * phase, so the click that drops an item does not also select a row.
   */
  private readonly handleClick = (event: MouseEvent): void => {
    if (this.options.holds === false || !this.enabled()) {
      return
    }
    const state = this.state
    const grip = this.options.grip(event)
    if (state.phase === 'idle') {
      const from = grip ? this.options.keys().indexOf(grip.key) : -1
      if (grip && from >= 0) {
        this.take(grip.element, { from, key: grip.key, type: 'pick' })
      }
      return
    }
    if (state.phase !== 'held' || state.by !== 'keyboard') {
      return
    }
    const on = grip?.key ?? this.options.item?.(event)
    if (on === undefined) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    if (on === state.key) {
      this.send({ from: state.from, key: state.key, type: 'pick' })
      return
    }
    /* A pointer's click lands by where it was, and a click from a key or a
       screen reader, which has no place, on the item it was sent to. */
    const to =
      event.detail > 0
        ? this.placeAt(state.key, event.clientX, event.clientY)
        : this.options.keys().indexOf(on)
    this.send({ to: Math.max(0, to), type: 'target' })
  }

  /** Takes hold of an item from its grip, which keeps focus while it is held. */
  private take(element: HTMLElement, input: ReorderInput): void {
    if (deepActiveElement() !== element) {
      element.focus()
    }
    this.holder = element
    this.send(input)
  }

  /**
   * The keys while an item is held: the arrows, Home and End move it, Enter and
   * Space drop it, and Escape puts it back. Heard in the capture phase and kept
   * from everything else, so an arrow moves the item and not focus.
   *
   * A grip that is a native button answers Enter and Space with a click, which
   * `handleClick` hears. Any other grip, such as a cell of a grid, is answered
   * here.
   */
  private readonly handleKey = (event: KeyboardEvent): void => {
    if (this.options.holds === false || event.altKey || event.ctrlKey || event.metaKey) {
      return
    }
    const state = this.state
    const origin = event.composedPath()[0]
    const native = origin instanceof HTMLButtonElement
    const press = event.key === 'Enter' || event.key === ' '
    if (state.phase === 'idle') {
      const grip = press && !native && this.enabled() ? this.options.grip(event) : undefined
      const from = grip ? this.options.keys().indexOf(grip.key) : -1
      if (grip && from >= 0) {
        event.preventDefault()
        event.stopPropagation()
        this.take(grip.element, { from, key: grip.key, type: 'pick' })
      }
      return
    }
    if (state.phase !== 'held' || state.by !== 'keyboard') {
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      this.send({ type: 'cancel' })
      return
    }
    if (press) {
      if (!native) {
        event.preventDefault()
        event.stopPropagation()
        this.send({ type: 'drop' })
      }
      return
    }
    const to = reorderKey(event.key, {
      axis: this.options.axis,
      count: this.options.keys().length,
      rtl: isRtl(this.host),
      to: state.to,
    })
    if (to !== null && !event.shiftKey) {
      event.preventDefault()
      event.stopPropagation()
      this.send({ to, type: 'step' })
    }
  }

  /**
   * A pointer went down while a key or a click holds an item. Its click may
   * drop the item on another one, so the focus it moves does not put the item
   * back until that click has been heard.
   */
  private press(): void {
    this.pressing = true
    window.addEventListener(
      'pointerup',
      () => {
        setTimeout(() => {
          this.pressing = false
          this.keepOrCancel()
        }, 0)
      },
      { once: true },
    )
  }

  /** Whether a pointer is down while an item is held, for `press`. */
  private pressing = false

  /** Focus leaving the grip that holds an item puts the item back. */
  private readonly handleFocusOut = (): void => {
    if (this.state.phase === 'held' && this.state.by === 'keyboard') {
      queueMicrotask(() => this.keepOrCancel())
    }
  }

  /** Puts a held item back where focus has left its grip. */
  private keepOrCancel(): void {
    if (
      !this.pressing &&
      this.state.phase === 'held' &&
      this.state.by === 'keyboard' &&
      deepActiveElement() !== this.holder
    ) {
      this.send({ type: 'cancel' })
    }
  }
}

const swallow = (event: Event): void => {
  event.preventDefault()
  event.stopPropagation()
}
