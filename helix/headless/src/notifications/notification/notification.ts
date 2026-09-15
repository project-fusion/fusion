import {
  customElement,
  HelixDismissEvent,
  HelixElement,
  HelixReadEvent,
  hostAria,
  requestChange,
  slotFilled,
} from '@fusion.dev/helix-core'
import { x } from '@fusion.dev/helix-icons'
import { nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'
/* `lit/static-html.js`, because this template interpolates a tag name and the
   plain `html` cannot: it renders the placeholder as the element instead, which
   shifts every attribute after it by one. See `renderTime`. */
import { html } from 'lit/static-html.js'
/* Both tiers import this, the relative path resolving to each tier's own element. */
import '../../format-date/index.js'

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
 * **The row is a label, a caption under it, and one trailing column that holds
 * either the time or the controls.** A feed is scanned rather than read, so the
 * thing that happened gets the first line on its own and everything qualifying
 * it goes under. The time and the controls occupy the same place because a
 * reader wants exactly one of them at a time: the time while they are scanning,
 * and what they can do about it once they have stopped on a row.
 *
 * **The timestamp is `helix-format-date`**, which is where the reading, the
 * `<time datetime>` and the shared timer now live. It was implemented here, and
 * a component that formats a date is not a fact about notifications: Chat wanted
 * the same thing and had its own copy of half of it.
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
 * @slot actions - What a reader can do about it, under the words it is about. Drawn always
 * rather than on hover, because an action is the point of the row and not chrome around it.
 * @slot caption - A second line qualifying it, quieter than the first. A bare
 * slot rather than a box, so an item without one pays nothing for it; style it
 * through `::slotted()`.
 * @slot detail - A block belonging to the row rather than a line about it: a quoted
 * comment, a status moving from one value to another, a preview. Unlike `caption` nothing
 * here sets a size or an ink, because whatever fills it usually brings its own.
 * @slot media - An avatar or icon identifying who or what it came from.
 *
 * @event {HelixDismissEvent} helix-dismiss - Fired when a reader asks to remove it, and cancelable.
 * @event {HelixReadEvent} helix-read - Fired when the item is marked read or unread, and cancelable.
 *
 * @csspart actions - The trailing slot's box.
 * @csspart body - The label and the caption together.
 * @csspart controls - The actions and the dismiss, which replace the time.
 * @csspart dismiss - The control that removes it.
 * @csspart dismiss-mark - The glyph on that control, where none is slotted.
 * @csspart item - The whole notification.
 * @csspart label - What happened, on the first line.
 * @csspart media - The leading slot's box.
 * @csspart time - When it happened, read the way a person reads one.
 * @csspart trailing - The column holding the time and the controls.
 *
 * @cssstate actions - While the actions slot holds something, so the words above make room for it.
 * @cssstate controls - While it can be dismissed, so the time makes way for the control under a pointer.
 * @cssstate read - While it has been read.
 */
@customElement('helix-headless-notification')
export class HelixHeadlessNotification extends HelixElement {
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
   * Set it and this element defers: a reader's click fires `helix-read` and
   * changes nothing until a new value arrives. `default-read` seeds a state
   * this element then owns.
   *
   * **Not reflected.** Unread is a visual state, which is why the four mixins
   * mirror theirs, but the mirror may not be the property's own attribute:
   * `<helix-notification default-read>` comes back from a server without `read`
   * and would gain it on the first update, which React reports as a hydration
   * mismatch, and which a copy of the serialized element re-parses as a
   * declaration. `:state(read)` is what the stylesheet reads.
   * `hydration.dom.spec.ts` holds it.
   */
  @property({ type: Boolean })
  get read(): boolean {
    return this.readState ?? this.defaultRead
  }

  set read(next: boolean) {
    const previous = this.read
    this.readState = next
    this.requestUpdate('read', previous)
  }

  /**
   * State to open with, where nothing declared one.
   */
  @property({ attribute: 'default-read', type: Boolean })
  defaultRead = false

  /**
   * Whether a reader may remove it.
   */
  @property({ type: Boolean })
  dismissible = false

  /**
   * Accessible name for the dismiss control.
   */
  @property({ attribute: 'dismiss-label' })
  dismissLabel = 'Dismiss'

  /**
   * Locale for the timestamp.
   *
   * Empty is the runtime's own.
   */
  @property()
  locale = ''

  /**
   * @internal Read by the list to identify its children across the light DOM,
   * which is cheaper than `instanceof` and is why this is public rather than
   * protected. Not a consumer's to read or set.
   */
  readonly isNotification = true

  private readState: boolean | undefined = undefined

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
    return requestChange({
      apply: (read) => {
        const previous = this.read
        this.readState = read
        this.requestUpdate('read', previous)
      },
      event: (read) => new HelixReadEvent({ read }),
      host: this,
      next,
    })
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    hostAria(this.internals, { role: 'listitem' })
    /* The mirror the stylesheet selects on, kept off the host's attributes for
       the reason on `read` itself. */
    this.toggleState('read', this.read)
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.markControls()
    this.markActions()
  }

  /**
   * Says whether there is anything for the time to make way for.
   *
   * The trailing column holds the time and the dismiss in one place and shows
   * one of them, so a row with nothing to do about it would hide its timestamp
   * on hover and put nothing there.
   *
   * **`dismissible` alone, where this once also counted a filled actions slot.**
   * An action is not chrome. A row offering "Respond" is a row whose whole point
   * is that button, and one nobody sees until a pointer arrives is one most
   * readers never find: on a coarse pointer it was drawn and on a desktop it was
   * not, so the two disagreed about whether the row had a button at all. Actions
   * now sit in the body under the words they are about, and the swap is left to
   * the one control that really is chrome.
   *
   * This element knows `dismissible` on the server, so unlike the answer it
   * replaces this one needs no DOM and is right from the first render.
   */
  private markControls(): void {
    this.toggleState('controls', this.dismissible)
  }

  /**
   * Says whether a consumer put anything in the actions slot.
   *
   * Only so the stylesheet can space them from the words above: a row with no
   * actions pays nothing for the room they would have taken. Answered from a
   * DOM, so the resting answer is the one the server writes.
   */
  private markActions(): void {
    const slot = this.renderRoot?.querySelector<HTMLSlotElement>('slot[name="actions"]')
    this.toggleState('actions', slotFilled(slot))
  }

  /**
   * The control that removes the item, with the mark a consumer can replace.
   *
   * **A method rather than markup inside `render`, and the slot moves with
   * it.** A fallback answers a consumer and a seam answers the tier above, which
   * are different people: the styled tier wants an icon here, and with the slot
   * written inline the only way to change it is to reimplement the whole
   * template. Moving only the fallback out is not enough: the slot is the thing
   * a tier redraws.
   *
   * **The mark is drawn rather than typed, which is what lets it align.** A
   * character such as `&times;` is placed by its font rather than by its box:
   * measured against the ghost button beside it at 8x, the cross carried 6
   * pixels of ink to the label's 9.5 and sat 1.5 pixels below its center, in two
   * boxes whose own centers agreed to a tenth of a pixel. No stylesheet can
   * correct that, because the offset is inside the glyph. An `<svg>` is centered
   * on its own viewBox, so it lands where the box says and takes the icon step
   * the row is already set in.
   *
   * **A cross, and not the trash this used to draw.** The argument for the trash
   * was that a notification is the only copy of something that happened, so
   * removing it is destruction and should be marked as such. That reads the row
   * as the event. It is not: the deploy still deployed and the build still
   * failed, and the feed this sits in has `See everything` under it, which says
   * plainly that the row is a view of a longer list. What dismissing ends is the
   * notice.
   *
   * The component cannot know better than that either. `helix-dismiss` is a
   * request the consumer answers, so whether anything is destroyed is theirs to
   * decide, and a default that shouts danger asserts a permanence this element
   * does not control. `--notifications-dismiss-color` is still there for a
   * consumer whose control really does destroy something.
   */
  protected renderDismiss(): TemplateResult | typeof nothing {
    if (!this.dismissible) {
      return nothing
    }
    return html`<button
      part="dismiss"
      type="button"
      aria-label=${this.dismissLabel}
      @click=${this.handleDismiss}
    >
      <slot name="dismiss">
        <svg
          aria-hidden="true"
          data-glyph
          fill="currentColor"
          part="dismiss-mark"
          viewBox=${x.viewBox}
        >
          ${unsafeSVG(x.content)}
        </svg>
      </slot>
    </button>`
  }

  /**
   * When it happened, delegated whole.
   *
   * The tag is interpolated rather than written, so each tier renders its own:
   * the base tier may not name a styled element, and a styled item inherits this
   * template without having a tag of its own to remind anybody.
   *
   * `exportparts` and no `part` of its own, which is the rule about a part
   * already named for its role: the child publishes `time`, the role here is
   * `time`, and naming both would leave `::part(time)` matching two elements.
   * What a consumer wants to reach is the `<time>`, so that is what the name
   * reaches.
   */
  private renderTime(): TemplateResult {
    const stamp = this.tag('format-date')
    return html`<${stamp}
      exportparts="time"
      elapsed
      date=${this.at}
      locale=${this.locale}
    ></${stamp}>`
  }

  protected override render(): TemplateResult {
    return html`<div part="item">
      <span part="media"><slot name="media"></slot></span>
      <div part="body">
        <div part="label"><slot></slot></div>
        <slot name="caption"></slot>
        <slot name="detail"></slot>
        <span part="actions"><slot name="actions" @slotchange=${this.handleActions}></slot></span>
      </div>
      <div part="trailing">
        ${this.renderTime()}
        <div part="controls">${this.renderDismiss()}</div>
      </div>
    </div>`
  }

  /* Content arriving from the light DOM changes no property here, so nothing
     would schedule the re-read. Bound to the slot rather than to the host,
     because `slotchange` bubbles and is not composed: it reaches the shadow root
     that owns the slot and stops there. */
  private readonly handleActions = (): void => {
    this.markControls()
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
    'helix-headless-notification': HelixHeadlessNotification
  }
}
