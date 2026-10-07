import {
  AriaForwardController,
  anchorElement,
  customElement,
  DrilldownController,
  deepActiveElement,
  deepContains,
  focusTarget,
  HelixElement,
  inlineStep,
  KeyboardNavigationController,
  linkDescription,
  MixinCollection,
  MixinControllerOpen,
  type Placement,
  PopoverController,
  scrollItemIntoView,
  slottedWords,
  tellDisclosure,
  typeaheadBy,
  unlinkDescription,
  words,
} from '@fusion.dev/helix-core'
import { caretLeft } from '@fusion.dev/helix-icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'
import { LongPress } from '../../speed-dial/long-press.js'
import type { HelixHeadlessMenuItem } from '../item/menu-item.js'
import type { HelixHeadlessMenuSection } from '../section/menu-section.js'

/** Whether an element is a `Menu.Item`, read by identity across both tiers. */
const isItem = (element: Element): element is HelixHeadlessMenuItem =>
  element !== null &&
  typeof element === 'object' &&
  'isMenuItem' in element &&
  (element as Partial<HelixHeadlessMenuItem>).isMenuItem === true

/** How long a mouse rests on a row under `flyout` before its submenu opens, in milliseconds. */
const HOVER_DELAY = 100

/** How long the grace area toward an open submenu holds, in milliseconds, as Radix's does. */
const GRACE = 300

/** Whether a point is inside a triangle. */
const inTriangle = (x: number, y: number, [a, b, c]: [number, number][]): boolean => {
  if (!a || !b || !c) {
    return false
  }
  const side = (p: [number, number], q: [number, number]): number =>
    (q[0] - p[0]) * (y - p[1]) - (q[1] - p[1]) * (x - p[0])
  const one = side(a, b)
  const two = side(b, c)
  const three = side(c, a)
  return (one >= 0 && two >= 0 && three >= 0) || (one <= 0 && two <= 0 && three <= 0)
}

/** Whether an element is a `Menu.Section`, read by identity across both tiers. */
const isSection = (element: Element): element is HelixHeadlessMenuSection =>
  'isMenuSection' in element && element.isMenuSection === true

