import {
  CountdownController,
  customElement,
  drawDismiss,
  drawDismissGlyph,
  HelixElement,
  hostAria,
  isRtl,
  MixinDismissible,
  requestChange,
  SwipeController,
  settleSwipe,
  swipeEdge,
  type ToneMark,
  toneMark,
  towardEdge,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'

/**
 * @summary One message in the toast region.
 *
 * @description
 * Each message is an element because it has a timeout, a tone, a dismiss
 * control, and a lifetime that pauses.
 *
 * **Each item runs its own timer.** A timer held by the region would restart
 * with each new message, and the last of three messages would stay for nine
 * seconds. It pauses while the pointer or focus is on the message, and while
 * the page is hidden, so a message is not spent in a background tab.
 *
 * **Each message is an `alertdialog` named by its words**, which is how a reader
 * who moves into the stack hears which message they are on. Give it a
 * `heading` and a `description`, and the heading names it and the description
 * describes it, for a message with a title and a line of detail. The region
 * says each message once as it arrives, a `danger` one assertively, so a
 * message is never a live region of its own.
 *
 * A touch or a pen swipes a message toward the end of the line, and past
 * halfway, or quickly, dismisses it through the same `helix-dismiss` as its
 * control. While it moves, the distance is on the `item` part as
 * `--toast-swipe-x`.
 *
 * **Messages are inverted by default.** The item flips `color-scheme`, so a new
 * message stands out from the page without using a color that carries meaning.
 *
 * @since 0.1.0
 * @status stable
 * @documentation https://fusion.dev/helix/components/toast
 *
 * @slot - The message.
 * @slot actions - Actions for the message, usually a button or a link.
 * @slot description - A line of detail under the heading, which describes the message.
 * @slot dismiss-icon - Replaces the glyph inside the dismiss control.
 * @slot heading - The message's title, which names it.
 * @slot icon - Replaces the tone mark. The name matches `Callout`. The dismiss
 *   control's glyph uses `dismiss-icon`, because two slots cannot share a name:
 *   content goes to whichever slot comes first in the tree, and the tone mark is
 *   the one you are more likely to replace.
 *
 * @event {HelixDismissEvent} helix-dismiss - Fired when the message is dismissed, by the control or by its timer, and cancelable. Canceling it keeps the message.
 *
 * @csspart actions - The region that holds the actions.
 * @csspart content - The message.
 * @csspart description - The slot the description is in. It draws no box until you give it one.
 * @csspart dismiss - The control that dismisses the message.
 * @csspart dismiss-mark - The glyph on the dismiss control, where none is slotted.
 * @csspart heading - The slot the heading is in. It draws no box until you give it one.
 * @csspart icon - The tone mark, where the message has one.
 * @csspart icon-mark - The tone glyph, where none is slotted.
 * @csspart item - The message's own surface.
 * @csspart timer - The bar showing how long is left, where a duration was given.
 *
 * @cssproperty --toast-duration - How long this message stays, in milliseconds, for a progress hint.
 * @cssproperty --toast-swipe-x - How far a swipe has moved the message across, in pixels, toward the right.
 */
@customElement('helix-headless-toast-item')
export class HelixHeadlessToastItem extends MixinDismissible(HelixElement) {
  /**
   * How long the message stays, in milliseconds. When it is not set, the
   * message stays until it is dismissed.
   *
   * Read once when the item is first rendered. Changing it afterwards does not
   * restart a message the reader is already partway through.
   */
  @property({ type: Number })
  duration?: number

  /**
   * Whether the message is still showing.
   *
   * The item always applies: it goes when it is asked to, having announced
   * `helix-dismiss` first, and a consumer who owns the list refuses that event
   * to take the decision instead.
   *
   * **No `default-open`, unlike the four mixins.** A `default-` seed exists so
   * markup can choose a starting state without claiming ownership, and there is
   * only one starting state that makes sense: a message that has been rendered
   * is showing. An attribute whose only legal value is the default is an
   * attribute nobody can use.
   */
  @property({ type: Boolean })
  get open(): boolean {
    return this.openState ?? true
  }

  set open(next: boolean) {
    const previous = this.open
    this.openState = next
    this.requestUpdate('open', previous)
  }

  /* Swiped toward the end of the line to dismiss. Touch and pen only: a
     mouse drags to select the message's text. */
  protected readonly swipes = new SwipeController(this, {
    axis: () => (this.open ? 'x' : undefined),
    end: (dx, _dy, vx) => {
      const edge = swipeEdge('end', isRtl(this))
      const width = this.partNamed('item')?.getBoundingClientRect().width ?? 0
      const shown = settleSwipe({
        points: [1],
        size: width,
        travel: Math.max(0, towardEdge(edge, dx, 0)),
        velocity: towardEdge(edge, vx, 0),
      })
      if (shown === 0 && this.dismiss()) {
        return
      }
      this.slide(0)
    },
    move: (dx) => this.slide(Math.max(0, towardEdge(swipeEdge('end', isRtl(this)), dx, 0))),
    start: (_target, event) => event.pointerType !== 'mouse',
    surface: () => this.partNamed('item'),
  })

  /** Writes how far a swipe has moved the message toward the end of the line. */
  private slide(travel: number): void {
    const physical = isRtl(this) ? -travel : travel
    this.partNamed('item')?.style.setProperty(
      '--toast-swipe-x',
      travel === 0 ? '' : `${Math.round(physical)}px`,
    )
  }

  /**
   * The dismiss timer, which pauses while a reader is on the message, and
   * while the page is hidden, and continues from what was left. A message that
   * arrives in a background tab waits for the reader to come back, as React
   * Aria's toast queue does.
   *
   * Paused is said on the host so the indicator can freeze with the clock. A
   * `data-` attribute rather than a property, because it is written after
   * upgrade from a pointer moving: nothing declares it and no server rendered
   * it, which is the same reason `Carousel` names its slides from here.
   */
  private readonly countdown = new CountdownController(this, {
    done: () => {
      this.dismiss()
    },
    holdWhileHidden: true,
    paused: (paused) => {
      this.toggleAttribute('data-paused', paused)
    },
  })

  /**
   * The kind of message, which sets its mark and the mark's accessible name.
   *
   * A subset of the tone axis: a toast reports a status and never a brand role.
   */
  @property({ reflect: true })
  tone?: 'danger' | 'info' | 'success' | 'warning'

  /** Whether it is showing, whoever said so, and `undefined` until somebody has. */
  private openState: boolean | undefined = undefined

  /**
   * Dismisses the message, and returns whether the dismissal went ahead.
   *
   * Announced before anything happens, so `preventDefault()` is a refusal and
   * the message stays. The event still carries the label, because a consumer
   * removing this from their own state has to know which one went, and that is
   * true whether or not the item hid itself first.
   */
  override dismiss(): boolean {
    if (!this.open) {
      return true
    }
    /* The clock stops either way. A timer left running on a message that has
       gone would fire into nothing, and would hold the item alive until it
       did. */
    this.countdown.cancel()
    return requestChange({
      apply: () => {
        const previous = this.open
        this.openState = false
        this.requestUpdate('open', previous)
      },
      /* `helix-dismiss` answers a controlled `open`, which reads oddly and is
         exact. A toast is not an overlay that opens and closes: `next` below is
         `false` and nothing here ever calls `requestOpen(true)`, so it only
         ever asks in one direction, and the verb for that direction is
         `dismiss`. A consumer controlling `open` therefore answers
         `onhelix-dismiss`, and the generated types ask for exactly that. */
      event: () => this.dismissEvent(),
      host: this,
      next: false,
    })
  }

  /** Pauses the dismiss timer and keeps the time that is left. */
  pause(): void {
    this.countdown.pause()
  }

  /** Restarts the dismiss timer from where it paused. */
  resume(): void {
    this.countdown.resume()
  }

  /* Arrows, so `this` is the item wherever the listener ends up. Lit does bind
     a template listener to its host, and relying on that puts a load-bearing
     fact about a library in a place nobody reading this file would look. Hover
     and focus are counted by the countdown, so only the last one out starts the
     clock again. */
  private readonly handlePause = (): void => {
    this.countdown.hold()
  }

  private readonly handleResume = (): void => {
    this.countdown.release()
  }

  override connectedCallback(): void {
    super.connectedCallback()
    /* The clock again after a move, from what was left of it: the disconnect
       paused it, and `firstUpdated` happens once, so a message a framework
       moved stayed on screen for good. */
    if (this.hasUpdated && this.open) {
      this.resume()
    }
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    /* Mirrored for CSS rather than reflected onto `open` itself, which is the
       library's rule about state: a reflected `open` is indistinguishable from
       one the consumer declared, and that attribute is what ownership is read
       from. `data-closed` can never be mistaken for a declaration. */
    /* **`data-closed`, because open is the resting state.** A toast opens by
       default, so a `data-open` would appear on a consumer's server-rendered
       `<helix-headless-toast-item>` without React having sent it. Inverting keeps the
       `data-` hook for the headless consumer this publishes it for, and moves
       the write to the side that only happens after somebody dismisses the
       message, which is long past hydration. */
    this.toggleAttribute('data-closed', !this.open)
    /* And `hidden` beside it, because `data-closed` is a hook and not a
       mechanism. With the hiding living only in the styled sheet's
       `opacity: 0` and `visibility: hidden`, a consumer on this tier has a
       dismissed message that never goes away: measured, a closed base toast
       printed its text on the page.
       It costs the styled tier nothing, the same as the accordion: `:host` sets
       `display: grid` unconditionally so the author rule beats the UA sheet,
       and the exit still animates its row down from `1fr`. */
    this.toggleAttribute('hidden', !this.open)
    /* A dialog a reader can move into, named by its words. Through internals,
       so nothing is written onto the consumer's element. Not a live region:
       the region says the message as it arrives, in the voice of its tone. */
    hostAria(this.internals, { role: 'alertdialog' })
    this.internals.ariaModal = 'false'
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.name()
  }

  /** The elements assigned to one of the message's named slots. */
  private assigned(name: string): Element[] {
    return (
      this.renderRoot
        ?.querySelector<HTMLSlotElement>(`slot[name="${name}"]`)
        ?.assignedElements({ flatten: true }) ?? []
    )
  }

  /**
   * Names the message by its heading and describes it by its description,
   * where it has them, and otherwise names it by all its words.
   */
  private readonly name = (): void => {
    const words = this.partNamed('content')
    if (!words) {
      return
    }
    const heading = this.assigned('heading')
    hostAria(this.internals, {
      describedBy: this.assigned('description'),
      labelledBy: heading.length > 0 ? heading : [words],
    })
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    /* Here rather than in `connectedCallback`, which the server never calls, and
       started only once: the clock belongs to this message's life on screen. */
    this.countdown.start(this.duration)
  }

  /**
   * The mark for the message's tone, behind a seam.
   *
   * Slot fallback, so a consumer replaces it by slotting; and a method, so the
   * tier above replaces it by overriding. Those answer different people: the
   * slot is for the page and the method is for whoever is building the styled
   * layer, and a fallback with only the first is one a tier can restyle and
   * cannot change.
   *
   * The mark is passed in rather than looked up again, since `render` has
   * already resolved the tone and a second lookup is a second place for the
   * fallback to disagree with the tone around it.
   */
  protected renderIcon(mark: ToneMark): TemplateResult {
    return html`<slot name="icon">
      <svg part="icon-mark"
        fill="currentColor"
        viewBox=${mark.icon.viewBox}
        role="img"
        aria-label=${mark.label}
      >
        ${unsafeSVG(mark.icon.content)}
      </svg>
    </slot>`
  }

  /**
   * The mark on the dismiss control, behind a seam.
   *
   * Slot fallback, so a consumer replaces it by slotting; and a method, so the
   * tier above replaces it by overriding. Those answer different people: the
   * slot is for the page and the method is for whoever is building the styled
   * layer, and a fallback with only the first is one a tier can restyle and
   * cannot change.
   */
  protected renderDismissIcon(): TemplateResult {
    return html`<slot name="dismiss-icon">
      ${drawDismissGlyph()}
    </slot>`
  }

  protected override render(): TemplateResult {
    /* Nothing when no tone was given, which is the common message: "Project
       saved" is not an error, a warning or an announcement, and an icon there
       would be decoration standing where meaning is supposed to be. `Callout`
       falls back to `info` because a callout exists to set a passage apart and
       is always *about* something; a toast is just the next thing that
       happened. */
    const mark = toneMark(this.tone)

    return html`<div
      part="item"
      @mouseenter=${this.handlePause}
      @mouseleave=${this.handleResume}
      @focusin=${this.handlePause}
      @focusout=${this.handleResume}
    >
      ${
        mark
          ? html`<span part="icon">
              ${this.renderIcon(mark)}
            </span>`
          : nothing
      }
      <div part="content">
        <slot name="heading" part="heading" @slotchange=${this.name}></slot>
        <slot name="description" part="description" @slotchange=${this.name}></slot>
        <slot></slot>
      </div>
      <div part="actions"><slot name="actions"></slot></div>
      ${
        this.dismissible
          ? drawDismiss({
              label: this.dismissLabel,
              mark: this.renderDismissIcon(),
              onDismiss: () => this.dismiss(),
            })
          : nothing
      }
      ${
        this.duration
          ? html`<div
              part="timer"
              style=${`--toast-duration: ${this.duration}ms`}
              aria-hidden="true"
            ></div>`
          : nothing
      }
    </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-toast-item': HelixHeadlessToastItem
  }
}
