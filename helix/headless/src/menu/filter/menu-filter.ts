import {
  filterKeeps,
  formatWords,
  HelixFilterEvent,
  markMatches,
  slottedWords,
} from '@fusion.dev/helix-core'
import { type CSSResult, html, nothing, type ReactiveController, type TemplateResult } from 'lit'
import type { HelixHeadlessMenuItem } from '../item/menu-item.js'
import type { HelixHeadlessMenu } from '../root/menu-root.js'

type Row = HelixHeadlessMenuItem

/**
 * What the filter reads and calls on its menu that the menu keeps to itself:
 * the pages, the rows the keys move over, and the way to a row.
 */
interface Inside {
  announced: string
  readonly drilldown: { readonly page: Row | null }
  filterer: MenuFilterController | undefined
  readonly flies: boolean
  readonly items: Row[]
  readonly keyPage: Row | null
  fromTrigger(event: Event): boolean
  holderOf(row: Row): Row | null
  reach(row: Row | undefined): void
  rowsOf(holder: Row | null): Row[]
}

/**
 * Narrows a `filterable` menu's rows as the reader types in a field above
 * them, with focus staying in the field and the highlight moving through the
 * rows that are left.
 *
 * **Its own entry**, `@fusion.dev/helix-headless/menu/filter`, so a menu that
 * never filters carries none of this. Importing the entry gives every menu of
 * the tier one, and `filterable` turns it on. Menu's description says what a
 * reader gets; this is the part of it the menu does not hold:
 *
 * - the field and the `menu` after it, which the menu draws in its surface
 * - which rows the filter keeps, and the words each matched, marked
 * - the keys the field answers: Up and Down move the highlight, Enter presses
 *   the highlighted row, and Escape clears the filter before it closes
 * - `helix-filter`, sent as the text changes, which a listener cancels to
 *   keep every row showing
 * - how many rows are kept, or `no-results-text`, said in the live region
 *
 * The styled tier's entry hands in the sheet that draws the field, which the
 * menu adopts while it filters.
 */
export class MenuFilterController implements ReactiveController {
  private readonly host: HelixHeadlessMenu

  /** The same menu, read through what it keeps to itself. */
  private readonly inside: Inside

  /** The sheet the menu adopts while it filters, from the styled tier. */
  sheet: CSSResult | undefined

  /** The row the keys reached while focus stays in the field. */
  highlighted: Row | undefined

  /** The submenu the filter narrows, or null for the top page. */
  private page: Row | null = null

  /** The filter a listener refused, which narrows nothing. */
  private refused: string | undefined

  /** The filter the last update saw, so a change moves a highlight it hid. */
  private seen = ''

  constructor(host: HelixHeadlessMenu, sheet?: CSSResult) {
    this.host = host
    this.inside = host as unknown as Inside
    this.sheet = sheet
    this.inside.filterer = this
    host.addController(this)
  }

  hostConnected(): void {
    this.host.addEventListener('mousedown', this.handleMouseDown)
  }

  hostDisconnected(): void {
    this.host.removeEventListener('mousedown', this.handleMouseDown)
    if (this.host.filterable) {
      markMatches(this.host, [], '')
    }
  }

  /** The field, while it is drawn. */
  get field(): HTMLInputElement | null {
    return this.host.renderRoot?.querySelector<HTMLInputElement>('[part="search-field"]') ?? null
  }

  /** Whether the filter is narrowing the rows. */
  get filtering(): boolean {
    const { filter } = this.host
    return this.host.filterable && filter.trim() !== '' && filter !== this.refused
  }

  /** Whether the filter keeps a row: one of another page, or one whose words it matches. */
  kept(row: Row): boolean {
    return (
      !this.filtering ||
      this.inside.holderOf(row) !== this.page ||
      filterKeeps(slottedWords(row, ['']), this.host.filter.trim(), this.host.filterMatch)
    )
  }

  /** The rows of the page the filter narrows that it keeps. */
  private get keptRows(): Row[] {
    return this.inside.rowsOf(this.page).filter((row) => this.kept(row))
  }

  /**
   * Asks to filter by new text, which the field and `filter` then hold. A
   * refusal keeps every row showing, for a page that narrows them itself.
   */
  request(value: string): void {
    const { host, inside } = this
    if (value === host.filter) {
      return
    }
    this.page = inside.flies ? inside.keyPage : inside.drilldown.page
    this.refused = host.dispatchEvent(new HelixFilterEvent({ value })) ? undefined : value
    host.filter = value
  }

  /** Filters by what the reader typed, and highlights the first row kept. */
  private by(value: string): void {
    this.request(value)
    void this.host.updateComplete.then(() => this.inside.reach(this.inside.items[0]))
  }

  /**
   * Puts the highlight on a row, which the field names with
   * `aria-activedescendant`. An element reference, because the field is in
   * the menu's shadow root and the row in the tree around it, the one
   * direction a reference crosses.
   */
  highlight(row: Row | undefined): void {
    if (this.highlighted && this.highlighted !== row) {
      this.highlighted.highlighted = false
    }
    this.highlighted = row
    const field = this.field as
      | (HTMLInputElement & { ariaActiveDescendantElement?: Element | null })
      | null
    if (field && 'ariaActiveDescendantElement' in field) {
      field.ariaActiveDescendantElement = row ?? null
    }
    if (row) {
      row.highlighted = true
    }
  }

