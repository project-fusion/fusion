import {
  anchorElement,
  customElement,
  DrilldownController,
  HelixElement,
  KeyboardNavigationController,
  MixinCollection,
  MixinControllerOpen,
  type Placement,
  PopoverController,
  scrollItemIntoView,
  tellDisclosure,
} from '@fusion.dev/helix-core'
import { caretLeft } from '@fusion.dev/helix-icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'
import type { HelixHeadlessMenuItem } from '../item/menu-item.js'

/**
 * @summary A menu of commands, opened from a trigger.
 *
 * @description
 * The trigger is slotted and stays the consumer's own element, the same way the
 * tooltip takes one. The surface is rendered here, in the top layer through the
 * popover API, so it clears any ancestor with `overflow: hidden` without a
 * `z-index` anywhere.
 *
 * **It drills down rather than flying out.** A submenu replaces what is on
 * screen and a back row returns, instead of opening a second panel beside the
 * first. Panels beside panels need a diagonal path a pointer has to travel
 * without straying, they run off the edge of a narrow window, and on a touch
 * screen there is no hover to open them with at all. One panel that changes
 * what it holds has none of those problems and reads the same on a phone.
 *
 * The open page is held here rather than in each item, because only one page
 * shows at a time and something has to know which. Items are told by property,
 * not by attribute: an attribute written onto a consumer's element after it
 * upgrades is a hydration mismatch waiting to happen.
 *
 * @since 0.1.0
 * @status experimental
 * @category overlays
 * @aliases Dropdown, Action menu
 * @documentation https://helix.fusion.dev/components/menu
 *
 * @slot - The items.
 * @slot trigger - What opens it.
 *
 * @event {HelixBeforeCloseEvent} helix-before-close - Fired before it closes, and cancelable.
 * @event {HelixBeforeOpenEvent} helix-before-open - Fired before it opens, and cancelable.
 * @event {HelixSelectEvent} helix-select - Fired when an item is chosen. Cancelable: refusing it takes the decision and nothing moves.
 * @event {Event} toggle - Says the state moved, carrying `newState` and `oldState`.
 *
 * @csspart back - The control that returns from a submenu.
 * @csspart back-mark - The glyph on the back control of a submenu.
 * @csspart empty - Shown when there are no items to show.
 * @csspart header - The bar above a submenu, holding the way back and its name.
 * @csspart loading - Shown while the items are still on their way.
 * @csspart surface - The floating panel the menu is drawn on.
 * @csspart title - The name of the submenu that is showing.
 */
@customElement('helix-headless-menu')
export class HelixHeadlessMenu extends MixinCollection(MixinControllerOpen(HelixElement)) {
  /**
   * What the row returning from a submenu reads.
   */
  @property({ attribute: 'back-label' })
  backLabel = 'Back'

  /**
   * Accessible name for the surface.
   */
  @property()
  label = 'Menu'

  /**
   * Space between the trigger and the surface, in pixels.
   */
  @property({ type: Number })
  offset = 4

  /**
   * Preferred side.
   *
   * It moves if that side does not fit.
   */
  @property()
  placement: Placement = 'bottom-start'

  /**
   * Which page is showing, and what is on it.
   *
   * A controller rather than fields here, because none of this is about menus:
   * a settings panel or a navigation tree wants the same shape. It holds a real
   * stack, so `back()` returns one level rather than to the root.
   */
  private readonly drilldown = new DrilldownController<HelixHeadlessMenuItem>(this, {
    isRow: (element: Element): boolean => 'isMenuItem' in element && element.isMenuItem === true,
    root: () => [...this.children].filter((child) => child.slot !== 'trigger'),
    slot: 'submenu',
  })

  /**
   * Moving between rows, which is not this element's own business any more.
   *
   * `selects` false, because arriving at Delete must not delete: moving and
   * choosing are one act in a radio group and two acts here, which is the
   * distinction the controller was already drawing for `Tabs`.
   *
   * The origin is the selection, and `focus` is the wrong reading however right
   * it looks: that origin also carries a rule a menu must not follow, that a
   * press which did not come from the set moves nothing. That rule is there for
   * a tab panel, which is a tab stop beside the tabs; a menu's panel holds the
   * rows and nothing else, and Down on a menu that has just opened is how a
   * reader gets to the first row at all.
   *
   * The horizontal pair is reserved rather than released. Right opens a
   * submenu and left comes back, which are the platform's own bindings for a
   * menu that drills, so those keys are spoken for here rather than unhandled.
   */
  protected readonly keys = new KeyboardNavigationController(this, {
    items: () => this.items,
    reserved: () => ['ArrowLeft', 'ArrowRight'],
    selects: () => false,
  })

