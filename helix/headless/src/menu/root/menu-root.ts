import {
  AriaForwardController,
  anchorElement,
  auditEntry,
  customElement,
  DrilldownController,
  deepActiveElement,
  deepContains,
  elementById,
  focusTarget,
  HelixElement,
  inlineStep,
  KeyboardNavigationController,
  linkDescription,
  MIRROR_RULE,
  MixinCollection,
  MixinControllerOpen,
  numberConverter,
  OpenPhaseController,
  onUnlessFalse,
  type Placement,
  PopoverController,
  scrollItemIntoView,
  sideOf,
  slottedWords,
  tellDisclosure,
  typeaheadBy,
  unlinkDescription,
  untilReactHydrated,
  words,
} from '@fusion.dev/helix-core'
import { caretLeft } from '@fusion.dev/helix-icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'
import { LongPress } from '../../speed-dial/long-press.js'
import type { MenuFilterController } from '../filter/menu-filter.js'
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
 * render, and on a page React is hydrating once React has hydrated the menu,
 * so a server's markup is never changed while a framework hydrates it.
 * It never writes `aria-expanded` where you wrote it yourself.
 *
 * Submenus drill down by default. A submenu replaces the panel's content, and a
 * back row returns to the previous page. One panel stays inside a narrow
 * window, and works on touch screens, which have no hover. Focus follows a
 * mouse resting on a row in either mode, and a drilled page is a `menu` named
 * by the row that opened it.
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
 * the next row whose name starts with it, Enter and Space choose (Space on a
 * choice row changes it and leaves the menu open), Right Arrow
 * opens a row's submenu and Left Arrow goes back, the two swapping on a
 * right-to-left page. Left Arrow on the top page does nothing. Escape closes
 * the menu and returns focus to the trigger. Tab closes it and moves on.
 *
 * While it is open, the surface carries the trigger's width as
 * `--floating-anchor-inline-size` and the room left below it as
 * `--floating-available-block-size`, as Radix's dropdown menu publishes its
 * trigger's width, for a menu as wide as its trigger:
 * `helix-menu::part(surface) { min-inline-size: var(--floating-anchor-inline-size) }`.
 *
 * **The choices in one place.** `checkedValues` holds the values of the rows
 * that are checked, anywhere in the menu, and setting it checks exactly
 * those rows, as React Aria's `selectedKeys` does. `change` is sent on the
 * menu when a reader's choice changes it.
 *
 * With `context`, the trigger is an area and the menu is its context menu: a
 * right-click, a long press, Shift+F10 or the menu key over the area opens it
 * at the pointer, or at the area's corner from the keyboard, as Radix's context
 * menu does. A press on the area does not open it, and closing it returns focus
 * to where it was. A touch or a pen held still on the area opens it too, on
 * every browser, since iOS sends no `contextmenu` for one.
 *
 * **One menu for many things.** `for` names an area outside the menu, such as
 * a table, and `targets` says which things in it the menu is about, such as
 * `tr`. A request over one of them opens the menu with it as
 * `contextTarget`, which a `helix-before-open` listener reads to change the
 * rows for it; a request over none of them is left to the page. `showAt()`
 * opens the menu at a point, for an area that finds what was pressed itself,
 * such as a canvas. Shift with a right-click leaves the browser's own menu to
 * the reader.
 *
 * **A trigger with its own action.** With `open-on="long-press"`, a press on
 * the trigger is the trigger's own, and a press held for half a second opens
 * the menu, as React Aria's `trigger="longPress"` does. Alt+Down or Alt+Up
 * opens it from the keyboard, and the trigger is described by
 * `long-press-label`, which says so.
 *
 * **A filter field** is a separate import, `@fusion.dev/helix/menu/filter`, so
 * a menu that never filters carries none of its code:
 *
 * ```js
 * import '@fusion.dev/helix/menu'
 * import '@fusion.dev/helix/menu/filter'
 * ```
 *
 * With it imported and `filterable` set, the menu opens with focus in a field
 * above its rows, and typing narrows the rows of the page the keys move in,
 * as React Aria's `Autocomplete` around a `Menu` does. A row is kept where its
 * words hold the filter, in any case, or where `filterMatch` says so. Each
 * page starts unfiltered, and the filter is cleared as the menu closes. Where
 * typing keeps no row, the menu shows `no-results-text`. Focus stays in the
 * field: Up and Down Arrow move the highlight through the rows that are left,
 * Enter chooses the highlighted row, Right Arrow opens its submenu, Left Arrow
 * on a submenu goes back, and Escape clears the filter and then closes the
 * menu. A screen reader hears how many rows the filter keeps
 * (`results-label`). Home, End and the other keys move the caret and type. The field names
 * the highlighted row with `aria-activedescendant`, and the rows are a `menu`
 * after the field. Cancel `helix-before-filter` to keep every row
 * showing and narrow the rows yourself, such as by replacing them with rows
 * from a server.
 *
 * @since 0.1.0
 * @status stable
 * @category overlays
 * @aliases Dropdown, Action menu
 * @documentation https://fusion.dev/helix/components/menu
 *
 * @slot - The items.
 * @slot empty - What the menu shows when it has no items, for content richer than `empty-text`.
 * @slot loading - What the menu shows while its items load, for content richer than `loading-text`.
 * @slot no-results - What the menu shows when the filter keeps no rows, for content richer than `no-results-text`.
 * @slot trigger - The control that opens the menu, or with `context` the area a context menu opens over.
 *
 * @event {Event} change - A reader's choice checked or unchecked rows. Read `checkedValues` for the rows that are checked now.
 * @event {HelixBeforeCloseEvent} helix-before-close - The menu is about to close. Cancelable: cancel it to keep it open.
 * @event {HelixBeforeFilterEvent} helix-before-filter - The text in the filter field changed, with the new text in `detail.value`. Cancelable: cancel it to keep every row showing and narrow the rows yourself.
 * @event {HelixBeforeOpenEvent} helix-before-open - The menu is about to open. Cancelable: cancel it to keep it closed.
 * @event {HelixBeforeSelectEvent} helix-before-select - An item was chosen. Cancelable: cancel it to keep the menu open.
 * @event {HelixFilterEvent} helix-filter - Fired after the rows are narrowed to the text in the filter field, with the text in `detail.value`.
 * @event {HelixSelectEvent} helix-select - Fired after an item is chosen, once the choice stands. Act on the choice from it.
 * @event {ToggleEvent} toggle - The menu opened or closed. The event carries `newState` and `oldState`.
 *
 * @csspart back - The control that returns from a submenu.
 * @csspart back-mark - The glyph on the back control of a submenu.
 * @csspart empty - The text shown when the menu has no items.
 * @csspart header - The bar above a submenu, holding the way back and its name.
 * @csspart live - A live region that repeats the empty and loading text, so screen readers announce it when it changes. Visually hidden in the styled tier.
 * @csspart loading - The text shown while the items are loading.
 * @csspart search-field - With `filterable`, the field that narrows the rows.
 * @csspart surface - The floating panel the menu is drawn on. It is the `menu` itself, and with `filterable` it holds the filter field and then the `menu`.
 * @csspart title - The name of the submenu that is showing.
 *
 * @cssproperty --floating-anchor-inline-size - The trigger's width, written on the panel while it is open, as in `min-inline-size: var(--floating-anchor-inline-size)`. Read it; a value set here is written over.
 * @cssproperty --floating-available-block-size - The room between the panel and the edge of the screen it opens toward, written on the panel while it is open. Read it; a value set here is written over.
 *
 * @cssstate drilled - A submenu's page is showing, so content that is not a row can hide with the top page.
 * @cssstate entering - From the moment the panel shows until its entrance has finished.
 * @cssstate exiting - From the moment the panel hides until its exit has finished.
 * @cssstate mark - A row on the current page has a checkbox or a link, so every row keeps the trailing column.
 * @cssstate open - While the menu is open.
 * @cssstate placed-bottom - While the open panel sits below its trigger.
 * @cssstate placed-left - While the open panel sits to the left of its trigger.
 * @cssstate placed-right - While the open panel sits to the right of its trigger.
 * @cssstate placed-top - While the open panel sits above its trigger.
 * @cssstate start - A row on the current page has content in its leading column, so every row keeps that column.
 */
