import { customElement, HelixElement, hostAria, MixinControllerOpen } from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import type { HelixHeadlessNotification } from '../notification/notification.js'

const TRIGGER_ID = 'trigger'
const ITEMS_ID = 'items'

/**
 * @summary A named set of notifications, which can be collapsed to the first of
 * them.
 *
 * @description
 * **What groups with what is the consumer's, and this never guesses.** A feed
 * can be cut by day, by the thing being talked about, by the person doing the
 * talking, or by nothing at all, and which of those is right is a question about
 * the product. So a group is written by hand around the rows that belong
 * together and told what to call itself, exactly as `FilterField` is told what
 * its operators are.
 *
 * **Collapsed shows the first row and assigns the rest nowhere.** Not `hidden`,
 * not `inert`, not a stylesheet: the slot is assigned imperatively, so a
 * collapsed group's later rows are absent from the layout and from the
 * accessibility tree with no CSS at all, which is what the headless tier claims
 * for itself. `Notifications` already assigns its list this way and this borrows
 * the mechanism.
 *
 * The count is separate from how many rows are written, because it usually is: a
 * group saying five with one row under it and a link to the rest is the common
 * shape, and computing the number from the children would make that unsayable.
 * Left off, it is the number of rows.
 *
 * @since 0.24.0
 * @status stable
 * @category feedback
 * @aliases NotificationSection, FeedGroup
 * @documentation https://fusion.dev/helix/components/notifications
 *
 * @slot - The notifications in this group.
 * @slot actions - Beside the count, for a link to the rest of them.
 * @slot label - Replaces the group's name, for a heading that needs a mark in it.
 *
 * @event {HelixBeforeCloseEvent} helix-before-close - Fired before the group folds, and cancelable.
 * @event {HelixBeforeOpenEvent} helix-before-open - Fired before the group unfolds. Cancelable: refusing it takes the decision and nothing moves.
 *
 * @csspart actions - The trailing region of the header.
 * @csspart count - How many are in the group.
 * @csspart header - The label, the count and the action together.
 * @csspart items - The region holding the notifications.
 * @csspart label - What the group is called.
 * @csspart trigger - The control that collapses and expands, where collapsible.
 *
 * @cssstate open - While the group shows every notification in it rather than the first.
 */
@customElement('helix-headless-notification-group')
export class HelixHeadlessNotificationGroup extends MixinControllerOpen(HelixElement) {
  /**
   * Manual, which is what lets a fold remove rows rather than hide them.
   *
   * Under automatic assignment every unnamed child lands in the default slot and
   * the only ways to fold are `hidden`, `inert` or a stylesheet: the first two
   * leave the rows in the layout or in the tree, and the third puts the state
   * somewhere a headless consumer has to re-implement. Assigning by hand, a
   * folded group's later rows are assigned nowhere and render nothing at all.
   *
   * `Notifications` takes the same option for a neighboring reason, and its
   * note records the other half of it: the rows are ordinary children a consumer
   * writes with no `slot`, and wrapping them any other way means editing their
   * markup.
   */
  static override shadowRootOptions: ShadowRootInit = {
    ...HelixElement.shadowRootOptions,
    slotAssignment: 'manual',
  }

  /**
   * Whether the group can be collapsed to its first row.
   *
   * Off by default, because a group is a heading before it is a control: a feed
   * cut by day wants its days named and rarely wants them folded, and a control
   * that does nothing anybody asked for is still a tab stop.
   */
  @property({ reflect: true, type: Boolean })
  collapsible = false

  /**
   * How many notifications this group stands for.
   *
   * **Not the number of rows, and that is the point.** A group saying five with
   * one row under it and a link to the rest is the ordinary shape of a feed that
   * has been trimmed, and deriving this from the children would make it
   * unsayable. Left off, it is the number of rows.
   */
  @property({ type: Number })
  count?: number

  /**
   * What the group is called: a day, a subject, a person.
   *
   * The slot's fallback rather than its replacement, so a consumer who wants a
   * mark beside the name slots `label` and this goes unused.
   */
  @property()
  label = ''

  /**
   * What this is, for the feed above it to recognize without importing it.
   *
   * The same seam `Notification` uses: a root reads a child's markers rather
   * than its constructor, so the two tiers never have to agree about which class
   * a consumer happened to instantiate.
   */
  readonly isNotificationGroup = true

  /** The notifications written into this group, in the order they were given. */
  get items(): HelixHeadlessNotification[] {
    /* What a render may know: nothing on a server, whose shim has no tree and
       where spreading `children` threw, and nothing while hydrating what one
       sent. */
    return this.knownChildren.filter(
      (child) => (child as HelixHeadlessNotification).isNotification === true,
    ) as HelixHeadlessNotification[]
  }