  private readonly panel = new PopoverController(this, {
    anchor: () => this.trigger,
    // The host is `display: contents`, so it has no box a press can land in.
    // What counts as inside is the surface, plus the trigger, whose own click
    // handler decides what a press there means.
    boundary: () => this,
    offset: () => this.offset,
    onDismiss: () => this.hide(),
    placement: () => this.placement,
    surface: () => this.renderRoot?.querySelector<HTMLElement>('[part="surface"]'),
  })

  /**
   * Tells a slotted trigger the disclosure state, by property.
   *
   * A control that opens a menu has to say so. By property rather than by
   * attribute, which is the class note's rule about items applied one level up:
   * an attribute written onto a consumer's element after it upgrades is a
   * hydration mismatch waiting to happen.
   */
  private tellTrigger(): void {
    const slot = this.renderRoot?.querySelector<HTMLSlotElement>('slot[name="trigger"]')
    tellDisclosure(slot?.assignedElements({ flatten: false })[0], this.open)
  }

  /** The element the surface opens against. */
  private get trigger(): HTMLElement {
    return anchorElement(
      this.renderRoot?.querySelector<HTMLSlotElement>('slot[name="trigger"]'),
      this,
    )
  }

  /** The items on the page that is showing, which is what the keys move over. */
  private get items(): HelixHeadlessMenuItem[] {
    /* Disabled rows are not there for the keyboard.
     *
     * A disabled row renders no `tabindex` and cannot take focus, so leaving it
     * in the list has the arrow keys compute a move onto it, call `focus()` on
     * something unfocusable, and stop: the keyboard is then stuck one row above
     * every disabled item in the menu. `Drilldown` filters for the same
     * reason. */
    return this.drilldown.rows.filter((row) => !row.disabled)
  }

  /** Opens the menu. */
  show(): void {
    if (this.open || !this.requestOpen(true)) {
      return
    }
    this.updateComplete.then(() => {
      // Raised in `updated()`, which the state change has just scheduled.
      this.items[0]?.focus()
    })
  }

  /** Closes the menu, and forgets which page was showing. */
  hide(): void {
    if (!this.open || !this.requestOpen(false)) {
      return
    }
    this.panel.hide()
    this.drilldown.reset()
    /* Only where the menu still had it. A dismissal that did not take focus with
       it, a press somewhere else on the page, should leave focus where the
       reader put it rather than yanking it back to the trigger. `Popover`
       guards the same way, and `document.activeElement` retargets to the item
       host here, which is what makes the containment test work. */
    if (this.contains(document.activeElement)) {
      this.trigger.focus()
    }
  }

  /** Shows an item's submenu in place of the current page. */
  private enter(item: HelixHeadlessMenuItem): void {
    if (!this.drilldown.enter(item)) {
      return
    }
    this.updateComplete.then(() => this.items[0]?.focusItem())
  }

  /** Returns to the page above, or closes when there is none. */
  private leave(): void {
    if (this.drilldown.atRoot) {
      this.hide()
      return
    }
    /* Held before going back, because focus returns to the row that opened the
       page being left: a reader who drills in and comes straight out should be
       on the row they pressed, not at the top of a list they have already
       read. */
    const leaving = this.drilldown.page
    this.drilldown.back()
    this.updateComplete.then(() => leaving?.focus())
  }