/**
 * @summary A menu of commands that opens from a trigger.
 *
 * @description
 * The trigger is slotted and stays your own element, as with the tooltip. The
 * menu renders its surface in the top layer with the popover API, so an
 * ancestor with `overflow: hidden` does not clip it and it needs no `z-index`.
 *
 * Slot a `helix-button` or `helix-icon-button` as the trigger, and the menu
 * tells it that it opens a menu and whether the menu is open, inside its own
 * shadow root. On a plain element, such as a `<button>`, the menu writes
 * `aria-haspopup="menu"` and `aria-expanded`, from a frame after its own first
 * render, so a server's markup is never changed while a framework hydrates it.
 * It never writes `aria-expanded` where you wrote it yourself.
 *
 * Submenus drill down by default. A submenu replaces the panel's content, and a
 * back row returns to the previous page. One panel stays inside a narrow
 * window, and works on touch screens, which have no hover.
 *
 * **`submenus="flyout"` opens each submenu in a panel of its own beside its
 * row**, as React Aria's `SubmenuTrigger` and Radix's `Sub` do. Resting the
 * pointer on the row opens it, and a pointer crossing toward the open panel
 * over the rows between keeps it open, as Radix's grace area does. Right Arrow
 * opens a row's submenu on its first row, and Left Arrow or Escape closes it
 * and returns focus to the row, the two arrows swapping on a right-to-left
 * page. The row says `aria-expanded`, and the panel is a `menu` named by the
 * row.
 *
 * The root holds which page is open, because only one page shows at a time. It
 * sets this on items as a property, never as an attribute. An attribute written
 * onto your element after it upgrades causes a hydration mismatch.
 *
 * Group rows under a heading with `Menu.Section`, which is a `group` named by
 * its heading. Between runs of rows, a `<helix-divider>` is a separator a
 * screen reader announces.
 *
 * Keys: Enter, Space or Down Arrow on the trigger opens the menu on its first
 * row, and Up Arrow on its last. In the menu, Up and Down Arrow move between
 * rows, Home and End go to the first and the last, a typed letter moves to
 * the next row whose name starts with it, Enter and Space choose, Right Arrow
 * opens a row's submenu and Left Arrow goes back, the two swapping on a
 * right-to-left page, and Escape closes the menu and returns focus to the
 * trigger. Tab closes it and moves on.
 *
 * While it is open, the surface carries the trigger's width as
 * `--floating-anchor-inline-size` and the room left below it as
 * `--floating-available-block-size`, as Radix's dropdown menu publishes its
 * trigger's width, for a menu as wide as its trigger:
 * `helix-menu::part(surface) { min-inline-size: var(--floating-anchor-inline-size) }`.
 *
 * With `context`, the trigger is an area and the menu is its context menu: a
 * right-click, a long press, Shift+F10 or the menu key over the area opens it
 * at the pointer, or at the area's corner from the keyboard, as Radix's context
 * menu does. A press on the area does not open it, and closing it returns focus
 * to where it was. A touch or a pen held still on the area opens it too, on
 * every browser, since iOS sends no `contextmenu` for one.
 *
 * **A trigger with its own action.** With `open-on="long-press"`, a press on
 * the trigger is the trigger's own, and a press held for half a second opens
 * the menu, as React Aria's `trigger="longPress"` does. Alt+Down or Alt+Up
 * opens it from the keyboard, and the trigger is described by
 * `long-press-label`, which says so.
 *
 * @since 0.1.0
 * @status stable
 * @category overlays
 * @aliases Dropdown, Action menu
 * @documentation https://fusion.dev/helix/components/menu
 *
 * @slot - The items.
 * @slot trigger - The control that opens the menu, or with `context` the area a context menu opens over.
 *
 * @event {HelixBeforeCloseEvent} helix-before-close - The menu is about to close. Cancelable: cancel it to keep it open.
 * @event {HelixBeforeOpenEvent} helix-before-open - The menu is about to open. Cancelable: cancel it to keep it closed.
 * @event {HelixSelectEvent} helix-select - An item was chosen. Cancelable: cancel it to keep the menu open.
 * @event {ToggleEvent} toggle - The menu opened or closed. The event carries `newState` and `oldState`.
 *
 * @csspart back - The control that returns from a submenu.
 * @csspart back-mark - The glyph on the back control of a submenu.
 * @csspart empty - The text shown when the menu has no items.
 * @csspart header - The bar above a submenu, holding the way back and its name.
 * @csspart live - A live region that repeats the empty and loading text, so screen readers announce it when it changes. Visually hidden in the styled tier.
 * @csspart loading - The text shown while the items are loading.
 * @csspart surface - The floating panel the menu is drawn on.
 * @csspart title - The name of the submenu that is showing.
 *
 * @cssproperty --floating-anchor-inline-size - The trigger's width, written on the panel while it is open, as in `min-inline-size: var(--floating-anchor-inline-size)`. Read it; a value set here is written over.
 * @cssproperty --floating-available-block-size - The room between the panel and the edge of the screen it opens toward, written on the panel while it is open. Read it; a value set here is written over.
 *
 * @cssstate drilled - A submenu's page is showing, so content that is not a row can hide with the top page.
 * @cssstate mark - A row on the current page has a checkbox or a link, so every row keeps the trailing column.
 * @cssstate open - While the menu is open.
 * @cssstate start - A row on the current page has content in its leading column, so every row keeps that column.
 */
@customElement('helix-headless-menu')
export class HelixHeadlessMenu extends MixinCollection(MixinControllerOpen(HelixElement)) {
  /**
   * The key this family's words are registered under, its styled tag:
   * `registerWords('de', { 'helix-menu': { backLabel: 'Zurück' } })`.
   */
  static words = 'helix-menu'

  /**
   * The text of the row that returns from a submenu.
   */
  @words
  @property({ attribute: 'back-label' })
  backLabel = 'Back'

  /**
   * Whether the menu is the trigger's context menu: it opens where the reader
   * asks for one, with a right-click, a long press, Shift+F10 or the menu key.
   */
  @property({ reflect: true, type: Boolean })
  context = false

  /**
   * Accessible name for the surface.
   *
   * Empty by default, which names the surface by its trigger, so a menu opened
   * from "Actions" is announced as "Actions". An `aria-label` or
   * `aria-labelledby` on the host names it too, and wins over both.
   */
  @property()
  label = ''

