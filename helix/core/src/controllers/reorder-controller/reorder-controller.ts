import type {
  nothing,
  ReactiveController,
  ReactiveControllerHost,
  ReactiveElement,
  TemplateResult,
} from 'lit'
import { HelixBeforeReorderEvent } from '../../events/before-reorder.js'
import type { ReorderDetail } from '../../events/details.js'
import { HelixReorderEvent } from '../../events/reorder.js'
import { deepActiveElement } from '../../utils/focusable-elements/focusable-elements.js'
import { isRtl } from '../../utils/is-rtl/is-rtl.js'
import { boxOf, dragPreviewOf, drawDragPreview } from '../../utils/reorder/drag-preview.js'
import {
  centersOf,
  dropMark,
  edgeSpeed,
  IDLE,
  passedCount,
  placeKey,
  type ReorderAxis,
  type ReorderHold,
  type ReorderInput,
  type ReorderState,
  reorderKey,
  reorderStep,
} from '../../utils/reorder/reorder.js'
import { scrollingAncestor } from '../../utils/scroll-item-into-view/scroll-item-into-view.js'
import { formatMessage } from '../../words/message.js'
import { formatWords } from '../../words/words.js'
import { wordsLocale } from '../../words/words-locale.js'

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
  /**
   * Every key the item with that key moves among, the ones a filter hides
   * included, for a drop the controller asks for itself. `keys` where this is
   * not given.
   */
  all?: (key: string) => readonly string[]

  /** Which way the items run: rows down the block axis, or columns along the inline one. */
  axis: ReorderAxis

  /** The box an item is drawn in, or nothing for one a window did not draw. */
  box: (key: string) => DOMRect | undefined

  /**
   * Called when an item is let go at a new place. Returns whether the move
   * stood: `false` where a listener refused it.
   *
   * Where this is not given, the controller asks the page itself, from the
   * host: `helix-before-reorder`, then `helix-reorder`, with `kind` and
   * every key of `all` in the new order, joined by commas in `value`. A key a
   * filter hides keeps its place, as `placeKey` says.
   */
  drop?: (move: ReorderMove) => boolean

  /**
   * The key of the item a key pressed in the host stands for: the one with
   * focus, or the one `aria-activedescendant` names. Alt with Up or Down then
   * moves that item a place at once, and Alt with Home or End to either end,
   * as the rearrangeable listbox of the APG does, with no grip and nothing
   * held. Alt with an arrow moves nothing where this is not given.
   */
  current?: (event: KeyboardEvent) => string | undefined

  /**
   * Whether an item may be moved now. Where this is not given, the host's own
   * `reorderable` says, and every item may on a host without one.
   */
  enabled?: () => boolean

  /**
   * The grip an event passed through, and the key of the item it moves, or
   * nothing for an event that passed through none.
   */
  grip: (event: Event) => { element: HTMLElement; key: string } | undefined

  /**
   * Whether a key or a click holds the item for the arrow keys. `true` where
   * this is not given. Data Table's columns move a place for each arrow on the
   * grip and say `false`, so they are only dragged. A listbox's options say
   * `false` too: the whole option is what a pointer drags, and a click on it
   * still chooses it.
   */
  holds?: boolean

  /**
   * The key of the item an event passed through, anywhere in it. A click there
   * drops a held item at that place, which is the move a single pointer makes
   * without a drag.
   */
  item?: (event: Event) => string | undefined

  /** What a drop the controller asks for itself moves: `item`, the default, or `row`. */
  kind?: ReorderDetail['kind']

  /**
   * The keys of the items the item with that key moves among, in the order
   * they are drawn: every item of a list, or the item's siblings in a tree.
   */
  keys: (key: string) => readonly string[]

  /** An item's name, for the words. */
  name?: (key: string) => string

  /**
   * The element a pointer drag copies for the drag preview: a copy of what it
   * draws follows the pointer, raised over the page, until the item is let go
   * or Escape puts it back. A move made with the keys draws none. No preview
   * is drawn where this is not given.
   *
   * The copy is drawn in the host's `drag-preview` part, which the host's
   * template draws with `drawDragPreview`: a manual popover in its shadow
   * root, hidden from assistive technology, shown in the top layer so no
   * scrolling box clips it. The host's stylesheet gives it its look. No
   * preview is drawn where the host draws no such part.
   */
  preview?: (key: string) => Element | null | undefined

  /**
   * Gives focus back to the item with that key, called after a move made from
   * the keyboard stood, once the page has moved the item and focus went to the
   * body with it. Focus the page put anywhere else is left there. Focus is left
   * alone where this is not given.
   */
  refocus?: (key: string) => void

  /**
   * Speaks words in the host's live region. Where this is not given, the
   * words go to the host's `announced`, the region a collection draws, where
   * it has one, and nowhere otherwise.
   */
  say?: (words: string) => void

  /**
   * The box to scroll while a dragged item nears one of its edges, or `null`
   * for the window. Where this is not given, rows down the block axis scroll
   * the nearest box around the host's first child that scrolls that way and
   * has more to show, or the window, and items along the inline axis scroll
   * nothing.
   */
  scroller?: () => HTMLElement | null

  /**
   * The words a screen reader hears. Where this is not given, they are the
   * host's own `canceledLabel`, `droppedLabel`, `movedLabel`, and
   * `pickedUpLabel`, which is what a family declares them as.
   */
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
  host.dispatchEvent(new HelixReorderEvent({ ...detail, keys: [...detail.keys] }))
  return true
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
 * - **Alt with an arrow** moves the item focus is on a place at once, where
 *   the host says which item that is with `current`. A collection whose own
 *   keys are the arrows, Enter, and Space, such as a listbox or a tree, moves
 *   its items this way.
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

  /** The copy of the dragged item that follows the pointer, while one is drawn. */
  private shown: HTMLElement | undefined = undefined

  /** Where the pointer went down on the item the preview copies. */
  private anchor = { x: 0, y: 0 }

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
    const key = at && held && this.options.keys(held.key)[at.index]
    return at && key !== undefined ? { edge: at.edge, key } : undefined
  }

  /**
   * Where the item with that key stands in a move, for the host to mark it:
   * the item held, the item the drop indicator is before or after, or nothing.
   */
  moveOf(key: string): 'dragging' | 'drop-after' | 'drop-before' | undefined {
    const mark = this.mark
    return this.held?.key === key ? 'dragging' : mark?.key === key ? `drop-${mark.edge}` : undefined
  }

  /**
   * The `drag-preview` part, for the host's template: an empty manual popover
   * while items may be moved, which a pointer drag fills and shows.
   */
  drawDragPreview(): TemplateResult | typeof nothing {
    return drawDragPreview(this.enabled())
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
    this.lower()
    this.awaiting?.disconnect()
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
    if (next.phase !== 'held') {
      this.lower()
    }
    if (next.phase === 'held') {
      if (before.phase !== 'held') {
        if (next.by === 'keyboard') {
          this.speak('pickedUp', next.key)
        } else {
          if (before.phase === 'pressed') {
            this.lift(next.key, before)
          }
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
      const stood = !moved || this.drop({ from: next.from, key: next.key, to: next.to })
      this.speak(stood ? 'dropped' : 'canceled', next.key)
      if (moved && stood && next.by === 'keyboard') {
        this.follow(next.key)
      }
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

  /** Asks for a move: through `drop`, or of the page where the host gives none. */
  private drop(move: ReorderMove): boolean {
    if (this.options.drop) {
      return this.options.drop(move)
    }
    const { key, to } = move
    const shown = this.options.keys(key)
    const keys = placeKey(this.options.all?.(key) ?? shown, shown, key, to)
    return requestReorder(this.host, {
      ...move,
      keys,
      kind: this.options.kind ?? 'item',
      to: keys.indexOf(key),
      value: keys.join(','),
    })
  }

  /** Says one of the words, with the item's name and place filled in. */
  private speak(which: keyof ReorderWords, key: string, to?: number): void {
    const { name, words } = this.options
    const host = this.host as unknown as { announced?: string }
    const say =
      this.options.say ??
      ('announced' in host
        ? (said: string): void => {
            host.announced = said
            this.host.requestUpdate()
          }
        : undefined)
    if (!say) {
      return
    }
    /* Numbers go in as numbers, so the message writes them in the host's
       locale and a translation can pick a plural form by them. */
    const values = {
      count: this.options.keys(key).length,
      name: name ? name(key) : key,
      position: (to ?? 0) + 1,
    }
    say(
      words
        ? formatMessage(words()[which], values, wordsLocale(this.host))
        : formatWords(this.host as unknown as ReactiveElement, `${which}Label`, values),
    )
  }

  /** The place among the others that the pointer is over, for the item with that key. */
  private placeAt(key: string, x: number, y: number): number {
    const block = this.options.axis === 'block'
    const reversed = !block && isRtl(this.host)
    const spans = this.options
      .keys(key)
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
    return this.options.enabled?.() ?? (this.host as { reorderable?: boolean }).reorderable ?? true
  }

  /** The page's own watch for the move it was asked for, while one is awaited. */
  private awaiting: MutationObserver | undefined = undefined

  /**
   * Gives focus back to a moved item once the page has moved it, where moving
   * it sent focus to the body. A page that moves the item as it hears
   * `helix-reorder` has done so already; one that renders later changes the
   * host's children first.
   */
  private follow(key: string): void {
    const refocus = this.options.refocus
    this.awaiting?.disconnect()
    const lost = (): boolean => {
      const active = deepActiveElement()
      return !active || active === document.body
    }
    if (!refocus) {
      return
    }
    if (lost()) {
      refocus(key)
      return
    }
    const watch = new MutationObserver(() => {
      watch.disconnect()
      if (lost()) {
        refocus(key)
      }
    })
    watch.observe(this.host, { childList: true, subtree: true })
    this.awaiting = watch
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
    const from = grip ? this.options.keys(grip.key).indexOf(grip.key) : -1
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
    this.glide()
  }

  /**
   * Draws the drag preview: a copy of the item, where it is, in the host's
   * `drag-preview` part, shown in the top layer. Measured before the host
   * draws the item as dragged, so the copy is the item as it was.
   */
  private lift(key: string, from: { x: number; y: number }): void {
    const element = this.options.preview?.(key)
    const root = (this.host as { renderRoot?: ParentNode }).renderRoot ?? this.host.shadowRoot
    const preview = root?.querySelector<HTMLElement>('[part="drag-preview"]')
    if (!element || !preview) {
      return
    }
    const box = boxOf(element)
    preview.style.cssText = `inset:auto;left:${box.left}px;top:${box.top}px;width:${box.width}px;height:${box.height}px;margin:0;padding:0;overflow:clip;pointer-events:none`
    preview.replaceChildren(...dragPreviewOf(element, true, box))
    preview.showPopover?.()
    this.shown = preview
    this.anchor = from
    this.glide()
  }

  /** Moves the drag preview with the pointer. */
  private glide(): void {
    this.shown?.style.setProperty(
      'translate',
      `${this.pointer.x - this.anchor.x}px ${this.pointer.y - this.anchor.y}px`,
    )
  }

  /** Takes the drag preview away: hides the part and empties it. */
  private lower(): void {
    this.shown?.hidePopover?.()
    this.shown?.replaceChildren()
    this.shown = undefined
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
      swallowClick()
    }
  }

  private readonly handleCancel = (): void => {
    this.send({ type: 'cancel' })
  }

  /**
   * Escape while a pointer drags puts the item back. Heard on the window,
   * since focus may be anywhere while a pointer drags, and kept from the page,
   * so a dialog the list is in stays open.
   */
  private readonly handleEscape = (event: KeyboardEvent): void => {
    const state = this.state
    if (event.key === 'Escape' && state.phase === 'held' && state.by === 'pointer') {
      event.preventDefault()
      event.stopPropagation()
      this.send({ type: 'cancel' })
      /* The pointer is still down, and the click its release raises would
         take hold of the item again. */
      window.addEventListener('pointerup', swallowClick, { once: true })
    }
  }

  /** Starts or stops hearing the pointer on the window, and the scrolling with it. */
  private listen(on: boolean): void {
    if (on) {
      window.addEventListener('pointermove', this.handleMove)
      window.addEventListener('pointerup', this.handleUp)
      window.addEventListener('pointercancel', this.handleCancel)
      window.addEventListener('keydown', this.handleEscape, true)
      return
    }
    window.removeEventListener('pointermove', this.handleMove)
    window.removeEventListener('pointerup', this.handleUp)
    window.removeEventListener('pointercancel', this.handleCancel)
    window.removeEventListener('keydown', this.handleEscape, true)
    if (this.frame) {
      cancelAnimationFrame(this.frame)
      this.frame = 0
    }
  }

  /** Scrolls the box while the dragged item is near one of its edges, a frame at a time. */
  private scroll(): void {
    const block = this.options.axis === 'block'
    const scroller =
      this.options.scroller ??
      (block
        ? () =>
            scrollingAncestor((this.host.firstElementChild as HTMLElement | null) ?? this.host, {
              axis: 'y',
              overflowing: true,
            })
        : undefined)
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
      const from = grip ? this.options.keys(grip.key).indexOf(grip.key) : -1
      if (grip && from >= 0) {
        this.take(grip.element, { from, key: grip.key, type: 'pick' })
      }
      return
    }
    if (state.phase !== 'held' || state.by !== 'keyboard') {
      return
    }
    const on = grip?.key ?? this.options.item?.(event)
    const keys = this.options.keys(state.key)
    if (on === undefined || !keys.includes(on)) {
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
      event.detail > 0 ? this.placeAt(state.key, event.clientX, event.clientY) : keys.indexOf(on)
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
    if (event.ctrlKey || event.metaKey) {
      return
    }
    const state = this.state
    if (event.altKey) {
      if (state.phase === 'idle' && !event.shiftKey) {
        this.nudge(event)
      }
      return
    }
    if (this.options.holds === false) {
      return
    }
    const origin = event.composedPath()[0]
    const native = origin instanceof HTMLButtonElement
    const press = event.key === 'Enter' || event.key === ' '
    if (state.phase === 'idle') {
      const grip = press && !native && this.enabled() ? this.options.grip(event) : undefined
      const from = grip ? this.options.keys(grip.key).indexOf(grip.key) : -1
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
      count: this.options.keys(state.key).length,
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
   * Alt with an arrow, Home, or End: moves the item the key stands for at
   * once, with nothing held, and says where it went. A move the page refuses
   * is said as canceled. At an end the key is kept and nothing moves.
   */
  private nudge(event: KeyboardEvent): void {
    const key = this.enabled() ? this.options.current?.(event) : undefined
    const keys = key === undefined ? [] : this.options.keys(key)
    const from = key === undefined ? -1 : keys.indexOf(key)
    const to =
      key === undefined || from < 0
        ? null
        : reorderKey(event.key, {
            axis: this.options.axis,
            count: keys.length,
            rtl: isRtl(this.host),
            to: from,
          })
    if (key === undefined || to === null) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    if (to !== from) {
      const stood = this.drop({ from, key, to })
      this.speak(stood ? 'moved' : 'canceled', key, to)
      if (stood) {
        this.follow(key)
      }
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

/** Keeps the click a pointer's release raises, if one comes at once, from the page. */
const swallowClick = (): void => {
  window.addEventListener('click', swallow, { capture: true, once: true })
  setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 0)
}