@customElement('helix-headless-menu')
export class HelixHeadlessMenu extends MixinCollection(MixinControllerOpen(HelixElement)) {
  protected static override markRules = [MIRROR_RULE]

  /**
   * The key this family's words are registered under, its styled tag:
   * `registerWords('de', { 'helix-menu': { backLabel: 'Zurück' } })`.
   */
  static words = 'helix-menu'

  /* The `empty` and `loading` slots, with `empty-text` and `loading-text` as
     their fallback, as Data Table has them. */
  protected override statusSlots = true

  /**
   * The text of the row that returns from a submenu.
   */
  @words
  @property({ attribute: 'back-label' })
  backLabel = 'Back'

  /**
   * Whether choosing a row closes the menu.
   *
   * On by default, and a Space on a choice row leaves the menu open either way.
   * Write `close-on-select="false"` to keep the menu open after every choice, as
   * Ark UI's `closeOnSelect` does. A row's own `close-on-select` wins over this.
   */
  @property({ attribute: 'close-on-select', converter: onUnlessFalse })
  closeOnSelect = true

  /**
   * Whether the menu is the trigger's context menu: it opens where the reader
   * asks for one, with a right-click, a long press, Shift+F10 or the menu key.
   */
  @property({ reflect: true, type: Boolean })
  context = false

