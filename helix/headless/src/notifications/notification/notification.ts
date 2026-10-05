import {
  customElement,
  deepActiveElement,
  deepContains,
  focusableElements,
  HelixElement,
  HelixReadEvent,
  hostAria,
  MixinDismissible,
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
 * @summary A single notification about something that happened, marked read or unread.
 *
 * @description
 * A notification is a toast that stays. `Toast` is a live region whose items
 * have a `duration`. A notification carries state instead: read or unread, a
 * timestamp that stays correct, and an action you can take later.
 *
 * The row has a label, a caption under it, and one trailing column. The label
 * gets the first line on its own, so a feed is quick to scan. The trailing
 * column shows either the time or the controls: the time while you scan, and
 * the controls once you stop on a row.
 *
 * `FormatDate` renders the timestamp, including the readable text, the
 * `<time datetime>` element, and the shared timer that keeps it current.
 *
 * Read state is reported to you. Marking a notification read is usually a round
 * trip to a server, so `helix-read` is cancelable, and when you set `read`
 * yourself the element leaves it to you.
 *
 * @since 0.1.0
 * @status stable
 * @category feedback
 * @aliases Notification item, Inbox item
 * @documentation https://fusion.dev/helix/components/notifications
 *
 * @slot - What happened, in your own markup.
 * @slot actions - Actions the user can take, shown under the text. They are always visible,
 * because acting on the notification is the purpose of the row.
 * @slot description - A second, quieter line with more detail. It is a bare slot
 * with no wrapping box, so an item without a description costs nothing. Style it
 * with `::slotted()`.
 * @slot detail - A block of content in the row, such as a quoted comment, a status
 * change from one value to another, or a preview. It sets no text size or color, because
 * its content usually brings its own.
 * @slot dismiss - Replaces the icon inside the dismiss control, which is drawn
 * only when the row is `dismissible`.
 * @slot media - An avatar or icon identifying who or what it came from.
 *
 * @event {HelixDismissEvent} helix-dismiss - Fired when the user dismisses the notification. Cancelable.
 * @event {HelixReadEvent} helix-read - Fired when the notification is marked read or unread. Cancelable.
 *
 * @csspart actions - The trailing slot's box.
 * @csspart body - The label and the caption together.
 * @csspart controls - The actions and the dismiss control, shown in place of the time.
 * @csspart dismiss - The control that dismisses the notification.
 * @csspart dismiss-mark - The icon on the dismiss control, when no icon is slotted.
 * @csspart item - The whole notification.
 * @csspart label - What happened, on the first line.
 * @csspart media - The leading slot's box.
 * @csspart time - When it happened, formatted for people to read.
 * @csspart trailing - The column holding the time and the controls.
 *
 * @cssstate actions - While the actions slot holds something, so the words above make room for it.
 * @cssstate controls - The item can be dismissed, so the time gives way to the dismiss control under a pointer.
 * @cssstate read - While it has been read.
 */
@customElement('helix-headless-notification')
export class HelixHeadlessNotification extends MixinDismissible(HelixElement) {
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
   * Whether the notification starts as read, used until `read` is set.
   */
  @property({ attribute: 'default-read', type: Boolean })
  defaultRead = false

  /**
   * What a screen reader hears before an unread notification's text.
   *
   * The unread mark is drawn, so a reader who cannot see it hears this word in
   * its place. Translate it with the rest of your interface.
   */
  @property({ attribute: 'unread-label' })
  unreadLabel = 'Unread'

  /**
   * Locale for the timestamp.
   *
   * Empty is the runtime's own.
   */
  @property()
  locale = ''

  /**
   * Whether the notification has been read.
   *
   * Set it and this element defers: a reader's click fires `helix-read` and
   * changes nothing until a new value arrives. `default-read` seeds a state
   * this element then owns.
   *
   * **Not reflected.** Unread is a visual state, which is why the four mixins
   * mirror theirs, but the mirror may not be the property's own attribute:
   * `<helix-headless-notification default-read>` comes back from a server
   * without `read` and would gain it on the first update, which React reports
   * as a hydration mismatch, and which a copy of the serialized element
   * re-parses as a declaration. `:state(read)` is what the stylesheet reads.
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
   * @internal Read by the list to identify its children across the light DOM,
   * which is cheaper than `instanceof` and is why this is public rather than
   * protected. Not a consumer's to read or set.
   */
  readonly isNotification = true

  private readState: boolean | undefined = undefined

  /**
   * Requests that the notification be marked read, and returns whether the
   * change was applied.
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
        <div part="label">${
          /* An empty image named for the state, so the word is read with the
             row and draws nothing: an empty inline box inside the label's own
             line. This tier has no stylesheet to hide text with. */
          this.read ? nothing : html`<span role="img" aria-label=${this.unreadLabel}></span>`
        }<slot></slot></div>
        <slot name="description"></slot>
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
     that owns the slot and stops there.

     **`markActions`, which is the answer this slot feeds.** It called
     `markControls` and that reads `dismissible` and nothing else, so the
     listener recomputed a state from a property that had not changed and left
     the one it was bound for alone: a row whose actions arrive after the first
     render, which is every row a consumer fills from a response, kept
     `:state(actions)` off and drew its buttons hard against the words above
     them. The two were one answer until `markControls` stopped counting the
     slot, and the listener was not moved with it. */
  private readonly handleActions = (): void => {
    this.markActions()
  }

  /* `stopPropagation`, because the list this sits in is a feed rather than an
     owner: a row going away is the row's business and the root has nothing to
     do about it. `dismiss()` is the mixin's, which is what keeps the label off
     `this.textContent`: a row reading "Build failed" with a `Retry` in its
     actions slot announced itself as "Build failed Retry" to the consumer
     matching on it.

     Removing itself is this family's default action and not the mixin's.
     `Announcement` and `Tag` own no state and leave the removal to the
     consumer; a feed row is one entry in a list the reader is clearing, so a
     dismissal that left the row on screen would be the control doing nothing. */
  private readonly handleDismiss = (event: Event): void => {
    event.stopPropagation()
    if (this.dismiss()) {
      /* Focus was on the control that is leaving with the row, so it moves to
         the row beside it, or to the feed's own controls, before the row
         goes. Left alone it would fall to the body. */
      const next = deepContains(this, deepActiveElement()) ? this.neighbor() : null
      this.remove()
      next?.focus()
    }
  }

  /**
   * Where focus goes when this row leaves: the next row's first control, the
   * one before, then the first control left in the feed.
   */
  private neighbor(): HTMLElement | null {
    let feed = this.parentElement
    while (feed && !('markEveryoneRead' in feed)) {
      feed = feed.parentElement
    }
    const rows = feed
      ? (feed as unknown as { items: HelixHeadlessNotification[] }).items
      : [...(this.parentElement?.children ?? [])].filter(
          (one): one is HelixHeadlessNotification => 'isNotification' in one,
        )
    const at = rows.indexOf(this)
    const order = [...rows.slice(at + 1), ...rows.slice(0, Math.max(at, 0)).reverse()]
    for (const row of order) {
      const target =
        row.shadowRoot?.querySelector<HTMLElement>('[part="dismiss"]') ?? focusableElements(row)[0]
      if (target) {
        return target
      }
    }
    if (!feed) {
      return null
    }
    return (
      feed.shadowRoot?.querySelector<HTMLElement>('[part="mark-all"]') ??
      focusableElements(feed).find((one) => !this.contains(one)) ??
      null
    )
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-notification': HelixHeadlessNotification
  }
}
