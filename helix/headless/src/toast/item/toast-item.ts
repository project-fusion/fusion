import {
  customElement,
  HelixElement,
  MixinDismissible,
  requestControlledChange,
  type SeverityMark,
  severityMark,
} from '@helix-io/core'
import { x } from '@helix-io/icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'

/**
 * @summary One message in the toast region.
 *
 * @description
 * An element rather than a slot, because it carries a timeout, a severity, a
 * dismiss control and a lifetime that pauses: behavior, state and API, which
 * is the test for whether a region becomes an element in this library.
 *
 * **The timer is the item's own.** Held by the region, one message arriving
 * would restart another's, so a stack of three would go from three seconds each
 * to nine for the last one. Each message is on its own clock from the moment it
 * is rendered.
 *
 * **A message is the opposite of the page it is over.** Inverted by default,
 * because a thing arriving in a corner has to be told apart from the page in
 * the moment before it is read, and inverting does that without spending a
 * color that means something. It is a flip of `color-scheme` rather than a
 * named inverse surface: every token in the subtree re-resolves, so a `Retry`
 * a consumer slots in comes out right without knowing where it is. `Tooltip`
 * can name the inverse surface directly because it holds no controls; this
 * cannot. Set `data-color-mode` on the region to take the page's mode instead.
 *
 * **No duration means it stays.** That is the safe default rather than the
 * common one: anything carrying an action has to still be there when the reader
 * decides to take it, and a component cannot tell from the outside whether the
 * message it was given is disposable.
 *
 * **The clock stops while it is being read.** Hover pauses it, and so does
 * focus landing anywhere inside, which is the case that matters more: a
 * keyboard reader tabbing towards the action in a toast is exactly the person a
 * timer must not race. Both resume where they left off rather than starting
 * again, so a message half-read does not get a full second life every time a
 * pointer crosses it.
 *
 * **Going away is a request, never an act.** It dispatches a cancelable
 * `helix-dismiss` and does nothing else: the consumer owns the list, so the
 * item removing itself would leave the two disagreeing. Auto-dismiss and the
 * dismiss control raise the same event, so a consumer handles one path and not
 * two.
 *
 * @since 0.1.0
 * @status experimental
 * @documentation https://helix.fusion.dev/components/toast
 *
 * @slot - The message.
 * @slot actions - What to do about it, usually a button or a link.
 * @slot icon - Replaces the severity mark. Matches `Callout`, which is why the
 *   dismiss control's own glyph is `dismiss-icon` rather than this: two slots
 *   cannot share a name, assignment goes to whichever comes first in the tree,
 *   and the severity mark is the one a consumer reaches for.
 * @slot dismiss-icon - Replaces the glyph inside the dismiss control.
 *
 * @csspart item - The message's own surface.
 * @csspart icon - The severity mark, where the message has one.
 * @csspart content - The message.
 * @csspart actions - The region holding what to do about it.
 * @csspart dismiss - The control that asks to close.
 * @csspart timer - The bar showing how long is left, where a duration was given.
 *
 * @event {HelixDismissEvent} helix-dismiss - Fired when it asks to go, whether by the control or by its timer.
 */
@customElement('helix-base-toast-item')
export class HelixBaseToastItem extends MixinDismissible(HelixElement) {
  /**
   * How long it stays, in milliseconds. Absent means until it is dismissed.
   *
   * Read once when the item is first rendered. Changing it afterwards does not
   * restart a message the reader is already partway through.
   */
  @property({ type: Number })
  duration?: number

  /** What kind of message it is, which picks the mark and its name. */
  @property({ reflect: true })
  severity?: 'danger' | 'info' | 'success' | 'warning'

  /** When the current run of the timer began, or nothing while it is paused. */
  private startedAt: number | undefined

  /** What is left of the duration, so resuming continues rather than restarts. */
  private remaining: number | undefined

  private timer: ReturnType<typeof setTimeout> | undefined

