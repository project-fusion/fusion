import {
  customElement,
  HelixElement,
  MixinDismissible,
  requestChange,
  type ToneMark,
  toneMark,
} from '@fusion.dev/helix-core'
import { x } from '@fusion.dev/helix-icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'

/**
 * @summary One message in the toast region.
 *
 * @description
 * An element rather than a slot, because it carries a timeout, a tone, a
 * dismiss control and a lifetime that pauses: behavior, state and API.
 *
 * **The timer is the item's own.** Held by the region, one message arriving
 * would restart another's, so a stack of three would go from three seconds each
 * to nine for the last.
 *
 * **A message is the opposite of the page it is over.** Inverted by default, so
 * a thing arriving in a corner is told apart from the page before it is read,
 * and by a flip of `color-scheme` rather than by spending a color that means
 * something.
 *
 * @since 0.1.0
 * @status experimental
 * @documentation https://helix.fusion.dev/components/toast
 *
 * @slot - The message.
 * @slot actions - What to do about it, usually a button or a link.
 * @slot dismiss-icon - Replaces the glyph inside the dismiss control.
 * @slot icon - Replaces the tone mark. Matches `Callout`, which is why the
 *   dismiss control's own glyph is `dismiss-icon` rather than this: two slots
 *   cannot share a name, assignment goes to whichever comes first in the tree,
 *   and the tone mark is the one a consumer reaches for.
 *
 * @event {HelixDismissEvent} helix-dismiss - Fired when it asks to go, whether by the control or by its timer. Cancelable: refusing it takes the decision and nothing moves.
 *
 * @csspart actions - The region holding what to do about it.
 * @csspart content - The message.
 * @csspart dismiss - The control that asks to close.
 * @csspart dismiss-mark - The glyph on the dismiss control, where none is slotted.
 * @csspart icon - The tone mark, where the message has one.
 * @csspart icon-mark - The tone glyph, where none is slotted.
 * @csspart item - The message's own surface.
 * @csspart timer - The bar showing how long is left, where a duration was given.
 *
 * @cssproperty --toast-duration - How long this message stays, in milliseconds, for a progress hint.
 */
@customElement('helix-headless-toast-item')
export class HelixHeadlessToastItem extends MixinDismissible(HelixElement) {
  /**
   * How long it stays, in milliseconds. Absent means until it is dismissed.
   *
   * Read once when the item is first rendered. Changing it afterwards does not
   * restart a message the reader is already partway through.
   */
  @property({ type: Number })
  duration?: number

  /**
   * What kind of message it is, which picks the mark and its name.
   *
   * A subset of the tone axis: a toast reports a status and never a brand role.
   */
  @property({ reflect: true })
  tone?: 'danger' | 'info' | 'success' | 'warning'

  /** When the current run of the timer began, or nothing while it is paused. */
  private startedAt: number | undefined

  /** What is left of the duration, so resuming continues rather than restarts. */
  private remaining: number | undefined

  private timer: ReturnType<typeof setTimeout> | undefined

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

  /** Whether it is showing, whoever said so, and `undefined` until somebody has. */
  private openState: boolean | undefined = undefined

  /**
   * Asks to be taken away, and reports whether the request stood.
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
    clearTimeout(this.timer)
    this.timer = undefined
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

  /** Stops the clock, leaving whatever is left of it. */
  pause(): void {
    if (this.timer === undefined || this.startedAt === undefined) {
      return
    }
    clearTimeout(this.timer)
    this.timer = undefined
    this.remaining = Math.max((this.remaining ?? 0) - (Date.now() - this.startedAt), 0)
    this.startedAt = undefined
    /* Said on the host so the indicator can freeze with the clock. A `data-`
       attribute rather than a property, because it is written after upgrade
       from a pointer moving: nothing declares it and no server rendered it,
       which is the same reason `Carousel` names its slides from here. */
    this.toggleAttribute('data-paused', true)
  }

  /** Starts it again from where it stopped. */
  resume(): void {
    if (this.timer !== undefined || this.remaining === undefined || this.remaining <= 0) {
      return
    }
    this.startedAt = Date.now()
    this.toggleAttribute('data-paused', false)
    this.timer = setTimeout(() => {
      this.timer = undefined
      this.dismiss()
    }, this.remaining)
  }

  /* Arrows, so `this` is the item wherever the listener ends up. Lit does bind
     a template listener to its host, and relying on that puts a load-bearing
     fact about a library in a place nobody reading this file would look. */
  /**
   * How many reasons there are to hold the clock, rather than whether there is
   * one.
   *
   * Hover and focus stop the same timer, and the two are genuinely independent:
   * a pointer can leave while focus stays, and focus can leave while the
   * pointer stays. Uncounted, a reader who tabs into a message and then moves
   * the pointer off it has the clock restarted underneath them, which is the
   * case the pause exists for. Only the last one out starts it again.
   */
  private holds = 0

  private readonly handlePause = (): void => {
    this.holds += 1
    this.pause()
  }

  private readonly handleResume = (): void => {
    this.holds = Math.max(this.holds - 1, 0)
    if (this.holds === 0) {
      this.resume()
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    // A message removed while its timer is running would otherwise fire into
    // nothing, and hold the item alive until it did.
    clearTimeout(this.timer)
    this.timer = undefined
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    /* Mirrored for CSS rather than reflected onto `open` itself, which is the
       library's rule about state: a reflected `open` is indistinguishable from
       one the consumer declared, and that attribute is what ownership is read
       from. `data-closed` can never be mistaken for a declaration. */
    /* **`data-closed`, because open is the resting state.** A toast opens by
       default, so a `data-open` would appear on a consumer's server-rendered
       `<helix-toast-item>` without React having sent it. Inverting keeps the
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
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    /* Here rather than in `connectedCallback`, which the server never calls, and
       started only once: the clock belongs to this message's life on screen. */
    if (this.duration !== undefined && this.duration > 0) {
      this.remaining = this.duration
      this.resume()
    }
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
      <svg part="dismiss-mark" viewBox=${x.viewBox} fill="currentColor" aria-hidden="true">
        ${unsafeSVG(x.content)}
      </svg>
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
      <div part="content"><slot></slot></div>
      <div part="actions"><slot name="actions"></slot></div>
      ${
        this.dismissible
          ? html`<button
              part="dismiss"
              type="button"
              aria-label=${this.dismissLabel}
              @click=${() => this.dismiss()}
            >
              ${this.renderDismissIcon()}
            </button>`
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
