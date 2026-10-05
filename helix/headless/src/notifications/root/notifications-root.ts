import {
  customElement,
  deepContains,
  focusableElements,
  HelixElement,
  HelixLoadMoreEvent,
  HelixReadEvent,
  hostAria,
  MixinCollection,
  markRegion,
  rovingStop,
  whenHydrated,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { feedStep } from '../feed-keys.js'
import type { HelixHeadlessNotificationGroup } from '../group/notification-group.js'
import type { HelixHeadlessNotification } from '../notification/notification.js'

/**
 * @summary A feed of notifications, each marked read or unread.
 *
 * @description
 * Notifications are slotted children. Each one is your own markup, with an
 * avatar, a link, or a button in it. Feeds usually hold tens of items, so
 * writing them out lets an item hold anything.
 *
 * The list does not virtualize. Windowing needs the list to own the data, and
 * here you own it, so N notifications are N elements. For a feed of thousands,
 * use a data table with a custom cell.
 *
 * Read state is reported to you. Marking read goes from the root to the item
 * and from the item to you, so a canceled `helix-read` changes nothing, and if
 * you own `read`, nothing changes until you set it. `unread` is derived from
 * the items and written to an attribute, so a stylesheet and a badge can both
 * use it without counting.
 *
 * **The feed is one `Tab` stop for its rows.** Each row takes focus itself and
 * is read by its label. `ArrowDown` and `ArrowUp` move to the next and the
 * previous row, `Home` and `End` to the first and the last, and `PageDown` and
 * `PageUp` move a row on or back from anywhere inside one, as in the APG feed
 * pattern. The controls inside a row stay in the `Tab` order. Set `total` when
 * the feed holds one page of a longer list, and each row says its place in the
 * whole of it.
 *
 * **`load-more` adds a button after the list** that sends `helix-load-more`,
 * for a feed that holds one page of a longer list. Append the next page, set
 * `loading` while it is on its way, and take `load-more` off once there is
 * nothing more. While the feed is loading the button stays, so focus stays on
 * it, and it is `aria-disabled` and sends nothing.
 *
 * @since 0.1.0
 * @status stable
 * @category feedback
 * @aliases Notification feed, Inbox, Activity
 * @documentation https://fusion.dev/helix/components/notifications
 *
 * @slot - The notifications.
 * @slot footer - Below the list, for a link to everything.
 * @slot header - Above the list, for a title and the mark-all control.
 *
 * @event {HelixDismissEvent} helix-dismiss - Fired when the user dismisses a row. The row dispatches it, and you can listen for it on the feed. Cancelable: cancel it to keep the row.
 * @event {HelixLoadMoreEvent} helix-load-more - Fired when a reader presses the `load-more` button, asking for the next page of the feed.
 * @event {HelixReadEvent} helix-read - Fired by an item when it is marked read or unread, and by the feed when everything is marked read. Cancelable.
 *
 * @csspart empty - Shown when there is nothing in the feed.
 * @csspart footer - The region below the list.
 * @csspart header - The region above the list.
 * @csspart list - The list itself.
 * @csspart live - A copy of the empty and loading messages, in a live region that screen readers announce when they change. Visually hidden in the styled tier.
 * @csspart loading - Shown while the feed is loading.
 * @csspart mark-all - The control that marks everything read.
 * @csspart more - The button after the list that asks for more, while `load-more` is set. It is `aria-disabled` while the feed is loading.
 *
 * @cssstate media - While a notification in the list holds something in its media slot, so every row keeps that column.
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
   * The feed's name, read by screen readers.
   */
  @property()
  label = ''

  /**
   * Whether to draw a button after the list that asks for the next page, by
   * sending `helix-load-more`. Take it off once there is nothing more.
   */
  @property({ attribute: 'load-more', type: Boolean })
  loadMore = false

  /**
   * The text of the `load-more` button.
   */
  @property({ attribute: 'load-more-label' })
  loadMoreLabel = 'Load more'

  /**
   * Whether to draw a control that marks everything read.
   */
  @property({ attribute: 'mark-all', type: Boolean })
  markAll = false

  /**
   * Label for the mark-all control.
   */
  @property({ attribute: 'mark-all-label' })
  markAllLabel = 'Mark all as read'

  /**
   * How many notifications there are in all, where the feed holds only some of
   * them, read as each row's `aria-setsize`. `-1` says the count is unknown.
   *
   * Unset, the browser counts the rows it can see, which is right for a feed
   * that holds everything.
   */
  @property({ type: Number })
  total?: number

  /**
   * How many items are unread, counted from the items themselves.
   *
   * Read-only because it is derived: a count the consumer could set is a second
   * source of truth for something the items already know.
   *
   * **The attribute is written in `updated`, never reflected.**
   * `@property({ reflect: true })` on a getter with no setter reflects once: Lit
   * reflects what is in `changedProperties`, and nothing puts a derived getter
   * there after the first update. Measured with two items, one marked read: the
   * property answered 1 and the attribute still said 2, so a badge reading the
   * attribute showed a count for an item the reader had just opened.
   */
  get unread(): number {
    return this.items.filter((item) => !item.read).length
  }

  /**
   * The notifications in the feed, in the order they are written.
   *
   * **Through a group as well as beside one**, because a feed may be cut into
   * named piles and the rows inside them are still the feed's rows: `unread`
   * counts them and `markEveryoneRead` moves them. A group that renders only its
   * first row while folded is still holding the rest, and a badge that dropped
   * to what was on screen would fall every time somebody folded something.
   *
   * One level, not a walk. A group inside a group is not a thing this family
   * has, and a recursive read here would invent one.
   *
   * `?? []` is the server. Lit's element shim carries attributes and not a tree,
   * so `children` is undefined there, and this getter is reached from `unread`
   * during the first update.
   */
  get items(): HelixHeadlessNotification[] {
    const isItem = (child: Element): child is HelixHeadlessNotification =>
      'isNotification' in child && (child as HelixHeadlessNotification).isNotification === true
    return this.knownChildren.flatMap((child) => {
      if (isItem(child)) {
        return [child]
      }
      const grouped = 'isNotificationGroup' in child ? [...(child.children ?? [])] : []
      return grouped.filter(isItem)
    })
  }

  /**
   * The content assigned to the list slot: the rows and the groups, in the
   * order they are written.
   *
   * Not `items`, which reaches through a group to the rows inside it. Assigning
   * those would lift them out of the group that is arranging them and hand the
   * feed a flat list again.
   */
  get rows(): Element[] {
    return this.knownChildren.filter(
      (child) =>
        ('isNotification' in child && child.isNotification === true) ||
        'isNotificationGroup' in child,
    )
  }

  /**
   * The groups written into the feed, in the order they are written.
   *
   * Only the ones that can fold answer to `foldEveryGroup`, but this is every
   * group: a consumer counting their sections should not have to know which of
   * them happen to be collapsible.
   */
  get groups(): HelixHeadlessNotificationGroup[] {
    return this.knownChildren.filter(
      (child): child is HelixHeadlessNotificationGroup => 'isNotificationGroup' in child,
    )
  }

  /**
   * Collapses every collapsible group, and returns how many changed.
   *
   * **A command, not a second place the state lives.** A group owns whether it
   * is folded; this asks all of them at once. The alternative, a property on the
   * feed that groups read, gives two answers to one question the moment a reader
   * unfolds one of them, and then neither is wrong and neither is right.
   *
   * **Through each group's own request**, so one refusal refuses one group: a
   * `helix-before-open` or `helix-before-close` prevented on a group leaves that
   * group where it was and the rest still move. `markEveryoneRead` takes the
   * same route for the same reason.
   *
   * **And unlike that one, this announces nothing of its own.** Marking read is
   * usually a round trip, so a feed-level `helix-read` lets a consumer refuse the
   * whole operation before any of it starts. Folding is not: it is where the
   * reader is looking, it reaches no server, and an event nobody can meaningfully
   * refuse is a channel that exists to be ignored.
   *
   * A group that is not `collapsible` is left alone rather than counted as
   * refusing, because it was never asked.
   */
  foldEveryGroup(folded = true): number {
    let moved = 0
    for (const group of this.groups) {
      if (!group.collapsible || group.open !== folded) {
        continue
      }
      if (group.requestOpen(!folded)) {
        moved += 1
      }
    }
    return moved
  }

  /**
   * Marks every unread item read, and returns how many changed.
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
    /* Hydrating a server's root, which routes by name: each row is sent to
       the list, and the header and footer already name theirs. */
    if (this.assignsByName) {
      for (const row of this.rows) {
        this.route(row, 'items')
      }
      return
    }
    list.assign(...this.rows)
    for (const name of ['header', 'footer']) {
      const slot = root?.querySelector?.<HTMLSlotElement>(`slot[name="${name}"]`)
      slot?.assign?.(...[...this.children].filter((child) => child.getAttribute('slot') === name))
    }
  }

  /** The row `Tab` stops on, once a reader has been to one. */
  private stopRow: HelixHeadlessNotification | undefined

  /**
   * The rows a reader can reach with the keys: every row in the feed, in order,
   * less the ones a folded group renders nowhere.
   */
  private get reachable(): HelixHeadlessNotification[] {
    return this.items.filter((row) => !('assignedSlot' in row) || row.assignedSlot !== null)
  }

  /** The row whose own box is the element focus is on, if it is one. */
  private rowFocused(target: EventTarget | undefined): HelixHeadlessNotification | undefined {
    return this.reachable.find((row) => rowBox(row) === target)
  }

  /** A row taking focus becomes the feed's stop, so `Tab` comes back to it. */
  private readonly handleFocusIn = (event: FocusEvent): void => {
    const row = this.rowFocused(event.composedPath()[0])
    if (row && row !== this.stopRow) {
      this.stopRow = row
      this.rove()
    }
  }

  /**
   * Moves between rows.
   *
   * The arrows and `Home` and `End` only from a row's own box, so a control in
   * a row keeps its keys. `PageDown` and `PageUp` from anywhere in a row, which
   * is how the APG feed pattern moves on from inside an article.
   */
  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) {
      return
    }
    const rows = this.reachable
    const from = event.composedPath()[0]
    const own = this.rowFocused(from)
    const inside = own ?? rows.find((row) => from instanceof Node && deepContains(row, from))
    if (!inside) {
      return
    }
    const to = feedStep(event.key, rows.indexOf(inside), rows.length, own !== undefined)
    if (to === undefined) {
      return
    }
    event.preventDefault()
    const next = rows[to]
    if (next) {
      this.stopRow = next
      this.rove()
      rowBox(next)?.focus()
    }
  }

  /**
   * Tells each row whether it is the stop, and where it sits in the feed.
   *
   * Through each row's own properties, written once it has hydrated, so a
   * server's markup stays the server's: every row is a stop until this runs.
   */
  private rove(): void {
    const rows = this.reachable
    const stop = rovingStop(rows, this.stopRow)
    /* Among every row, through a group as well: `total` counts notifications,
       and a group is a pile of them, not one more. */
    const items = this.items
    for (const row of items) {
      const position = items.indexOf(row) + 1
      whenHydrated(row, () => {
        row.stop = row === stop
        row.position = this.total === undefined ? 0 : position
        row.setSize = this.total ?? 0
      })
    }
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('helix-read', this.handleRead)
    this.addEventListener('focusin', this.handleFocusIn)
    this.addEventListener('keydown', this.handleKeydown)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('helix-read', this.handleRead)
    this.removeEventListener('focusin', this.handleFocusIn)
    this.removeEventListener('keydown', this.handleKeydown)
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
   * where some rows have an avatar and some do not draws two different left
   * edges for its text: measured on a four item feed, the rows without media
   * started their text 32 pixels to the left of the rows with it. The styled
   * tier turns this into a width; this tier ships no stylesheet and is
   * unaffected.
   *
   * **What is asked of each row is its light DOM, not the row.** A notification
   * publishes no property for this, and asking one would make the answer depend
   * on the row having drawn itself; a `[slot="media"]` child is there from the
   * moment the markup is parsed. The rows themselves come from `items`, which
   * does need them upgraded, and that is the honest limit rather than a claim
   * this had made the other way: a row that upgrades late is counted on the next
   * update, which its own `slotchange` asks for.
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
   * **A stylesheet cannot ask this, and the obvious selector fails twice over.**
   * `[part="header"]:not(:has(> slot:has(*)))`: `:has()` may not be nested
   * inside `:has()`, so the selector fails to parse and the whole rule is
   * discarded; and a slot's assigned nodes are not its DOM children, so
   * `slot:has(*)` reports whether the slot has *fallback* rather than whether a
   * consumer filled it, and would have been false either way. Both verified in a
   * browser: `insertRule` throws a `SyntaxError` on the first, and an assigned
   * element still leaves `slot.matches(':has(*)')` false.
   *
   * `slotFilled` is what the rest of the library already asks with. It is said
   * on the region inside this shadow root rather than on the host, because an
   * attribute written onto the host is a change to markup the consumer rendered,
   * which React reports on hydration and does not patch up.
   */
  private markEmpty(): void {
    /* `hidden` beside the `data-empty` mirror: `data-empty` is the hook a sheet
       selects on, and this tier ships none, so an empty region left in the box
       tree would be a gap a consumer cannot close without knowing to look for
       it. Both stay, since `[hidden]` is a UA rule and a sheet setting `display`
       on these parts outranks it. */
    /* The header is not empty while this element is drawing its own control into
       it. */
    markRegion(this.renderRoot, 'header', ['header'], { occupied: '[part="mark-all"]' })
    markRegion(this.renderRoot, 'footer', ['footer'])
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    /* Before `markEmpty`, which reads what is assigned: on a feed with no items
       nothing else ever schedules a second update, so a header asked about
       before its slot was filled stays hidden for the life of the element. The
       empty feed is the one state where the header is the only thing on screen. */
    this.assign()
    this.markEmpty()
    this.markMedia()
    this.rove()
    /* Written after the render rather than reflected during it, so it follows
       every change rather than only the first.

       **Zero is the absence of the attribute, not `unread="0"`.** Writing it at
       rest puts an attribute on the host that a consumer's server never sent,
       and `updated` is no later than hydration: it is the same microtask
       checkpoint `firstUpdated` runs in. Only a departure from resting writes. */
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
    /* Not empty where nobody can know yet: a server, and the render that has to
       be the server's. */
    const hasItems = this.items.length > 0 || !this.childrenKnown
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
      <div
        part="list"
        role="list"
        aria-busy=${this.loading ? 'true' : nothing}
        aria-label=${this.label || nothing}
      >
        <slot name="items" @slotchange=${this.handleSlotChange}></slot>
        ${this.renderStatus(hasItems)}
      </div>
      ${this.renderLive(hasItems)}
      ${
        this.loadMore
          ? html`<button
              part="more"
              type="button"
              aria-disabled=${this.loading ? 'true' : nothing}
              @click=${this.askForMore}
            >
              ${this.loadMoreLabel}
            </button>`
          : nothing
      }
      <div part="footer"><slot name="footer"></slot></div>`
  }

  /**
   * Asks for the next page, for the `load-more` button, unless a page is
   * already on its way.
   *
   * The button stays while the feed is loading, marked `aria-disabled`, so
   * focus stays on it: removed, it took focus with it to the body.
   */
  private readonly askForMore = (): void => {
    if (!this.loading) {
      this.dispatchEvent(new HelixLoadMoreEvent())
    }
  }

  /**
   * Marks everything read, and keeps focus in the feed.
   *
   * The button shows only while something is unread, so the press that
   * succeeds removes the button it was made on. Focus moves to the first row's
   * control, or the first control left in the feed.
   */
  private readonly handleMarkAll = (event: Event): void => {
    const button = event.currentTarget as HTMLElement
    const focused = this.shadowRoot?.activeElement === button
    this.markEveryoneRead()
    if (!focused) {
      return
    }
    void this.updateComplete.then(() => {
      if (button.isConnected) {
        return
      }
      const target =
        this.items
          .map(
            (row) =>
              row.shadowRoot?.querySelector<HTMLElement>('[part="dismiss"]') ??
              focusableElements(row)[0],
          )
          .find((one) => one !== undefined) ?? focusableElements(this)[0]
      target?.focus()
    })
  }
}

/** The box a row takes focus on. */
const rowBox = (row: HelixHeadlessNotification): HTMLElement | null =>
  row.shadowRoot?.querySelector<HTMLElement>('[part="item"]') ?? null

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-notifications': HelixHeadlessNotifications
  }
}