  /** Whether submenus open beside their rows. */
  private get flies(): boolean {
    return this.submenus === 'flyout'
  }

  /** The rows of the top page, read through each section. */
  private get topRows(): HelixHeadlessMenuItem[] {
    return [...this.children]
      .filter((child) => child.slot !== 'trigger')
      .flatMap((child) => (isSection(child) ? [...child.children] : [child]))
      .filter(isItem)
  }

  /** The rows of a submenu, or of the top page for null. */
  private rowsOf(holder: HelixHeadlessMenuItem | null): HelixHeadlessMenuItem[] {
    return holder
      ? [...holder.children].filter(
          (child): child is HelixHeadlessMenuItem => child.slot === 'submenu' && isItem(child),
        )
      : this.topRows
  }

  /** The row whose submenu holds a row, or null for a row of the top page. */
  private holderOf(row: HelixHeadlessMenuItem): HelixHeadlessMenuItem | null {
    const parent = row.parentElement
    return row.slot === 'submenu' && parent && isItem(parent) ? parent : null
  }

  /** The submenus open, from the top page down to the deepest. */
  private get openPages(): (HelixHeadlessMenuItem | null)[] {
    const pages: (HelixHeadlessMenuItem | null)[] = []
    for (let page = this.drilldown.page; page; page = this.holderOf(page)) {
      pages.unshift(page)
    }
    return [null, ...pages]
  }

  /**
   * The submenu the keys move in under `flyout`: the one holding the row with
   * focus, or the deepest open one.
   */
  private get keyPage(): HelixHeadlessMenuItem | null {
    for (const page of this.openPages) {
      const active = this.rowsOf(page).find((row) => row.active)
      if (active) {
        return page
      }
    }
    return this.drilldown.page
  }

  /** Opens a submenu and closes the ones below it, or closes them all for null. */
  private openPage(holder: HelixHeadlessMenuItem | null): void {
    if (holder) {
      this.drilldown.enter(holder)
    } else {
      this.drilldown.reset()
    }
  }

  /**
   * The description a trigger gives under `open-on="long-press"`, saying how
   * to open the menu. Translate it with the rest of your interface.
   */
  @words
  @property({ attribute: 'long-press-label' })
  longPressLabel = 'Long press or press Alt+Down to show the menu'

  /**
   * Space between the trigger and the surface, in pixels.
   */
  @property({ type: Number })
  offset = 4

  /** Whether the trigger opens the menu only on a held press. */
  private get pressHeld(): boolean {
    return !this.context && this.openOn === 'long-press'
  }

  /**
   * Watches the trigger for a held press: under `open-on="long-press"`, and
   * for a touch or a pen on a context menu's area.
   */
  private readonly longPress = new LongPress(this, {
    onLongPress: () => {
      if (this.context) {
        const at = this.heldAt
        if (at) {
          this.openContextAt(at)
        }
        return
      }
      if (!this.open) {
        this.show()
      }
    },
  })

  /** Where a held press on a context menu's area is, to open the menu there. */
  private heldAt: { x: number; y: number } | undefined

  /**
   * What opens the menu from its trigger. `long-press` leaves a press to the
   * trigger's own action and opens the menu on a press held for half a second,
   * or on Alt+Down or Alt+Up.
   */
  @property({ attribute: 'open-on' })
  openOn: 'click' | 'long-press' = 'click'

  /**
   * The side the menu opens on, when there is room.
   *
   * It moves if that side does not fit.
   */
  @property()
  placement: Placement = 'bottom-start'

  /**
   * How a submenu opens. `drill` shows it in place of the page showing, with
   * a way back. `flyout` opens it in a panel of its own beside its row.
   */
  @property()
  submenus: 'drill' | 'flyout' = 'drill'

  /**
   * Which page is showing, and what is on it.
   *
   * A controller rather than fields here, because none of this is about menus:
   * a settings panel or a navigation tree wants the same shape. It holds a real
   * stack, so `back()` returns one level rather than to the root.
   */
  private readonly drilldown = new DrilldownController<HelixHeadlessMenuItem>(this, {
    isRow: (element: Element): boolean => 'isMenuItem' in element && element.isMenuItem === true,
    /* A section's rows are rows of the page it is on, so the first page reads
       through each section to the rows in it. */
    root: () =>
      [...this.children]
        .filter((child) => child.slot !== 'trigger')
        .flatMap((child) => (isSection(child) ? [...child.children] : [child])),
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
    /* None while closed: the rows are hidden, and a key on the trigger is this
       element's to answer. Down and Up there open the menu. */
    items: () => (this.open ? this.items : []),
    reserved: () => ['ArrowLeft', 'ArrowRight'],
    selects: () => false,
    typeahead: typeaheadBy((item) => slottedWords(item as HelixHeadlessMenuItem, [''])),
  })