  /**
   * The text the rows are filtered by, which the filter field holds.
   *
   * Cleared as the menu closes and as a submenu opens or closes, so each page
   * starts with every row showing.
   */
  @property()
  filter = ''

  /**
   * Whether the menu shows a field above its rows that narrows them as the
   * reader types, with focus staying in the field, once
   * `@fusion.dev/helix/menu/filter` (or `@fusion.dev/helix-headless/menu/filter`)
   * is imported. Without that import it does nothing, so a menu that never
   * filters carries none of the filter's code, and a development build says
   * which import is missing.
   */
  @property({ type: Boolean })
  filterable = false

  /**
   * The filter field's name and placeholder.
   */
  @words
  @property({ attribute: 'filter-label' })
  filterLabel = 'Filter'

  /**
   * Whether a row is kept by the filter: a function given the row's words and
   * the filter, trimmed, that returns `true` to keep it showing, as React
   * Aria's `Autocomplete` takes `filter`. See Listbox's `filterMatch`.
   *
   * Absent, a row is kept where its words hold the filter, in any case. A
   * property only, there being no way to write a function in markup.
   */
  @property({ attribute: false })
  filterMatch?: ((text: string, filter: string) => boolean) | undefined

  /**
   * With `context`, the id of an area outside the menu whose context menu
   * this is, for one menu that serves a region the page draws elsewhere, such
   * as a table. A right-click, a long press, Shift+F10 or the menu key there
   * opens it, as on the `trigger` slot's area. Names an element in the same
   * tree, the way `Tooltip.for` does.
   */
  @property()
  for = ''

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
   * The text shown when the filter keeps no rows.
   */
  @words
  @property({ attribute: 'no-results-text' })
  noResultsText = 'No matches'

  /**
   * Space between the trigger and the surface, in pixels.
   */
  @property({ converter: numberConverter('offset', 4, 'pixels') })
  offset = 4

  /**
   * What opens the menu from its trigger. `long-press` leaves a press to the
   * trigger's own action and opens the menu on a press held for half a second,
   * or on Alt+Down or Alt+Up.
   */
  @property({ attribute: 'open-on' })
  openOn: 'click' | 'long-press' = 'click'

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
   * The side the menu opens on, when there is room.
   *
   * It moves if that side does not fit.
   */
  @property()
  placement: Placement = 'bottom-start'

  /**
   * What a screen reader hears when the filter narrows the rows. `{count}` is
   * how many rows are left, written in the locale, and each language writes
   * the forms it has, as Listbox's `results-label` does.
   */
  @words
  @property({ attribute: 'results-label' })
  resultsLabel = '{count, plural, one {# result} other {# results}}'

  /**
   * How a submenu opens. `drill` shows it in place of the page showing, with
   * a way back. `flyout` opens it in a panel of its own beside its row.
   */
  @property()
  submenus: 'drill' | 'flyout' = 'drill'

  /**
   * With `context`, a selector for the things in the area a menu is about,
   * such as `tr` for a table's rows. A request over one opens the menu with it
   * as `contextTarget`, and a request over none of them is left to the page.
   */
  @property()
  targets = ''

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

  /* On its way in or out, for a sheet that draws the journey, as Popover has
     it: `:state(open)` turns at once, which is too early for an exit to know
     it is one. */
  protected readonly phases = new OpenPhaseController(this, {
    mark: {
      entering: (on) => this.toggleState('entering', on),
      exiting: (on) => this.toggleState('exiting', on),
    },
    open: () => this.open,
    surface: () => this.partNamed('surface'),
  })

