import {
  customElement,
  HelixElement,
  HelixReadEvent,
  hostAria,
  MixinCollection,
  slotFilled,
} from '@helix-io/core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import type { HelixHeadlessNotification } from '../notification/notification.js'

/**
 * @summary A feed a reader comes back to, made of notifications they may not have seen.
 *
 * @description
 * **Slotted children rather than a data property**, which is the opposite of the
 * choice `helix-data-table` made and correct for the opposite reason. A table's
 * rows are homogeneous values a consumer wants windowed; a notification is a
 * small piece of somebody's own markup, with an avatar and a link and a button
 * in it, and there are tens of them rather than thousands. Writing them out is
 * the web-component reading of a list and lets an item hold anything.
 *
 * **The cost is stated rather than discovered: this does not virtualize, and it
 * cannot.** Windowing needs the list to own the data, and here the consumer owns
 * it: N notifications is N elements by construction. That is the same trade
 * `25-data-table.md` §2.2 rejected for a table and accepts here, because the
 * sizes are not comparable. A feed that really does hold thousands wants a data
 * table with a custom cell, and this component will not grow into one.
 *
 * **Read state is reported, never invented.** Marking read is usually a round
 * trip: this element asks its items and each item asks the consumer, so a
 * refused `helix-read` leaves everything alone and a consumer who owns `read`
 * sees nothing change until they say so. `unread` is derived from the items and
 * reflected, so a stylesheet and a badge can both read it without either of them
 * counting.
 *
 * @since 0.1.0
 * @status experimental
 * @category feedback
 * @aliases Notification feed, Inbox, Activity
 * @documentation https://helix.fusion.dev/components/notifications
 *
 * @slot - The notifications, as `helix-notification` children.
 * @slot footer - Below the list, for a link to everything.
 * @slot header - Above the list, for a title and the mark-all control.
 *
 * @event {HelixReadEvent} helix-read - Fired by an item, and by this element when everything is marked read. Cancelable.
 *
 * @csspart empty - Shown when there is nothing in the feed.
 * @csspart footer - The region below the list.
 * @csspart header - The region above the list.
 * @csspart list - The list itself.
 * @csspart loading - Shown while the feed is still on its way.
 * @csspart mark-all - The control that marks everything read.
 */
@customElement('helix-headless-notifications')
export class HelixHeadlessNotifications extends MixinCollection(HelixElement) {
  /**
   * Nothing is assigned by name, so the items land in a list and the rest does not.
   *
   * `role="listitem"` under anything but a `list` is a list item belonging to
   * nothing, and the items are ordinary children a consumer writes with no
   * `slot`. Manual assignment is the only way to wrap them without editing the
   * consumer's markup, which is a change a React consumer's hydration reports
   * and does not patch up.
   */
  static override shadowRootOptions: ShadowRootInit = {
    ...HelixElement.shadowRootOptions,
    slotAssignment: 'manual',
  }

  /**
   * Accessible name for the feed.
   */
  @property()
  label = ''

  /**
   * Whether to draw a control that marks everything read.
   */
  @property({ attribute: 'mark-all', type: Boolean })
  markAll = false

  /**
   * Label for that control.
   */
  @property({ attribute: 'mark-all-label' })
  markAllLabel = 'Mark all as read'

  /**
   * How many items are unread, counted from the items themselves.
   *
   * Read-only for the reason it is derived: a count the consumer could set is a
   * second source of truth for something the items already know, and the first
   * time the two disagreed the badge would be right and the list would not.
   *
   * **The attribute is written in `updated` rather than reflected, and the
   * difference is a bug that shipped.** `@property({ reflect: true })` on a
   * getter with no setter reflects once: Lit reflects what is in
   * `changedProperties`, and nothing puts a derived getter there after the first
   * update. Measured with two items, one marked read: the property answered 1
   * and the attribute still said 2, so a badge reading the attribute showed a
   * count for an item the reader had just opened.
   */
  get unread(): number {
    return this.items.filter((item) => !item.read).length
  }

  /** The notifications declared as children, in the order they are written. */
  get items(): HelixHeadlessNotification[] {
    /* `?? []` is the server. Lit's element shim carries attributes and not a
       tree, so `children` is undefined there, and this getter is reached from
       `unread`, which is reflected and therefore read during the first update. */
    return [...(this.children ?? [])].filter(
      (child): child is HelixHeadlessNotification =>
        'isNotification' in child && child.isNotification === true,
    )
  }

  /**
   * Marks every unread item read, and reports how many actually moved.
   *
   * **Through each item's own request rather than by writing its property**,
   * which is what makes one refusal refuse one item: a consumer who owns some
   * items and not others gets the right answer for each, and a server that
   * rejects one does not silently mark the rest.
   */
  markEveryoneRead(): number {
    if (!this.dispatchEvent(new HelixReadEvent({ read: true }))) {
      return 0
    }
    let moved = 0
    for (const item of this.items) {
      if (!item.read && item.markRead(true)) {
        moved += 1
      }
    }
    this.requestUpdate()
    return moved
  }

  /** Items arrive from the light DOM, which changes no property here. */
  private readonly handleSlotChange = (): void => {
    this.assign()
    this.requestUpdate()
  }

  /**
   * An item's own read event, heard on the way past, so the count follows.
   *
   * `unread` is derived from the items and nothing about an item changing tells
   * Lit to look again. Not stopped: the event is the consumer's to hear, and
   * this element is a bystander that happens to need to redraw.
   */
  private readonly handleRead = (): void => {
    /* After the item has applied it, not before: read synchronously the count
       would be the one from before the change and the badge would trail by one
       every time. */
    queueMicrotask(() => this.requestUpdate())
  }