  /** Carries a host `aria-label` and `aria-labelledby` to the surface. */
  protected readonly aria = new AriaForwardController(this, {
    label: true,
    target: () => this.partNamed('surface'),
  })

  /** Where a context menu was asked for, in the viewport, while it is open. */
  private point: { x: number; y: number } | undefined

  /** Where focus was when a context menu opened, so closing it returns there. */
  private returnTo: HTMLElement | undefined

  private readonly panel = new PopoverController(this, {
    anchor: () =>
      this.context && this.point
        ? this.renderRoot?.querySelector<HTMLElement>('#point')
        : this.trigger,
    // The host is `display: contents`, so it has no box a press can land in.
    // What counts as inside is the surface, plus the trigger, whose own click
    // handler decides what a press there means.
    boundary: () => this,
    offset: () => this.offset,
    onDismiss: () => this.hide(),
    open: () => this.open,
    placement: () => this.placement,
    surface: () => this.partNamed('surface'),
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
    /* Flattened, because a component that wraps a menu forwards its own
       trigger slot into this one, and the element assigned here is then that
       `<slot>`. The trigger is what it holds. */
    const trigger = slot?.assignedElements({ flatten: true })[0]
    if (!trigger || trigger.localName.includes('-')) {
      tellDisclosure(trigger, this.open, 'menu')
      return
    }
    /* A plain element, by attribute, from a frame after the first render, as
       `Popover` writes it. One that carries its own `aria-expanded` is the
       consumer's to keep. */
    if (trigger !== this.told) {
      if (!this.settledOnce || trigger.hasAttribute('aria-expanded')) {
        return
      }
      this.told = trigger
      if (!trigger.hasAttribute('aria-haspopup')) {
        trigger.setAttribute('aria-haspopup', 'menu')
      }
    }
    trigger.setAttribute('aria-expanded', String(this.open))
  }

  /** Whether a frame has passed since the first render, after which a plain trigger may be told. */
  private settledOnce = false

  /** The plain trigger this menu writes `aria-expanded` on. */
  private told: Element | undefined

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
    const rows = this.flies ? this.rowsOf(this.keyPage) : this.drilldown.rows
    return rows.filter((row) => !row.disabled)
  }

  /** Opens the menu. */
  show(): void {
    this.openAt('first')
  }

  /** Opens the menu with focus on its first or its last row. */
  private openAt(end: 'first' | 'last'): void {
    if (this.open || !this.requestOpen(true)) {
      return
    }
    this.updateComplete.then(() => {
      // Raised in `updated()`, which the state change has just scheduled.
      const items = this.items
      ;(end === 'first' ? items[0] : items[items.length - 1])?.focus()
    })
  }

  /** Closes the menu and returns it to its first page. */
  hide(): void {
    if (!this.open || !this.requestOpen(false)) {
      return
    }
    this.panel.hide()
    this.drilldown.reset()
    this.stopHover()
    /* Only where the menu still had it. A dismissal that did not take focus with
       it, a press somewhere else on the page, should leave focus where the
       reader put it rather than yanking it back to the trigger. `Popover`
       guards the same way.

       The focused node is found through every shadow root. A menu that another
       component renders in its own shadow root sees `document.activeElement` as
       that component's host, which this element does not contain, so focus was
       dropped to the page on Escape. */
    if (deepContains(this, deepActiveElement())) {
      ;(this.context ? (this.returnTo ?? this.trigger) : this.trigger).focus()
    }
    this.point = undefined
    this.returnTo = undefined
  }