  private readonly handleSelect = (event: Event): void => {
    const item = event.target
    if (!this.items.includes(item as HelixHeadlessMenuItem)) {
      return
    }
    const chosen = item as HelixHeadlessMenuItem
    if (chosen.hasSubmenu) {
      // A row that opens a page has not chosen anything, so its select does not
      // leave this element: a consumer listening for a choice would otherwise
      // hear one every time a reader looked in a submenu.
      event.stopPropagation()
      this.enter(chosen)
      return
    }
    /* **Closed once the choice has been heard, and only if it stood.** This
       listener runs in capture, ahead of the consumer's on this same host, and
       closing here closed the menu before anybody could refuse the choice: a
       `helix-select` documented as cancelable, whose refusal left the menu shut
       anyway, and a page that heard `helix-before-close` and `toggle` before
       the choice that caused them. Found running the events example. The
       dispatch is synchronous, so a microtask is after all of it. */
    queueMicrotask(() => {
      if (!event.defaultPrevented) {
        this.hide()
      }
    })
  }

  /**
   * Keeps whatever has focus in sight, however it got there.
   *
   * On `focusin` rather than in the branches that move focus: a row reached by
   * Tab, or focused by the drilldown on the way into a page, can otherwise sit
   * below the fold of a scrolled panel.
   */
  private readonly handleFocusIn = (event: FocusEvent): void => {
    const item = this.items.find((row) => row.contains(event.target as Node))
    if (!item) {
      return
    }
    /* `surface`, which is the part this template renders and the name the
       whole library spells this box with.

       Keep the two in step. A lookup asking for a name the template does not
       render finds null, and `scrollItemIntoView` then runs with no scroller and
       takes the page behind the menu with it, which is the one thing that method
       exists to prevent. */
    const surface = this.renderRoot.querySelector<HTMLElement>('[part="surface"]')
    scrollItemIntoView(item, { padding: 4, ...(surface ? { scroller: surface } : {}) })
  }

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    const items = this.items
    const at = items.indexOf(document.activeElement as HelixHeadlessMenuItem)

