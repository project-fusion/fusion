import {
  customElement,
  HelixChangeEvent,
  HelixElement,
  requestControlledChange,
} from '@helix-io/core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary Two panes and a divider the reader can move.
 *
 * @description
 * **One axis, and nesting is how you get two.** The sandbox this was taken from
 * moves a cross: a divider down the middle, another across the bottom, and a
 * corner that moves both. That is a layout rather than a component, and every
 * part of it that is worth sharing is one divider between two panes. A splitter
 * inside a splitter gives the cross back, and gives the three-pane and the
 * four-pane arrangements it never had.
 *
 * **The divider is a real `role="separator"` with `aria-valuenow`, moved by the
 * arrow keys as well as by pointer.** A divider only a mouse can move is
 * unusable without one, which is the reason the sandbox's carries the same, and
 * `Home` and `End` take it to its bounds.
 *
 * **It goes where it is put, all the way to either end.** `min` and `max` are
 * nothing and everything unless a consumer says otherwise, because a divider
 * that stops dead short of the edge gives a reader no way to put a pane away.
 * Where a pane should keep a sliver of itself, only whoever put the tabs on it
 * knows how much, so they say so.
 *
 * **The box is measured once, when a drag starts.** Measuring per move is a
 * forced layout on every pointer event, in the middle of a gesture whose whole
 * job is to stay ahead of the pointer, and nothing about the box moves while the
 * divider does.
 *
 * **`helix-change` fires when it settles, not while it moves.** A drag is a
 * stream of positions and only the one it ends at is a preference; announcing
 * each would ask a consumer to write to storage a hundred times to record one
 * decision. Nothing is stored here either: where a preference lives, and whether
 * it should be kept at all, is the consumer's to decide, and a component writing
 * to storage on its own would be deciding for all of them under a key it chose.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases SplitPane, Resizable, SplitView
 * @documentation https://helix.fusion.dev/components/splitter
 *
 * @slot start - The pane before the divider.
 * @slot end - The pane after it.
 *
 * @event {HelixChangeEvent} helix-change - Fired when the divider settles, with the position.
 *
 * @csspart start - The box holding the first pane.
 * @csspart end - The box holding the second.
 * @csspart separator - The divider itself.
 */
@customElement('helix-base-splitter')
export class HelixBaseSplitter extends HelixElement {
  /**
   * Which way the panes are laid out.
   *
   * `horizontal` is side by side with an upright divider between them, and
   * `aria-orientation` on that divider is therefore `vertical`: a separator's
   * orientation is the direction it is *drawn* in, not the axis it moves along,
   * so the two words are opposite each other here on purpose. The code had this
   * right and the sentence beside it said the reverse.
   *
   * Unset is horizontal and stays unset, so a reflected default cannot appear on
   * a host whose server output never had it.
   */
  @property({ reflect: true })
  orientation?: 'horizontal' | 'vertical'

  /**
   * Where the divider sits, as a percentage of the whole.
   *
   * Reading gives where it is; writing declares it the consumer's, and
   * `default-position` seeds one this element owns. The same accessor pair
   * `Pagination.page` and the calendar's `month` carry.
   */
  @property({ type: Number })
  get position(): number {
    return this.clamp(this.positionState ?? this.defaultPosition)
  }

  set position(next: number) {
    const previous = this.position
    this.positionState = next
    this.requestUpdate('position', previous)
  }

  /** Where the divider starts, where nothing declared it. */
  @property({ attribute: 'default-position', type: Number })
  defaultPosition = 50

  /** Nearest the divider may come to the start, as a percentage. */
  @property({ type: Number })
  min = 0

  /** Nearest it may come to the end. */
  @property({ type: Number })
  max = 100

  /** How far one arrow press moves it, as a percentage. */
  @property({ type: Number })
  step = 2

  /** Accessible name for the divider. */
  @property()
  label = 'Resize panes'

  /** The position, whoever set it, and `undefined` until somebody has. */
  private positionState: number | undefined = undefined

  /** Whether the consumer owns it, decided once and then fixed. */
  private positionMode: boolean | undefined = undefined

  private get positionIsControlled(): boolean {
    return this.positionMode === true
  }

  /** Where the divider was when the element first rendered, for a reset. */
  private initial: number | undefined = undefined

  /**
   * The host's box, measured once when a drag starts.
   *
   * Measuring per move is a forced layout on every pointer event, in the middle
   * of a gesture whose whole job is to stay ahead of the pointer. Nothing about
   * it moves while the divider does.
   */
  private origin: { length: number; start: number } | null = null

  /** Pulled between the bounds, which are the ends unless a consumer moved them. */
  private clamp(next: number): number {
    const min = Math.max(0, Math.min(100, this.min))
    const max = Math.max(min, Math.min(100, this.max))
    return Math.min(max, Math.max(min, Number.isFinite(next) ? next : min))
  }