  /** How many the group says it stands for, which is the count or the rows. */
  get total(): number {
    return this.count ?? this.items.length
  }

  /**
   * The same number where anything can know it, and nothing where nothing can.
   *
   * **A server has no rows to count and must not say zero.** `items` reads
   * `knownChildren`, which is empty on a server and while hydrating what one
   * sent, so a group written around three notifications with no `count` of its
   * own served `<span part="count">0</span>`: a crawler, and a reader before the
   * page has run, given a group that says it holds nothing over the three rows
   * underneath it. Not knowing is not zero, which is the rule `MixinCollection`
   * already states about an empty list.
   *
   * A declared `count` is a fact about the group rather than about its children,
   * so it serves whole, which is the shape a feed trimmed by a server already
   * wants: it is the number the rows were cut from.
   */
  private get counted(): number | undefined {
    return this.count ?? (this.childrenKnown ? this.items.length : undefined)
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    /* A group of rows in a feed, named. `group` rather than `region`, which is a
       landmark: a feed cut into five days would put five landmarks on the page,
       and a landmark per day is a page whose landmark list is a calendar. */
    hostAria(
      this.internals,
      this.label === '' ? { role: 'group' } : { label: this.label, role: 'group' },
    )
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.finishHydration()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.assign()
  }

  /**
   * Puts the rows the group is showing into the slot, and the rest nowhere.
   *
   * **Assignment rather than hiding, which is what makes this work with no
   * stylesheet.** A row that is not assigned to a slot renders nothing at all:
   * it is out of the layout, out of the tab order and out of the accessibility
   * tree, in both tiers, without a rule anywhere. `hidden` would do the first
   * three and `inert` only the last two, and either would put the collapse in a
   * place a headless consumer has to re-implement.
   *
   * Collapsed keeps the first row rather than none, because a group folded to
   * nothing is a heading with a number after it and no reason to believe there
   * is anything behind it. The one row is the evidence.
   */
  private assign(): void {
    const slot = this.renderRoot?.querySelector?.<HTMLSlotElement>('slot:not([name])')
    if (!slot?.assign) {
      return
    }
    const items = this.items
    const showing = this.collapsible && !this.open ? items.slice(0, 1) : items
    /* Hydrating a server's root, which routes by name: a row the group shows
       takes the unnamed slot, and a folded one is sent to a name no slot has,
       which renders it nowhere, the same as leaving it unassigned. */
    if (this.assignsByName) {
      for (const item of items) {
        this.route(item, showing.includes(item) ? undefined : 'folded')
      }
      return
    }
    slot.assign(...showing)
    const action = this.renderRoot?.querySelector?.<HTMLSlotElement>('slot[name="actions"]')
    action?.assign?.(
      ...[...this.children].filter((child) => child.getAttribute('slot') === 'actions'),
    )
    const label = this.renderRoot?.querySelector?.<HTMLSlotElement>('slot[name="label"]')
    label?.assign?.(...[...this.children].filter((child) => child.getAttribute('slot') === 'label'))
  }

  private readonly handleToggle = (): void => {
    this.toggleOpen()
  }

  /*
   * The rows region carries no name, and that is not an omission.
   *
   * It held `aria-label="3 more"` while folded, on a `<div>` with no role. A
   * generic element prohibits naming, so every engine drops the name and the
   * sentence reached nobody: valid markup, no warning, and a promise on the
   * accessibility side of the component with nothing behind it. The trigger
   * beside it already says the group's name, its count and that it is collapsed,
   * which is where a reader is when they need to know, and it is a control they
   * can act on rather than a region they have to be moved to.
   */
  protected override render(): TemplateResult {
    const counted = this.counted
    /* The box either way, so the count arriving after hydration fills a space
       the server already reserved rather than widening the header under the
       reader. */
    const count = html`<span part="count">${counted ?? nothing}</span>`
    return html`<div part="header">
        ${
          this.collapsible
            ? html`<button
                id=${TRIGGER_ID}
                aria-controls=${ITEMS_ID}
                aria-expanded=${this.open ? 'true' : 'false'}
                part="trigger"
                type="button"
                @click=${this.handleToggle}
              >
                <span part="label"><slot name="label">${this.label}</slot></span>
                ${count}
              </button>`
            : html`<span part="label"><slot name="label">${this.label}</slot></span>
                ${count}`
        }
        <span part="actions"><slot name="actions"></slot></span>
      </div>
      <div id=${ITEMS_ID} part="items">
        <slot></slot>
      </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-notification-group': HelixHeadlessNotificationGroup
  }
}