  /**
   * Whether the message is still showing.
   *
   * The same decide-once contract every other stateful thing here carries, and
   * it was the one exception: this waited to be told in every case, so
   * `duration` did nothing at all without consumer script and the dismiss
   * control looked broken to anyone who pressed it. `Dialog` closes itself,
   * `Accordion` closes itself, and there was no reason a message should not.
   *
   * Declared by the markup and it is the consumer's: the item announces and
   * waits. Not declared and it is the item's: it goes when it is asked to, and
   * the consumer still hears `helix-dismiss` and takes it out of their own
   * list. Read once, at the first update.
   *
   * **No `default-open`, unlike the four mixins.** A `default-` seed exists so
   * markup can choose a starting state without claiming ownership, and there is
   * only one starting state that makes sense: a message that has been rendered
   * is showing. An attribute whose only legal value is the default is an
   * attribute nobody can use.
   *
   * @controlled helix-dismiss
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

  /** Whether the consumer owns it, decided once and then fixed. */
  private openMode: boolean | undefined = undefined

  private get openIsControlled(): boolean {
    return this.openMode === true
  }

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
    return requestControlledChange({
      apply: () => {
        if (this.openIsControlled) {
          return
        }
        const previous = this.open
        this.openState = false
        this.requestUpdate('open', previous)
      },
      controlled: this.openIsControlled,
      /* `helix-dismiss` answers a controlled `open`, which reads oddly and is
         exact. A toast is not an overlay that opens and closes: `next` below is
         `false` and nothing here ever calls `requestOpen(true)`, so it only
         ever asks in one direction, and the verb for that direction is
         `dismiss`. `HelixDismissEvent` already carries it for a tag leaving a
         list and an announcement closing itself, which is the same act from the
         element's side. A consumer controlling `open` therefore answers
         `onhelix-dismiss`, and the generated types ask for exactly that. */
      event: () => this.dismissEvent(),
      host: this,
      label: 'open',
      next: false,
      read: () => this.open,
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
   * Hover and focus both stopped the same timer with nothing counting them, so
   * a reader who tabbed into a message and then moved the pointer off it had
   * the clock restarted underneath them while they were still reading it. That
   * is the case the pause exists for, and it was the case that broke it.
   *
   * The two are genuinely independent: a pointer can leave while focus stays,
   * and focus can leave while the pointer stays. Only the last one out starts
   * it again.
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
    /* Before anything else reads it, and only the first time. Everything that
       declares the mode has arrived by now: attributes from markup or from a
       server's output, and properties a framework assigned on mount. */
    if (this.openMode === undefined) {
      this.openMode = this.openState !== undefined
    }
    /* Mirrored for CSS rather than reflected onto `open` itself, which is the
       library's rule about state: a reflected `open` is indistinguishable from
       one the consumer declared, and that attribute is what ownership is read
       from. `data-open` can never be mistaken for a declaration. */
    this.toggleAttribute('data-open', this.open)
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
   * The mark for the message's severity, behind a seam.
   *
   * Slot fallback, so a consumer replaces it by slotting; and a method, so the
   * tier above replaces it by overriding. Those answer different people: the
   * slot is for the page and the method is for whoever is building the styled
   * layer, and a fallback with only the first is one a tier can restyle and
   * cannot change.
   *
   * The mark is passed in rather than looked up again, since `render` has
   * already resolved the severity and a second lookup is a second place for the
   * fallback to disagree with the tone around it.
   */
  protected renderIcon(severity: SeverityMark): TemplateResult {
    return html`<slot name="icon">
      <svg
        fill="currentColor"
        viewBox=${severity.icon.viewBox}
        role="img"
        aria-label=${severity.label}
      >
        ${unsafeSVG(severity.icon.content)}
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
      <svg viewBox=${x.viewBox} fill="currentColor" aria-hidden="true">
        ${unsafeSVG(x.content)}
      </svg>
    </slot>`
  }

  protected override render(): TemplateResult {
    /* Nothing when no severity was given, which is the common message: "Project
       saved" is not an error, a warning or an announcement, and an icon there
       would be decoration standing where meaning is supposed to be. `Callout`
       falls back to `info` because a callout exists to set a passage apart and
       is always *about* something; a toast is just the next thing that
       happened. */
    const severity = severityMark(this.severity)

    return html`<div
      part="item"
      @mouseenter=${this.handlePause}
      @mouseleave=${this.handleResume}
      @focusin=${this.handlePause}
      @focusout=${this.handleResume}
    >
      ${
        severity
          ? html`<span part="icon">
              ${this.renderIcon(severity)}
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
              style=${`--_toast-duration: ${this.duration}ms`}
              aria-hidden="true"
            ></div>`
          : nothing
      }
    </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-toast-item': HelixBaseToastItem
  }
}