  private get vertical(): boolean {
    return this.orientation === 'vertical'
  }

  /**
   * Asks to move, and applies it where the position is this element's to move.
   *
   * Not announced per step: `helix-change` is the settling, below. A drag that
   * announced every position would be asking a consumer to record a hundred
   * decisions to keep one.
   */
  private move(next: number): void {
    const wanted = this.clamp(next)
    if (wanted === this.position || this.positionIsControlled) {
      return
    }
    const previous = this.position
    this.positionState = wanted
    this.requestUpdate('position', previous)
  }

  /**
   * Says the arrangement has settled, so a consumer can keep it.
   *
   * Through the audited path, so a consumer who owns `position` is told what was
   * asked for and decides, and one who does not has already had it applied.
   */
  private settle(next: number): void {
    const wanted = this.clamp(next)
    requestControlledChange({
      apply: (value) => {
        if (this.positionIsControlled) {
          return
        }
        const previous = this.position
        this.positionState = value
        this.requestUpdate('position', previous)
      },
      controlled: this.positionIsControlled,
      event: (value) => new HelixChangeEvent({ name: 'position', value: String(value) }),
      host: this,
      label: 'position',
      next: wanted,
      read: () => this.position,
    })
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    const separator = event.currentTarget as HTMLElement
    const box = this.getBoundingClientRect()
    this.origin = this.vertical
      ? { length: box.height, start: box.top }
      : { length: box.width, start: box.left }
    /* Captured, so the divider keeps the pointer once it has it: a drag that
       outruns a thin target otherwise ends the moment the pointer leaves it,
       which on a fast gesture is immediately. */
    separator.setPointerCapture(event.pointerId)
    event.preventDefault()
  }

  private readonly handlePointerMove = (event: PointerEvent): void => {
    const origin = this.origin
    if (!origin || origin.length === 0) {
      return
    }
    const along = this.vertical ? event.clientY : event.clientX
    /* Signed against the writing direction, because a pointer is physical and
       the panes are not: in a right-to-left document the start pane is on the
       right, so dragging right makes it *larger*. */
    const raw = ((along - origin.start) / origin.length) * 100
    const rtl = !this.vertical && getComputedStyle(this).direction === 'rtl'
    this.move(rtl ? 100 - raw : raw)
  }

  private readonly handlePointerUp = (event: PointerEvent): void => {
    if (!this.origin) {
      return
    }
    const separator = event.currentTarget as HTMLElement
    if (separator.hasPointerCapture(event.pointerId)) {
      separator.releasePointerCapture(event.pointerId)
    }
    this.origin = null
    this.settle(this.position)
  }

  /**
   * The keys a separator answers.
   *
   * Both axes, always, which is the same call `KeyboardNavigationController`
   * makes for a set of items: a reader who guesses the wrong arrow on a divider
   * gets nothing, and the orientation is a fact about the layout rather than
   * about which keys should work.
   */
  private readonly handleKeydown = (event: KeyboardEvent): void => {
    const back = this.vertical ? 'ArrowUp' : 'ArrowLeft'
    const forward = this.vertical ? 'ArrowDown' : 'ArrowRight'
    let next: number
    if (event.key === back) {
      next = this.position - this.step
    } else if (event.key === forward) {
      next = this.position + this.step
    } else if (event.key === 'Home') {
      next = this.min
    } else if (event.key === 'End') {
      next = this.max
    } else {
      return
    }
    this.move(next)
    this.settle(next)
    // Or the arrows scroll the page under the divider being moved.
    event.preventDefault()
  }

  /** Puts the divider back where the markup put it. */
  private readonly handleDoubleClick = (): void => {
    if (this.initial === undefined) {
      return
    }
    this.move(this.initial)
    this.settle(this.initial)
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    // Only the first time, before anything reads it. See `MixinControllerOpen`.
    if (this.positionMode === undefined) {
      this.positionMode = this.positionState !== undefined
    }
    if (this.initial === undefined) {
      this.initial = this.position
    }
  }

  protected override render(): TemplateResult {
    const position = this.position
    return html`<div part="start" style="--_splitter-position: ${position}%">
        <slot name="start"></slot>
      </div>
      <div
        part="separator"
        role="separator"
        tabindex="0"
        aria-label=${this.label}
        aria-orientation=${this.vertical ? 'horizontal' : 'vertical'}
        aria-valuemax=${this.clamp(this.max)}
        aria-valuemin=${this.clamp(this.min)}
        aria-valuenow=${Math.round(position)}
        @dblclick=${this.handleDoubleClick}
        @keydown=${this.handleKeydown}
        @pointercancel=${this.handlePointerUp}
        @pointerdown=${this.handlePointerDown}
        @pointermove=${this.handlePointerMove}
        @pointerup=${this.handlePointerUp}
      ></div>
      <div part="end"><slot name="end"></slot></div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-splitter': HelixBaseSplitter
  }
}