  /**
   * Opens a context menu where the reader asked for it: at the pointer, or at
   * the area's corner where the keyboard asked and the event has no position.
   */
  private readonly handleContextMenu = (event: MouseEvent): void => {
    if (!this.context) {
      return
    }
    const slot = this.renderRoot?.querySelector<HTMLSlotElement>('slot[name="trigger"]')
    const areas = slot?.assignedElements({ flatten: true }) ?? []
    if (!event.composedPath().some((node) => areas.includes(node as Element))) {
      return
    }
    event.preventDefault()
    /* The browser's own menu, after a touch held long enough for the area's
       own long press to have opened this one already. */
    if (this.open && this.longPress.takeClick()) {
      return
    }
    const box = this.trigger.getBoundingClientRect()
    const keyed = event.clientX === 0 && event.clientY === 0
    this.openContextAt(keyed ? { x: box.left, y: box.top } : { x: event.clientX, y: event.clientY })
  }

  /** Opens a context menu at a point in the viewport, or moves an open one there. */
  private openContextAt(point: { x: number; y: number }): void {
    this.point = point
    if (this.open) {
      this.requestUpdate()
      this.updateComplete.then(() => this.panel.reposition())
      return
    }
    const active = deepActiveElement()
    this.returnTo = active instanceof HTMLElement ? active : undefined
    this.show()
  }

  /** Shows an item's submenu in place of the current page. */
  private enter(item: HelixHeadlessMenuItem): void {
    if (!this.drilldown.enter(item)) {
      return
    }
    void this.updateComplete.then(async () => {
      if (!this.flies) {
        this.items[0]?.focusItem()
        return
      }
      /* The submenu's first row, once its panel and the row have drawn. */
      await item.updateComplete
      const first = this.rowsOf(item).find((row) => !row.disabled)
      await first?.updateComplete
      first?.focusItem()
    })
  }