  /** Carries a host `aria-label` and `aria-labelledby` to the surface. */
  protected readonly aria = new AriaForwardController(this, {
    label: true,
    target: () => this.menuBox,
  })

  /** Where a context menu was asked for, in the viewport, while it is open. */
  private point: { x: number; y: number } | undefined

  /** Where focus was when a context menu opened, so closing it returns there. */
  private returnTo: HTMLElement | undefined

  private readonly panel = new PopoverController(this, {
    anchor: () =>
      this.point ? this.renderRoot?.querySelector<HTMLElement>('#point') : this.trigger,
    // The host is `display: contents`, so it has no box a press can land in.
    // What counts as inside is the surface, plus the trigger, whose own click
    // handler decides what a press there means.
    boundary: () => this,
    offset: () => this.offset,
    onDismiss: () => this.hide(),
    /* The side the panel landed on, for a sheet outside that draws by side,
       as Popover says it. */
    onPlace: (placement) => {
      const side = sideOf(placement)
      this.toggleState('placed-bottom', side === 'bottom')
      this.toggleState('placed-left', side === 'left')
      this.toggleState('placed-right', side === 'right')
      this.toggleState('placed-top', side === 'top')
    },
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
    /* A plain element, by attribute, from a frame after the first render and
       once React has hydrated this element, as `Popover` writes it. One that carries its own `aria-expanded` is the
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

  /** Whether a frame has passed since the first render and React is done hydrating, after which a plain trigger may be told. */
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
    return rows.filter((row) => !row.disabled && this.kept(row))
  }

  /** The element that is the `menu`: the surface, or with `filterable` the box after the field. */
  private get menuBox(): HTMLElement | null {
    return this.filters
      ? (this.renderRoot?.querySelector<HTMLElement>('#items') ?? null)
      : this.partNamed('surface')
  }

  /**
   * The filter `menu/filter` gives this menu, which `filterable` turns on.
   *
   * Declared and never initialized, because the entry sets it from the
   * constructor Lit runs initializers in, which is before this class's own
   * fields: an initializer here would set it back to `undefined`.
   */
  declare private filterer: MenuFilterController | undefined

  /** The filter, while `filterable` is set and `menu/filter` is imported. */
  private get filters(): MenuFilterController | undefined {
    return this.filterable ? this.filterer : undefined
  }

  /** Whether the filter keeps a row, which every row is without one. */
  private kept(row: HelixHeadlessMenuItem): boolean {
    return this.filters?.kept(row) ?? true
  }

  /** Asks to filter by new text. See `MenuFilterController.request`. */
  private requestFilter(value: string): void {
    this.filterer?.request(value)
  }

  /**
   * Moves the reader to a row: focus, or with a filter the highlight, focus
   * staying in the filter field.
   */
  private reach(row: HelixHeadlessMenuItem | undefined): void {
    const filters = this.filters
    if (!filters) {
      row?.focus()
      return
    }
    filters.highlight(row)
    if (row) {
      this.revealRow(row)
    }
  }

  /** Watches for rows taken away while the menu is open. */
  private rowWatch: MutationObserver | undefined

  /**
   * Moves the reader to a neighbor when the page takes away the row they were
   * on: the row that took its place, or the one before it where it was the
   * last. A menu with no rows left closes and gives focus to its trigger.
   *
   * **Focus went to the body**, and the menu then ignored every key, its
   * listener being on the host: measured in Chromium, removing the focused
   * row and pressing ArrowUp did nothing. List and Virtual List move focus to
   * a neighbor the same way, as React Aria's collections do. With `filterable`,
   * focus stays in the field and the highlight moves. Focus a reader put
   * anywhere but the body is left there.
   */
  private readonly followRemoved = (records: MutationRecord[]): void => {
    if (!this.open) {
      return
    }
    /* Or still the row taken away, which is where happy-dom leaves it. */
    const active = deepActiveElement()
    const lost = active === null || active === document.body || !active.isConnected
    const record = records.find((one) =>
      [...one.removedNodes].some(
        (node) =>
          isItem(node as Element) && (this.filters ? node === this.filters.highlighted : lost),
      ),
    )
    if (!record) {
      return
    }
    const items = this.items
    const after = (from: Node | null, step: 'nextSibling' | 'previousSibling') => {
      for (let node = from; node; node = node[step]) {
        if (items.includes(node as HelixHeadlessMenuItem)) {
          return node as HelixHeadlessMenuItem
        }
      }
      return undefined
    }
    const next =
      after(record.nextSibling, 'nextSibling') ??
      after(record.previousSibling, 'previousSibling') ??
      items.at(-1)
    if (this.filters || next) {
      this.reach(next)
      return
    }
    this.hide()
    if (!this.context) {
      this.trigger.focus()
    }
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
      this.filters?.field?.focus()
      this.reach(end === 'first' ? items[0] : items[items.length - 1])
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
    this.requestFilter('')
    this.reach(undefined)
    /* Only where the menu still had it. A dismissal that did not take focus with
       it, a press somewhere else on the page, should leave focus where the
       reader put it rather than yanking it back to the trigger. `Popover`
       guards the same way.

       The focused node is found through every shadow root. A menu that another
       component renders in its own shadow root sees `document.activeElement` as
       that component's host, which this element does not contain, so focus was
       dropped to the page on Escape. */
    if (deepContains(this, deepActiveElement())) {
      ;(this.returnTo ?? this.trigger).focus()
    }
    this.point = undefined
    this.returnTo = undefined
  }

  /**
   * The thing the open context menu is about: the element of `targets` the
   * reader asked over, the area where there are no `targets`, or what
   * `showAt` was given. Set before `helix-before-open`, so a listener can
   * change the rows for it, and kept until the menu next opens.
   */
  contextTarget: Element | undefined = undefined

  /**
   * Opens the menu at a point in the viewport, as a context menu opens, for
   * an area that finds what was pressed itself, such as a canvas or a map.
   * `target` becomes `contextTarget`. An open menu moves there.
   */
  showAt(point: { x: number; y: number }, target?: Element): void {
    this.contextTarget = target
    this.openContextAt(point)
  }

  /** The areas a context menu answers in: the `trigger` slot's, and the one `for` names. */
  private get contextAreas(): Element[] {
    const slot = this.renderRoot?.querySelector<HTMLSlotElement>('slot[name="trigger"]')
    const named = this.isConnected && this.for !== '' ? elementById(this, this.for) : null
    return [...(slot?.assignedElements({ flatten: true }) ?? []), ...(named ? [named] : [])]
  }

  /**
   * The element of `targets` a request came from, the area where there are
   * no `targets`, or nothing where a request over the area missed every one.
   */
  private targetOf(event: Event): Element | undefined {
    const path = event.composedPath().filter((node): node is Element => node instanceof Element)
    const areas = this.contextAreas
    const area = path.find((node) => areas.includes(node))
    if (!area) {
      return undefined
    }
    if (this.targets === '') {
      return area
    }
    return path.slice(0, path.indexOf(area) + 1).find((node) => node.matches(this.targets))
  }

  /**
   * Opens a context menu where the reader asked for it: at the pointer, or at
   * the area's corner where the keyboard asked and the event has no position.
   */
  private readonly handleContextMenu = (event: MouseEvent): void => {
    if (!this.context) {
      return
    }
    const keyed = event.clientX === 0 && event.clientY === 0
    /* Shift with a right-click leaves the browser's own menu to the reader,
       as in Google Docs and Figma, for a spelling fix or Inspect. */
    if (event.shiftKey && !keyed) {
      return
    }
    const target = this.targetOf(event)
    if (!target) {
      return
    }
    event.preventDefault()
    /* The browser's own menu, after a touch held long enough for the area's
       own long press to have opened this one already. */
    if (this.open && this.longPress.takeClick()) {
      return
    }
    this.contextTarget = target
    const box = target.getBoundingClientRect()
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
    this.requestFilter('')
    void this.updateComplete.then(async () => {
      if (!this.flies) {
        this.reach(this.items[0])
        return
      }
      /* The submenu's first row, once its panel and the row have drawn. */
      await item.updateComplete
      const first = this.rowsOf(item).find((row) => !row.disabled)
      await first?.updateComplete
      this.reach(first)
    })
  }

  /** Returns to the page above, or closes when there is none. */
  private leave(): void {
    this.requestFilter('')
    if (this.flies) {
      const holder = this.keyPage
      if (!holder) {
        this.hide()
        return
      }
      this.openPage(this.holderOf(holder))
      this.updateComplete.then(() => this.reach(holder))
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
    this.updateComplete.then(() => this.reach(leaving ?? undefined))
  }

  /** The choice rows anywhere in the menu, in document order. */
  private get choiceRows(): HelixHeadlessMenuItem[] {
    return [...this.querySelectorAll('*')].filter(
      (node): node is HelixHeadlessMenuItem =>
        isItem(node) && (node as HelixHeadlessMenuItem).choice,
    )
  }

  /**
   * The values of the choice rows that are checked, anywhere in the menu, in
   * document order.
   *
   * Set it to check exactly those rows and uncheck every other choice row, as
   * React Aria's `selectedKeys` controls a menu's selection from one place.
   * Each row keeps its own `checked` too, which this reads and writes. `change`
   * is sent on the menu when a reader's choice changes it.
   */
  get checkedValues(): string[] {
    return this.choiceRows.filter((row) => row.checked).map((row) => row.value)
  }

  set checkedValues(values: readonly string[]) {
    const wanted = new Set(values)
    for (const row of this.choiceRows) {
      row.checked = wanted.has(row.value)
    }
    this.toldChecked = this.checkedValues.join('\u0000')
  }

  /** The checked values `change` last said, joined, so a choice that moved nothing says nothing. */
  private toldChecked: string | undefined

  /** Sends `change` when a reader's choice has changed which rows are checked. */
  private tellChecked(): void {
    const now = this.checkedValues.join('\u0000')
    const before = this.toldChecked
    this.toldChecked = now
    if (before !== undefined && before !== now) {
      this.dispatchEvent(new Event('change', { bubbles: true }))
    }
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
    this.tellChecked()
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
       `helix-before-select` documented as cancelable, whose refusal left the menu shut
       anyway, and a page that heard `helix-before-close` and `toggle` before
       the choice that caused them. Found running the events example. The
       dispatch is synchronous, so a microtask is after all of it. */
    const keep = chosen.keepsOpen || (chosen.closeOnSelect === undefined && !this.closeOnSelect)
    queueMicrotask(() => {
      if (!(event.defaultPrevented || keep)) {
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
    if (item) {
      this.revealRow(item)
    }
    /* After `aria`, which forwards the host's names again as focus arrives
       and would take a submenu page's name back to the top page's. */
    this.nameSurface()
  }

  /** Scrolls the panel that holds a row to show it. */
  private revealRow(item: HelixHeadlessMenuItem): void {
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

    /* The keys the filter field answers, and Escape over a filter, which
       empties it before the next one goes back or closes. */
    if (this.filters?.keydown(event, items, at)) {
      event.preventDefault()
      return
    }
    if (event.key === 'Escape') {
      event.stopPropagation()
      this.leave()
    } else if (along === 1 && items[at]?.hasSubmenu) {
      this.enter(items[at] as HelixHeadlessMenuItem)
    } else if (along === -1) {
      /* Left on the top page closes nothing, as the APG's menu button and
         React Aria's Menu have it, whether submenus fly out or drill in.
         Escape closes. */
      if (this.flies ? this.keyPage === null : this.drilldown.atRoot) {
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
    const asked =
      this.context && event.shiftKey && event.key === 'F10' ? this.targetOf(event) : undefined
    if (asked) {
      event.preventDefault()
      this.contextTarget = asked
      const box = asked.getBoundingClientRect()
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
    if (this.open) {
      return
    }
    const held = this.context && event.pointerType !== 'mouse' ? this.targetOf(event) : undefined
    if (held) {
      this.contextTarget = held
    }
    if ((this.pressHeld && this.fromTrigger(event)) || held) {
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
   * A mouse resting on a row: focus follows it, and under `flyout`, after a
   * moment, the row's submenu opens, or the submenus below the row's own page
   * close. Not while the pointer is crossing toward an open submenu.
   *
   * **In every mode**, as the APG's menus, React Aria's and Radix's have it.
   * Under `drill` the pointer did not move focus, so the row under the
   * pointer and the row the keys moved from were two rows, measured in
   * Chromium: hovering Delete left focus on Cut.
   */
  private readonly handleHover = (event: PointerEvent): void => {
    if (!this.open || event.pointerType !== 'mouse') {
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
      this.reach(row)
    }
    if (!this.flies) {
      return
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
    this.addEventListener('helix-before-select', this.handleSelect, true)
    this.addEventListener('keydown', this.handleKeydown)
    this.addEventListener('focusin', this.handleFocusIn)
    this.addEventListener('contextmenu', this.handleContextMenu)
    this.addEventListener('pointerdown', this.handlePointerDown)
    this.addEventListener('pointermove', this.handlePointerMove)
    this.addEventListener('pointerup', this.handlePointerUp)
    this.addEventListener('pointercancel', this.handlePointerCancel)
    this.addEventListener('click', this.handleHeldClick, true)
    this.addEventListener('focusin', this.handleTriggerFocusIn)
    this.rowWatch = new MutationObserver(this.followRemoved)
    this.rowWatch.observe(this, { childList: true, subtree: true })
    void this.whenSettled.then(() => {
      /* The area `for` names, once the page has drawn it, and again on a
         menu moved and connected anew. */
      this.watchArea()
    })
    /* A frame after the first render, and on a page React is hydrating once
       React has hydrated this element, when a plain trigger is first told the
       menu is closed. Not before: a framework that rendered the trigger on a
       server may still be hydrating it, and the frame alone came before React
       did on a page whose definitions load first. See `untilReactHydrated`. */
    void this.whenSettled
      .then(() => untilReactHydrated(this))
      .then(() => {
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
    this.removeEventListener('helix-before-select', this.handleSelect, true)
    this.removeEventListener('keydown', this.handleKeydown)
    this.removeEventListener('focusin', this.handleFocusIn)
    this.removeEventListener('contextmenu', this.handleContextMenu)
    this.removeEventListener('pointerdown', this.handlePointerDown)
    this.removeEventListener('pointermove', this.handlePointerMove)
    this.removeEventListener('pointerup', this.handlePointerUp)
    this.removeEventListener('pointercancel', this.handlePointerCancel)
    this.removeEventListener('click', this.handleHeldClick, true)
    this.removeEventListener('focusin', this.handleTriggerFocusIn)
    this.unwatchArea()
    this.rowWatch?.disconnect()
    this.rowWatch = undefined
    if (this.described) {
      unlinkDescription(this.described, this)
      this.described = undefined
    }
  }

  /** The area `for` named, which carries this menu's listeners while it is the context area. */
  private watched: Element | undefined

  /** The keys an area outside the menu passes on: only Shift+F10 and the menu key, while it is closed. */
  private readonly handleAreaKeydown = (event: Event): void => {
    if (!this.open) {
      this.handleClosedKeydown(event as KeyboardEvent)
    }
  }

  /** Moves the menu's listeners onto the area `for` names, and off the one it named before. */
  private watchArea(): void {
    const area =
      this.context && this.isConnected && this.for !== '' ? elementById(this, this.for) : null
    if (area === this.watched) {
      return
    }
    this.unwatchArea()
    if (!area) {
      return
    }
    area.addEventListener('contextmenu', this.handleContextMenu as EventListener)
    area.addEventListener('pointerdown', this.handlePointerDown as EventListener)
    area.addEventListener('pointermove', this.handlePointerMove as EventListener)
    area.addEventListener('pointerup', this.handlePointerUp)
    area.addEventListener('pointercancel', this.handlePointerCancel)
    area.addEventListener('keydown', this.handleAreaKeydown)
    this.watched = area
  }

  private unwatchArea(): void {
    const area = this.watched
    if (!area) {
      return
    }
    area.removeEventListener('contextmenu', this.handleContextMenu as EventListener)
    area.removeEventListener('pointerdown', this.handlePointerDown as EventListener)
    area.removeEventListener('pointermove', this.handlePointerMove as EventListener)
    area.removeEventListener('pointerup', this.handlePointerUp)
    area.removeEventListener('pointercancel', this.handlePointerCancel)
    area.removeEventListener('keydown', this.handleAreaKeydown)
    this.watched = undefined
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    if (changed.has('for') || changed.has('context')) {
      this.watchArea()
    }
    /* What is checked as the menu opens, so the first choice after it is
       compared with the rows as the reader found them. */
    if (changed.has('open') && this.open) {
      this.toldChecked = this.checkedValues.join('\u0000')
    }
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
        /* A heading over rows the filter has all hidden goes with them. */
        child.onPage =
          top &&
          (!this.filters?.filtering ||
            [...child.children].some((row) => isItem(row) && this.kept(row)))
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
    this.filterer?.updated()
    if (this.filterable && !this.filterer) {
      auditEntry(
        this,
        'filterable',
        'menu/filter',
        'it shows no filter field',
        () => this.filterable && !this.filterer,
      )
    }
  }

  /** Whether the surface is named by a submenu's page, which `nameSurface` undoes at the top. */
  private namedByPage = false

  /**
   * Names the surface by its trigger, where nothing else names it, and a
   * submenu's page by its title.
   *
   * By element reference, which is the one direction that crosses: the surface
   * is in this shadow root and the trigger is in the tree around it. A host
   * `aria-labelledby` is carried down by `aria`, and a host `aria-label` or
   * `label` is a name of its own, so each of them clears this reference.
   */
  private nameSurface(): void {
    const surface = this.menuBox as
      | (HTMLElement & { ariaLabelledByElements?: Element[] | null })
      | null
    if (!surface) {
      return
    }
    /* **A submenu's page is named by its row**, the title over it, as a
       flyout submenu is named by the row that opens it in React Aria and
       Radix. Measured before this: a reader drilled into "Share" was still in
       a menu called "Actions". By id, which reaches within this shadow root,
       and over any name the host forwards, which names the top page. */
    if (!this.flies && !this.drilldown.atRoot && this.partNamed('title')) {
      surface.setAttribute('aria-labelledby', 'title')
      this.namedByPage = true
      return
    }
    if (this.namedByPage) {
      this.namedByPage = false
      surface.removeAttribute('aria-labelledby')
      this.aria.forward()
    }
    if (!('ariaLabelledByElements' in surface)) {
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
   * **Per section on a page with sections**, for the same reason one level
   * down: a section has its own heading, where the reader starts reading
   * again, so its rows line up with each other and not with another
   * section's. A section of icons over a section of plain choices indented
   * the plain ones by a column nothing in them filled. The rows outside any
   * section are decided together, as before, and the trailing column stays
   * the page's, since ticks on one edge never set labels on two.
   *
   * Read off the light DOM rather than off the rows, so it does not depend on
   * which children have upgraded by the time this runs.
   */
  private markColumns(): void {
    const rows = this.flies ? this.topRows : this.drilldown.rows
    const sections = new Map<Element, boolean>()
    for (const child of this.children) {
      if ((child as { isMenuSection?: boolean }).isMenuSection) {
        sections.set(child, false)
      }
    }
    let loose = false
    for (const row of rows) {
      const marked = row.querySelector(':scope > [slot="start"]') !== null
      const parent = row.parentElement
      if (parent && sections.has(parent)) {
        sections.set(parent, sections.get(parent) === true || marked)
      } else {
        loose ||= marked
      }
    }
    this.toggleState('start', loose)
    for (const [section, marked] of sections) {
      ;(section as { startColumn?: boolean }).startColumn = marked
    }
    /* Checkable and checked both, not just checked. A row that can be ticked
       holds the column open while it is not, or the labels on a filter page step
       sideways as the reader ticks their way down it. */
    this.toggleState(
      'mark',
      rows.some((row) => row.choice || this.drilldown.hasPage(row)),
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
    item.onPage = onPage && this.kept(item)
    item.virtual = this.filters !== undefined
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
          this.mark(nested, item.onPage && holds)
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
    const point = this.point
    const filters = this.filters
    /* What a filter that keeps no rows shows, which also sets what the live
       region says. */
    this.announced = ''
    const none = filters?.status()
    const rows = html`${
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
            <span part="title" id="title">${this.drilldown.label}</span>
          </div>`
    }
      <slot @slotchange=${(event: Event) => this.countRows(event)}></slot>
      ${none ?? this.renderStatus(this.hasRows)}`
    const busy = this.loading ? 'true' : nothing
    const label = this.label || nothing
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
        role=${filters ? nothing : 'menu'}
        aria-busy=${filters ? nothing : busy}
        aria-label=${filters ? nothing : label}
        data-drilled=${this.flies || this.drilldown.atRoot ? nothing : ''}
        data-filtered=${filters?.filtering ? '' : nothing}
        ?hidden=${!this.open}
      >
        ${filters ? filters.drawFilter(rows, busy) : rows}
      </div>${this.renderLive(this.hasRows)}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-menu': HelixHeadlessMenu
  }
}