  private assign(): void {
    const root = this.renderRoot
    const list = root?.querySelector?.<HTMLSlotElement>('slot[name="items"]')
    if (!list?.assign) {
      return
    }
    const items = this.items
    list.assign(...items)
    for (const name of ['header', 'footer']) {
      const slot = root?.querySelector?.<HTMLSlotElement>(`slot[name="${name}"]`)
      slot?.assign?.(...[...this.children].filter((child) => child.getAttribute('slot') === name))
    }
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('helix-read', this.handleRead)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('helix-read', this.handleRead)
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    hostAria(this.internals, { label: this.label || 'Notifications', role: 'region' })
  }

  /**
   * Says whether anything in the feed has media, so every item can hold the
   * column open whether or not it has one of its own.
   *
   * **A fact no item can answer for itself**, which is why it is here. An item
   * knows about its own media slot and nothing about its neighbors, so a feed
   * where some rows have an avatar and some do not drew two different left
   * edges for its text and had no way to notice: measured on a four item feed,
   * the rows without media started their text 32 pixels to the left of the rows
   * with it. The styled tier turns this into a width; this tier ships no
   * stylesheet and is unaffected.
   *
   * Read off the light DOM rather than off the items, so it does not depend on
   * which children have upgraded by the time this runs.
   */
  private markMedia(): void {
    this.toggleState(
      'media',
      this.items.some((item) => item.querySelector(':scope > [slot="media"]') !== null),
    )
  }

  /**
   * Says on each region whether anything is in it.
   *
   * **The stylesheet used to ask, and could not.** The rule read
   * `[part="header"]:not(:has(> slot:has(*)))`, which is two faults at once.
   * `:has()` may not be nested inside `:has()`, so the selector fails to parse
   * and the whole rule is discarded; and a slot's assigned nodes are not its DOM
   * children, so `slot:has(*)` reports whether the slot has *fallback* rather
   * than whether a consumer filled it, and would have been false either way.
   * Both verified in a browser: `insertRule` throws a `SyntaxError` on the
   * first, and an assigned element still leaves `slot.matches(':has(*)')` false.
   * A feed with no header drew its rule under nothing, and one with no footer
   * drew another over nothing.
   *
   * `slotFilled` is what the rest of the library already asks with. It is said
   * on the region inside this shadow root rather than on the host, because an
   * attribute written onto the host is a change to markup the consumer rendered,
   * which React reports on hydration and does not patch up.
   */
  private markEmpty(): void {
    /* The header is not empty while this element is drawing its own control into
       it, which is the case the old selector spelled with a second `:not`. */
    this.markRegion('header', ['header'], '[part="mark-all"]')
    this.markRegion('footer', ['footer'])
  }

  /**
   * One region, hidden when its slot holds nothing and nothing of ours fills it.
   *
   * `hidden` beside the `data-empty` mirror: `data-empty` is the hook the styled
   * sheet reads, and this tier ships no sheet, so an empty region left in the box
   * tree would be a gap a headless consumer cannot close without knowing to look
   * for it. The styled rule stays too, because that sheet sets `display` on these
   * parts and therefore outranks the UA's `[hidden]` one.
   */
  private markRegion(part: string, slots: readonly string[], occupied?: string): void {
    const region = this.renderRoot?.querySelector<HTMLElement>(`[part="${part}"]`)
    const empty =
      !slots.some((name) =>
        slotFilled(this.renderRoot?.querySelector<HTMLSlotElement>(`slot[name="${name}"]`)),
      ) && !(occupied && this.renderRoot?.querySelector(occupied))
    region?.toggleAttribute('data-empty', empty)
    region?.toggleAttribute('hidden', empty)
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    /* Before `markEmpty`, which reads what is assigned: on a feed with no items
       nothing else ever schedules a second update, so a header asked about
       before its slot was filled stayed hidden for the life of the element. The
       empty feed is the one state where the header is the only thing on screen,
       and it was the one state that lost it. */
    this.assign()
    this.markEmpty()
    this.markMedia()
    /* Written after the render rather than reflected during it, so it follows
       every change rather than only the first, and so the server's output and a
       hydrating consumer's markup agree that neither has it yet. */
    /* **Zero is the absence of the attribute, not `unread="0"`.** Writing it at
       rest put an attribute on the host that a consumer's server never sent, and
       the comment above claimed the opposite: writing in `updated` is not "after
       hydration", it is the same microtask checkpoint `firstUpdated` runs in,
       which is exactly how `data-settled` was a bug on three routes. Only a
       departure from resting writes. */
    const unread = this.unread > 0 ? String(this.unread) : null
    if (this.getAttribute('unread') !== unread) {
      if (unread === null) {
        this.removeAttribute('unread')
      } else {
        this.setAttribute('unread', unread)
      }
    }
  }

  protected override render(): TemplateResult {
    const hasItems = this.items.length > 0
    return html`<div part="header">
        <slot name="header"></slot>
        ${
          this.markAll && this.unread > 0
            ? html`<button part="mark-all" type="button" @click=${this.handleMarkAll}>
              ${this.markAllLabel}
            </button>`
            : nothing
        }
      </div>
      <div part="list" role="list" aria-busy=${this.loading ? 'true' : nothing}>
        <slot name="items" @slotchange=${this.handleSlotChange}></slot>
        ${this.renderStatus(hasItems)}
      </div>
      <div part="footer"><slot name="footer"></slot></div>`
  }

  private readonly handleMarkAll = (): void => {
    this.markEveryoneRead()
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-notifications': HelixHeadlessNotifications
  }
}