  /** Returns to the page above, or closes when there is none. */
  private leave(): void {
    if (this.flies) {
      const holder = this.keyPage
      if (!holder) {
        this.hide()
        return
      }
      this.openPage(this.holderOf(holder))
      this.updateComplete.then(() => holder.focus())
      return
    }
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
    /* Under `flyout`, a row on any open panel, which a press can reach. */
    const reachable = this.flies
      ? isItem(item as Element) && (item as HelixHeadlessMenuItem).onPage
      : this.items.includes(item as HelixHeadlessMenuItem)
    if (!reachable) {
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
    const holder = this.flies ? this.holderOf(item) : null
    const surface = holder
      ? holder.shadowRoot?.querySelector<HTMLElement>('[part="surface"]')
      : this.partNamed('surface')
    scrollItemIntoView(item, { padding: 4, ...(surface ? { scroller: surface } : {}) })
  }

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (!this.open) {
      this.handleClosedKeydown(event)
      return
    }
    const items = this.items
    const at = items.findIndex((item) => item.active)
    /* In is where a submenu's caret points and out is back along the line, so
       on a right-to-left page the left arrow opens and the right comes back. */
    const along = inlineStep(this, event.key)

    if (event.key === 'Escape') {
      event.stopPropagation()
      this.leave()
    } else if (along === 1 && items[at]?.hasSubmenu) {
      this.enter(items[at] as HelixHeadlessMenuItem)
    } else if (along === -1) {
      /* Under `flyout`, Left on the top page closes nothing, as the APG's
         menu button has it. */
      if (this.flies && this.keyPage === null) {
        return
      }
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

  /**
   * Down and Up on the trigger open the menu on its first and its last row.
   *
   * Everything else passes through. Escape in particular is not this element's
   * while the menu is closed, so a dialog around the menu still closes on it.
   */
  private handleClosedKeydown(event: KeyboardEvent): void {
    /* Shift+F10 on a context menu's area, bound here as well as left to the
       browser's `contextmenu`, which not every platform sends for it. */
    if (this.context && event.shiftKey && event.key === 'F10' && this.fromTrigger(event)) {
      event.preventDefault()
      const box = this.trigger.getBoundingClientRect()
      this.openContextAt({ x: box.left, y: box.top })
      return
    }
    if (this.context || (event.key !== 'ArrowDown' && event.key !== 'ArrowUp')) {
      return
    }
    /* Under a held press, Alt with an arrow, since the arrows alone are the
       page's to scroll with on a trigger whose press is its own. */
    if (this.pressHeld !== event.altKey || !this.fromTrigger(event)) {
      return
    }
    event.preventDefault()
    this.openAt(event.key === 'ArrowDown' ? 'first' : 'last')
  }

  private readonly handleTriggerClick = (): void => {
    if (this.context) {
      return
    }
    if (this.open) {
      this.hide()
    } else if (!this.pressHeld) {
      this.show()
    }
  }

  /** Whether an event came from the slotted trigger, or the area of a context menu. */
  private fromTrigger(event: Event): boolean {
    const slot = this.renderRoot?.querySelector<HTMLSlotElement>('slot[name="trigger"]')
    const triggers = slot?.assignedElements({ flatten: true }) ?? []
    return event.composedPath().some((node) => triggers.includes(node as Element))
  }

  /**
   * A press on the trigger starting: the start of a held one under
   * `open-on="long-press"`, or a touch or a pen held on a context menu's area.
   */
  private readonly handlePointerDown = (event: PointerEvent): void => {
    if (this.open || !this.fromTrigger(event)) {
      return
    }
    if (this.pressHeld || (this.context && event.pointerType !== 'mouse')) {
      this.heldAt = { x: event.clientX, y: event.clientY }
      this.longPress.down(event)
    }
  }

  private readonly handlePointerMove = (event: PointerEvent): void => {
    this.longPress.move(event)
  }

  private readonly handlePointerUp = (): void => {
    this.longPress.up()
  }

  private readonly handlePointerCancel = (): void => {
    this.longPress.cancel()
  }

  /**
   * Takes the click a held press ends in, ahead of the trigger's own
   * listeners, so a press that opened the menu does not also do the trigger's
   * action. In capture, on the host, which is above a slotted trigger.
   */
  private readonly handleHeldClick = (event: MouseEvent): void => {
    if (this.pressHeld && this.longPress.takeClick()) {
      event.stopImmediatePropagation()
      event.preventDefault()
    }
  }

  /** The control the menu has described, so the description can be taken back. */
  private described: Element | undefined

  /**
   * Describes the trigger by `long-press-label` under `open-on="long-press"`,
   * or takes it back, by the host, which carries the words as its label, as
   * `SpeedDial` does. On the consumer's own element only once a reader has
   * reached it, which is after hydration.
   */
  private describeTrigger(light = false): void {
    const slot = this.renderRoot?.querySelector<HTMLSlotElement>('slot[name="trigger"]')
    const trigger = slot?.assignedElements({ flatten: true })[0]
    const control =
      this.pressHeld && trigger instanceof HTMLElement ? focusTarget(trigger) : undefined
    if (this.described && this.described !== control) {
      unlinkDescription(this.described, this)
      this.described = undefined
    }
    if (control && control !== this.described && linkDescription(control, this, light)) {
      this.described = control
    }
    this.internals.ariaLabel = this.described ? this.longPressLabel : null
  }

  /** A reader reaching the trigger, which is late enough to describe a plain one. */
  private readonly handleTriggerFocusIn = (event: FocusEvent): void => {
    if (this.pressHeld && this.fromTrigger(event)) {
      this.describeTrigger(true)
    }
  }

  /** The row the pointer last rested on, under `flyout`. */
  private hovered: HelixHeadlessMenuItem | undefined

  /** The wait before a rested-on row opens or closes a submenu. */
  private hoverTimer: ReturnType<typeof setTimeout> | undefined

  /**
   * The triangle from where the pointer left a row with an open submenu to the
   * near edge of that submenu, and until when it holds.
   */
  private grace: { points: [number, number][]; until: number } | undefined

  private stopHover(): void {
    clearTimeout(this.hoverTimer)
    this.hoverTimer = undefined
    this.hovered = undefined
    this.grace = undefined
  }

  /**
   * A mouse resting on a row, under `flyout`: focus follows it, and after a
   * moment the row's submenu opens, or the submenus below the row's own page
   * close. Not while the pointer is crossing toward an open submenu.
   */
  private readonly handleHover = (event: PointerEvent): void => {
    if (!this.flies || !this.open || event.pointerType !== 'mouse') {
      return
    }
    const row = event
      .composedPath()
      .find((node): node is HelixHeadlessMenuItem => isItem(node as Element))
    if (!row?.onPage || row === this.hovered || this.inGrace(event)) {
      return
    }
    this.hovered = row
    this.grace = undefined
    if (!row.disabled) {
      row.focus()
    }
    clearTimeout(this.hoverTimer)
    this.hoverTimer = setTimeout(() => {
      if (!this.open || this.hovered !== row) {
        return
      }
      if (row.hasSubmenu && !row.disabled) {
        if (this.drilldown.page !== row) {
          this.drilldown.enter(row)
        }
        return
      }
      const holder = this.holderOf(row)
      if (this.drilldown.page !== holder) {
        this.openPage(holder)
      }
    }, HOVER_DELAY)
  }

  /** The pointer leaving a row whose submenu is open, which starts the grace area. */
  private readonly handleRowOut = (event: PointerEvent): void => {
    if (!this.flies || event.pointerType !== 'mouse') {
      return
    }
    const row = event
      .composedPath()
      .find((node): node is HelixHeadlessMenuItem => isItem(node as Element))
    const panel = row?.expanded
      ? row.shadowRoot?.querySelector<HTMLElement>('[part="surface"]')
      : undefined
    if (!panel) {
      return
    }
    const box = panel.getBoundingClientRect()
    const edge = box.left >= event.clientX ? box.left : box.right
    this.grace = {
      points: [
        [event.clientX, event.clientY],
        [edge, box.top],
        [edge, box.bottom],
      ],
      until: Date.now() + GRACE,
    }
  }

  /** Whether the pointer is inside the grace area, while it holds. */
  private inGrace(event: PointerEvent): boolean {
    const grace = this.grace
    return (
      grace !== undefined &&
      Date.now() < grace.until &&
      inTriangle(event.clientX, event.clientY, grace.points)
    )
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('pointermove', this.handleHover)
    this.addEventListener('pointerout', this.handleRowOut)
    /* Capture, so a drill-in never reaches a consumer's own listener on this
       same host. The guarantee the class documents is that choosing a row that
       opens a submenu is navigation rather than a choice, and stopping it in the
       bubble phase stops it for ancestors and not for the siblings registered
       here. `Drilldown` learned this already. */
    this.addEventListener('helix-select', this.handleSelect, true)
    this.addEventListener('keydown', this.handleKeydown)
    this.addEventListener('focusin', this.handleFocusIn)
    this.addEventListener('contextmenu', this.handleContextMenu)
    this.addEventListener('pointerdown', this.handlePointerDown)
    this.addEventListener('pointermove', this.handlePointerMove)
    this.addEventListener('pointerup', this.handlePointerUp)
    this.addEventListener('pointercancel', this.handlePointerCancel)
    this.addEventListener('click', this.handleHeldClick, true)
    this.addEventListener('focusin', this.handleTriggerFocusIn)
    /* A frame after the first render, when a plain trigger is first told the
       menu is closed. Not in the first render: a framework that rendered the
       trigger on a server may still be hydrating it then. */
    void this.whenSettled.then(() => {
      this.settledOnce = true
      if (!this.context) {
        this.tellTrigger()
      }
    })
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('pointermove', this.handleHover)
    this.removeEventListener('pointerout', this.handleRowOut)
    this.stopHover()
    this.removeEventListener('helix-select', this.handleSelect, true)
    this.removeEventListener('keydown', this.handleKeydown)
    this.removeEventListener('focusin', this.handleFocusIn)
    this.removeEventListener('contextmenu', this.handleContextMenu)
    this.removeEventListener('pointerdown', this.handlePointerDown)
    this.removeEventListener('pointermove', this.handlePointerMove)
    this.removeEventListener('pointerup', this.handlePointerUp)
    this.removeEventListener('pointercancel', this.handlePointerCancel)
    this.removeEventListener('click', this.handleHeldClick, true)
    this.removeEventListener('focusin', this.handleTriggerFocusIn)
    if (this.described) {
      unlinkDescription(this.described, this)
      this.described = undefined
    }
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    // Every update, so a trigger slotted after the first render is told too.
    // An area a context menu opens over is no button and is told nothing.
    if (!this.context) {
      this.tellTrigger()
    }
    if (changed.has('openOn') || changed.has('context') || this.described) {
      this.describeTrigger()
    }
    // Every item shows or hides itself: which page is open is this element's
    // business, and where an item belongs is the item's. Set as a property, so
    // nothing is written onto a consumer's element.
    /* Under `flyout` the top page always shows, with the open submenus
       beside it. */
    const top = this.flies || this.drilldown.atRoot
    for (const child of this.children) {
      if (isSection(child)) {
        child.onPage = top
        for (const row of child.children) {
          if ((row as HelixHeadlessMenuItem).isMenuItem === true) {
            this.mark(row as HelixHeadlessMenuItem, top)
          }
        }
        continue
      }
      const item = child as HelixHeadlessMenuItem
      if (item.isMenuItem !== true) {
        continue
      }
      this.mark(item, top)
    }
    /* A state as well as the surface's `data-drilled`, because a divider is the
       consumer's child: a stylesheet outside can take it off a submenu page
       only by asking the host, and an attribute inside the shadow root is not
       something it can ask. */
    this.toggleState('drilled', !this.flies && !this.drilldown.atRoot)
    this.markColumns()
    this.nameSurface()
  }

  /**
   * Names the surface by its trigger, where nothing else names it.
   *
   * By element reference, which is the one direction that crosses: the surface
   * is in this shadow root and the trigger is in the tree around it. A host
   * `aria-labelledby` is carried down by `aria`, and a host `aria-label` or
   * `label` is a name of its own, so each of them clears this reference.
   */
  private nameSurface(): void {
    const surface = this.partNamed('surface') as
      | (HTMLElement & { ariaLabelledByElements?: Element[] | null })
      | null
    if (!surface || !('ariaLabelledByElements' in surface)) {
      return
    }
    if (this.hasAttribute('aria-labelledby')) {
      return
    }
    const trigger = this.renderRoot
      ?.querySelector<HTMLSlotElement>('slot[name="trigger"]')
      ?.assignedElements({ flatten: true })[0]
    const named = this.label !== '' || this.hasAttribute('aria-label')
    surface.ariaLabelledByElements = trigger && !named ? [trigger] : null
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
    const rows = this.flies ? this.topRows : this.drilldown.rows
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
    const holds = page !== null && item.contains(page)
    item.flyout = this.flies
    item.expanded = this.flies && holds
    if (this.flies) {
      /* Its row stays, and its submenu opens beside it while it holds the
         page, so its rows are on a page that shows. */
      item.showingSubmenu = false
      for (const child of item.children) {
        const nested = child as HelixHeadlessMenuItem
        if (nested.isMenuItem === true && child.slot === 'submenu') {
          this.mark(nested, onPage && holds)
        }
      }
      return
    }
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
    /* The point a context menu opens against: a box of no size where the
       reader asked, fixed to the viewport. Drawn only while there is one. */
    const point = this.context && this.point
    return html`<slot name="trigger" @click=${this.handleTriggerClick}></slot>${
      point
        ? html`<span
            id="point"
            aria-hidden="true"
            style="position: fixed; left: 0; top: 0; translate: ${point.x}px ${point.y}px"
          ></span>`
        : nothing
    }
      <div
        part="surface"
        popover="manual"
        role="menu"
        aria-busy=${this.loading ? 'true' : nothing}
        aria-label=${this.label || nothing}
        data-drilled=${this.flies || this.drilldown.atRoot ? nothing : ''}
        ?hidden=${!this.open}
      >
        ${
          // A header rather than a row in the list. The way back is not one of
          // the things on this page, and putting it in the list means an arrow
          // press lands on it as though it were. A `menuitem` all the same,
          // since a menu holds menu items and nothing else: Left and Escape
          // are its keys, and a press or a screen reader's cursor reaches it.
          this.flies || this.drilldown.atRoot
            ? nothing
            : html`<div part="header">
                <button
                  part="back"
                  type="button"
                  role="menuitem"
                  tabindex="-1"
                  aria-label=${this.backLabel}
                  @click=${() => this.leave()}
                >
                  <svg part="back-mark" data-mirror fill="currentColor" viewBox=${caretLeft.viewBox} aria-hidden="true">
                    ${unsafeSVG(caretLeft.content)}
                  </svg>
                </button>
                <span part="title">${this.drilldown.label}</span>
              </div>`
        }
        <slot @slotchange=${(event: Event) => this.countRows(event)}></slot>
        ${this.renderStatus(this.hasRows)}
      </div>${this.renderLive(this.hasRows)}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-menu': HelixHeadlessMenu
  }
}
