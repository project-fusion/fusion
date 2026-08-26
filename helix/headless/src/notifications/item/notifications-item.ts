import {
  customElement,
  HelixDismissEvent,
  HelixElement,
  HelixReadEvent,
  hostAria,
  relativeTime,
  requestControlledChange,
} from '@helix-io/core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { subscribe } from './ticker.js'

/**
 * @summary One thing that happened, which a reader may not have seen yet.
 *
 * @description
 * A notification is a toast that did not go away. `helix-toast` is deliberately
 * the opposite of this: a live region whose items carry a `duration` and whose
 * root never creates or destroys anything. What makes this its own family is the
 * state each item carries rather than the arrangement it sits in: read and
 * unread, a timestamp that has to stay correct, and an action a reader can take
 * later.
 *
 * **The timestamp is the part that is easy to get wrong and impossible to
 * notice.** "2 minutes ago" is correct for sixty seconds, and a feed left open
 * ends up describing when the page loaded rather than when anything happened.
 * Every item's reading is refreshed on a schedule it works out for itself, from
 * one timer the page shares: fifty items with fifty intervals is fifty wakeups a
 * second where one will do.
 *
 * **Read state is reported, not invented.** Marking something read is usually a
 * round trip, and a component that flips its own state and then hears the
 * request failed has told the reader something untrue. `helix-read` is
 * cancelable, and a `read` set by the consumer makes this element defer entirely.
 *
 * @since 0.1.0
 * @status experimental
 * @category feedback
 * @aliases Notification item, Inbox item
 * @documentation https://helix.fusion.dev/components/notifications
 *
 * @slot - What happened, in the consumer's own markup.
 * @slot media - An avatar or icon identifying who or what it came from.
 * @slot actions - What a reader can do about it.
 *
 * @csspart item - The whole notification.
 * @csspart media - The leading slot's box.
 * @csspart body - Content and timestamp together.
 * @csspart content - The consumer's own markup.
 * @csspart time - When it happened, read the way a person reads one.
 * @csspart actions - The trailing slot's box.
 * @csspart dismiss - The control that removes it.
 *
 * @event {HelixReadEvent} helix-read - Fired when the item is marked read or unread, and cancelable.
 * @event {HelixDismissEvent} helix-dismiss - Fired when a reader asks to remove it, and cancelable.
 */
@customElement('helix-headless-notifications-item')
export class HelixHeadlessNotificationsItem extends HelixElement {
  /**
   * When it happened, as anything `Date` parses.
   *
   * An ISO string is what an API sends and what `<time datetime>` takes, so it
   * is the shape that needs no translation at either end. Left unset the item
   * shows no timestamp rather than showing the epoch, which is what parsing an
   * empty string would give.
   */
  @property()
  at = ''

  /**
   * Whether the reader has seen it.
   *
   * Reflected, because unread is a visual state and a stylesheet has no other
   * way to know. Set it and this element defers: a reader's click fires
   * `helix-read` and changes nothing until a new value arrives. `default-read`
   * seeds a state this element then owns.
   *
   * @controlled helix-read
   */
  @property({ reflect: true, type: Boolean })
  get read(): boolean {
    return this.readState ?? this.defaultRead
  }

  set read(next: boolean) {
    const previous = this.read
    this.readState = next
    this.requestUpdate('read', previous)
  }

  /** State to open with, where nothing declared one. */
  @property({ attribute: 'default-read', type: Boolean })
  defaultRead = false

  /** Whether a reader may remove it. */
  @property({ type: Boolean })
  dismissible = false

  /** Locale for the timestamp. Empty is the runtime's own. */
  @property()
  locale = ''

  /** Accessible name for the dismiss control. */
  @property({ attribute: 'dismiss-label' })
  dismissLabel = 'Dismiss'

  /**
   * @internal Read by the list to identify its children across the light DOM,
   * which is cheaper than `instanceof` and is why this is public rather than
   * protected. Not a consumer's to read or set.
   */
  readonly isNotification = true

  @state()
  private readState: boolean | undefined = undefined