    if (event.key === 'Escape') {
      event.stopPropagation()
      this.leave()
    } else if (event.key === 'ArrowRight' && items[at]?.hasSubmenu) {
      this.enter(items[at] as HelixHeadlessMenuItem)
    } else if (event.key === 'ArrowLeft') {
      this.leave()
    } else if (event.key === 'Tab') {
      /* Out, and the panel goes with it.
       *
       * Nothing else closes the menu when focus leaves it, so tabbing out of an
       * open one would leave a shadowed panel in the top layer sitting over
       * whatever the reader tabbed to. Deliberately not prevented: focus carries on
       * outward, which is what the reader asked for. And deliberately not a
       * focus trap, because a menu is not a modal and Tab is a way out of one. */
      this.hide()
      return
    } else {
      return
    }
    event.preventDefault()
  }

  private readonly handleTriggerClick = (): void => {
    if (this.open) {
      this.hide()
    } else {
      this.show()
    }
  }

  override connectedCallback(): void {
    super.connectedCallback()
    /* Capture, so a drill-in never reaches a consumer's own listener on this
       same host. The guarantee the class documents is that choosing a row that
       opens a submenu is navigation rather than a choice, and stopping it in the
       bubble phase stops it for ancestors and not for the siblings registered
       here. `Drilldown` learned this already. */
    this.addEventListener('helix-select', this.handleSelect, true)
    this.addEventListener('keydown', this.handleKeydown)
    this.addEventListener('focusin', this.handleFocusIn)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('helix-select', this.handleSelect, true)
    this.removeEventListener('keydown', this.handleKeydown)
    this.removeEventListener('focusin', this.handleFocusIn)
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    // Every update, so a trigger slotted after the first render is told too.
    this.tellTrigger()
    /* Put the panel where `open` says, however it got there. Raising it in
       `show()` and lowering it in `hide()` alone leaves a menu opened by
       declaring `open` visible, out of the top layer and unanchored: every
       imperative path works and every declarative one is half-open. */
    if (changed.has('open')) {
      /* Here rather than a microtask later: `updated()` runs after the render,
         so the panel is no longer `display: none` and `showPopover` is safe. */
      if (this.open) {
        this.panel.show()
      } else {
        this.panel.hide()
      }
    }
    // Every item shows or hides itself: which page is open is this element's
    // business, and where an item belongs is the item's. Set as a property, so
    // nothing is written onto a consumer's element.
    for (const child of this.children) {
      const item = child as HelixHeadlessMenuItem
      if (item.isMenuItem !== true) {
        continue
      }
      this.mark(item, this.drilldown.atRoot)
    }
    this.markColumns()
  }

  /**
   * Says whether the page showing reserves a column either side of its labels.
   *
   * **A fact no row can answer for itself**, which is why the columns were
   * unconditional. A row knows about its own start slot and nothing about its
   * neighbors, so a page where one row has an icon and the rest do not draws two
   * different left edges for its text. Reserving on every row instead charged
   * every menu for a column nothing in it was ever going to fill: measured on a
   * page of two plain rows, the text started 36 pixels into the row, of which 12
   * was the row's own padding and 24 a leading column and its seam. The same
   * page now starts at 12, and a page where one row does have a mark still
   * starts both of its rows at 36.
   *
   * **Per page rather than per menu**, because a submenu is a different set of
   * rows: a page of checkable filters under a page of plain ones reserves on one
   * and not on the other, and asking the whole tree would hand the plain page
   * the filters' column. `Notifications` answers the same question for its media
   * column the same way, and for the same reason.
   *
   * Read off the light DOM rather than off the rows, so it does not depend on
   * which children have upgraded by the time this runs.
   */
  private markColumns(): void {
    const rows = this.drilldown.rows
    this.toggleState(
      'start',
      rows.some((row) => row.querySelector(':scope > [slot="start"]') !== null),
    )
    /* Checkable and checked both, not just checked. A row that can be ticked
       holds the column open while it is not, or the labels on a filter page step
       sideways as the reader ticks their way down it. */
    this.toggleState(
      'mark',
      rows.some((row) => row.checkable || row.checked || this.drilldown.hasPage(row)),
    )
  }

  /**
   * Walks the tree marking which rows are on the page showing.
   *
   * Recursive rather than two levels by hand: without `showingSubmenu` on a
   * nested row, drilling into a third-level submenu renders the header over an
   * empty panel, the page existing while its rows are still marked as belonging
   * to the level above. `Drilldown.mark()` is the same walk.
   *
   * `slot === 'submenu'` rather than every child, because a row's other
   * children are its label and its icons.
   */
  private mark(item: HelixHeadlessMenuItem, onPage: boolean): void {
    const page = this.drilldown.page
    item.onPage = onPage
    /* **Holding the page counts, not just being it.** `item === page` was right
       for two levels and silently wrong for three: on the third page the row at
       the top is neither on a page nor the page, so it rendered `nothing`, and
       rendering nothing takes its `slot[name="submenu"]` with it. The rows below
       had nowhere to be assigned and the reader got a header over an empty
       panel: the exact failure `showingSubmenu` was added to prevent, one level
       further down. Every row on the way to the open page has to keep its slot. */
    item.showingSubmenu = page !== null && item.contains(page)
    for (const child of item.children) {
      const nested = child as HelixHeadlessMenuItem
      if (nested.isMenuItem === true && child.slot === 'submenu') {
        this.mark(nested, item === this.drilldown.page)
      }
    }
  }

  protected override render(): TemplateResult {
    return html`<slot name="trigger" @click=${this.handleTriggerClick}></slot>
      <div
        part="surface"
        popover="manual"
        role="menu"
        aria-busy=${this.loading ? 'true' : nothing}
        aria-label=${this.label}
        data-drilled=${this.drilldown.atRoot ? nothing : ''}
        ?hidden=${!this.open}
      >
        ${
          // A header rather than a row in the list. The way back is not one of
          // the things on this page, and putting it in the list means an arrow
          // press lands on it as though it were.
          this.drilldown.atRoot
            ? nothing
            : html`<div part="header">
                <button
                  part="back"
                  type="button"
                  aria-label=${this.backLabel}
                  @click=${() => this.leave()}
                >
                  <svg part="back-mark" fill="currentColor" viewBox=${caretLeft.viewBox} aria-hidden="true">
                    ${unsafeSVG(caretLeft.content)}
                  </svg>
                </button>
                <span part="title">${this.drilldown.label}</span>
              </div>`
        }
        <slot @slotchange=${(event: Event) => this.countRows(event)}></slot>
        ${this.renderStatus(this.hasRows)}
      </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-menu': HelixHeadlessMenu
  }
}