  /**
   * Answers a key the field takes, and returns whether it did: Up and Down
   * move the highlight through the rows kept, Enter presses the highlighted
   * row, and Escape over text empties the filter, the next one going back or
   * closing.
   */
  keydown(event: KeyboardEvent, items: Row[], at: number): boolean {
    if (event.key === 'Escape') {
      if (this.host.filter === '') {
        return false
      }
      event.stopPropagation()
      this.by('')
      return true
    }
    if (event.composedPath()[0] !== this.field) {
      return false
    }
    const step = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0
    if (step !== 0) {
      const count = items.length
      this.inside.reach(items[at < 0 ? (step > 0 ? 0 : count - 1) : (at + step + count) % count])
      return true
    }
    if (event.key === 'Enter') {
      /* A press on the row, which chooses it, opens its submenu, or follows
         its link, as a pointer's does. */
      items[at]?.renderRoot.querySelector<HTMLElement>('[part="item"]')?.click()
      return true
    }
    return false
  }

  /**
   * Keeps focus in the field through a press on a row or the way back, as
   * React Aria's virtual focus does: the press still chooses.
   */
  private readonly handleMouseDown = (event: MouseEvent): void => {
    if (
      this.host.filterable &&
      this.host.open &&
      event.composedPath()[0] !== this.field &&
      !this.inside.fromTrigger(event)
    ) {
      event.preventDefault()
    }
  }

  private readonly handleInput = (event: Event): void => {
    // Stopped for the reason `Input.handleInput` gives: the inner control's own
    // `input` is composed and would reach a consumer beside this element's.
    event.stopPropagation()
    this.by((event.target as HTMLInputElement).value)
  }

  /**
   * What a filter that keeps no rows shows, or nothing where it keeps some.
   *
   * It sets what the live region says as well: `no-results-text` where the
   * filter keeps no rows, and how many it keeps where it keeps some, as React
   * Aria and Web Awesome say the count. Only "No matches" was said before
   * that, so a filter that kept forty rows and one that kept one sounded the
   * same.
   */
  status(): TemplateResult | undefined {
    const { host } = this
    const count = this.filtering ? this.keptRows.length : -1
    this.inside.announced =
      count === 0
        ? host.noResultsText
        : count > 0
          ? formatWords(host, 'resultsLabel', { count })
          : ''
    return count === 0
      ? html`<p part="empty"><slot name="no-results">${host.noResultsText}</slot></p>`
      : undefined
  }

  /**
   * The field and then the `menu`: a menu holds menu items and nothing else,
   * so the field stands beside it, as React Aria's `Autocomplete` puts its
   * search field beside its menu.
   */
  render(rows: TemplateResult, busy: string | typeof nothing): TemplateResult {
    const { host } = this
    return html`<input
        part="search-field"
        type="text"
        autocomplete="off"
        spellcheck="false"
        .value=${host.filter}
        placeholder=${host.filterLabel}
        aria-label=${host.filterLabel}
        aria-autocomplete="list"
        aria-controls="items"
        @input=${this.handleInput}
      /><div id="items" role="menu" aria-busy=${busy} aria-label=${host.label || nothing}>${rows}</div>`
  }

  /**
   * Marks the words each kept row matched, as Listbox marks its options, and
   * moves a highlight the filter hid to the first row it keeps. Called by the
   * menu after it has marked which rows are on the page.
   */
  updated(): void {
    const { host } = this
    adopt(host, this.sheet, host.filterable)
    if (!host.filterable) {
      return
    }
    markMatches(host, this.keptRows, this.filtering ? host.filter.trim() : '')
    const changed = host.filter !== this.seen
    this.seen = host.filter
    const items = this.inside.items
    if (changed && host.open && !items.includes(this.highlighted as Row)) {
      this.inside.reach(items[0])
    }
  }
}

/** Gives the menu the styled tier's sheet while it filters, and takes it back after. */
const adopt = (element: Element, given: CSSResult | undefined, on: boolean): void => {
  const root = element.shadowRoot
  const sheet = given?.styleSheet
  if (!root || !sheet || root.adoptedStyleSheets.includes(sheet) === on) {
    return
  }
  root.adoptedStyleSheets = on
    ? [...root.adoptedStyleSheets, sheet]
    : root.adoptedStyleSheets.filter((one) => one !== sheet)
}

/**
 * The menus of a class already on the page, in the document and in every open
 * shadow root in it.
 */
const onPage = <T extends Element>(
  of: abstract new (...args: never[]) => T,
  root: ParentNode = document,
): T[] =>
  [...root.querySelectorAll('*')].flatMap((node) => [
    ...(node instanceof of ? [node] : []),
    ...(node.shadowRoot ? onPage(of, node.shadowRoot) : []),
  ])

/**
 * Gives every menu of a class a `MenuFilterController`, which `filterable`
 * turns on.
 *
 * The entries call it for their own tier's class: the headless entry for
 * `HelixHeadlessMenu`, and the styled one for `HelixMenu`, with the sheet that
 * draws the field. **Menus already on the page are given one too**, and drawn
 * again, so a page that imports the menu and then this entry gets the field.
 */
export const filterMenu = (element: typeof HelixHeadlessMenu, sheet?: CSSResult): void => {
  const attach = (menu: HelixHeadlessMenu): void => {
    const inside = menu as unknown as Inside
    if (inside.filterer) {
      inside.filterer.sheet ??= sheet
      return
    }
    new MenuFilterController(menu, sheet)
  }
  element.addInitializer((host) => attach(host as HelixHeadlessMenu))
  if (typeof document !== 'undefined') {
    for (const menu of onPage(element)) {
      attach(menu)
      menu.requestUpdate()
    }
  }
}