  /**
   * The clock this item last drew against.
   *
   * A state field and not a read of `Date.now()` inside `render`, which would
   * make the template a function of something Lit cannot see change: the item
   * would draw the right text once and never notice it had gone stale.
   */
  @state()
  private clock: number | undefined = undefined

  private readMode: boolean | undefined = undefined

  private stopTicking: (() => void) | undefined = undefined

  private get readIsControlled(): boolean {
    return this.readMode === true
  }

  /** The timestamp, or nothing where there is not one to read. */
  private get moment(): Date | undefined {
    if (this.at === '') {
      return undefined
    }
    const parsed = new Date(this.at)
    return Number.isNaN(parsed.getTime()) ? undefined : parsed
  }

  /**
   * Asks to be marked read, and reports whether the request stood.
   *
   * Public because a consumer's own control is as likely to ask as this
   * element's own markup is, and because a list marking everything read has to
   * go through the same request rather than writing the property behind it.
   */
  markRead(next = true): boolean {
    if (next === this.read) {
      return false
    }
    return requestControlledChange({
      apply: (read) => {
        if (this.readIsControlled) {
          return
        }
        const previous = this.read
        this.readState = read
        this.requestUpdate('read', previous)
      },
      controlled: this.readIsControlled,
      event: (read) => new HelixReadEvent({ read }),
      host: this,
      label: 'read',
      next,
      read: () => this.read,
    })
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.tick()
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    /* The subscription outlives the element otherwise, and a feed that mounts
       and unmounts a panel leaks one every time it opens. */
    this.stopTicking?.()
    this.stopTicking = undefined
  }

  /**
   * Schedules the next reading, and only the next one.
   *
   * The formatter says when its own answer expires, so this asks for exactly
   * that moment rather than polling: an item minutes old wakes once a minute and
   * an item weeks old wakes once an hour, which is the difference between a
   * feed that costs nothing to leave open and one that does not.
   */
  private tick(): void {
    this.stopTicking?.()
    const moment = this.moment
    if (!moment) {
      this.stopTicking = undefined
      return
    }
    const now = new Date()
    this.clock = now.getTime()
    const { next } = relativeTime(this.locale)(moment, now)
    if (!Number.isFinite(next)) {
      this.stopTicking = undefined
      return
    }
    this.stopTicking = subscribe(next, () => this.tick())
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    // Only the first time, before anything reads it. See `MixinControllerValue`.
    if (this.readMode === undefined) {
      this.readMode = this.readState !== undefined
    }
    if (changed.has('at') || changed.has('locale')) {
      this.tick()
    }
    hostAria(this.internals, { role: 'listitem' })
  }

  private renderTime(): TemplateResult | typeof nothing {
    const moment = this.moment
    if (!moment) {
      return nothing
    }
    /* `datetime` carries the exact instant whatever the text says, so a screen
       reader and a copy-paste both get the real time rather than "yesterday",
       and the element remains readable when the locale has no formatter. */
    const { text } = relativeTime(this.locale)(moment, new Date(this.clock ?? Date.now()))
    return html`<time part="time" datetime=${moment.toISOString()}>${text}</time>`
  }

  protected override render(): TemplateResult {
    const dismiss = this.dismissible
      ? html`<button
          part="dismiss"
          type="button"
          aria-label=${this.dismissLabel}
          @click=${this.handleDismiss}
        >
          <slot name="dismiss">&times;</slot>
        </button>`
      : nothing
    return html`<div part="item">
      <span part="media"><slot name="media"></slot></span>
      <div part="body">
        <div part="content"><slot></slot></div>
        ${this.renderTime()}
      </div>
      <span part="actions"><slot name="actions"></slot></span>
      ${dismiss}
    </div>`
  }

  private readonly handleDismiss = (event: Event): void => {
    event.stopPropagation()
    if (this.dispatchEvent(new HelixDismissEvent({ label: this.textContent?.trim() ?? '' }))) {
      this.remove()
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-notifications-item': HelixHeadlessNotificationsItem
  }
}
