import {
  deepContains,
  focusableElements,
  inlineStep,
  scrollingAncestor,
  scrollRoom,
  selectsAll,
  whenHydrated,
} from '@fusion.dev/helix-core'
import type { ReactiveController, ReactiveControllerHost } from 'lit'
import type { HelixHeadlessTableCell } from './cell/table-cell.js'
import type { HelixHeadlessTableColumn } from './column/table-column.js'
import { type GridPlace, gridMove, pageRows } from './grid.js'
import type { HelixHeadlessTableRow } from './row/table-row.js'

/** A place in the grid with the element that holds focus there. */
export interface GridCell extends GridPlace {
  cell: HTMLElement
}

export interface TableGridOptions {
  /**
   * Acts on a cell for Enter, Space or F2, and says whether it did. A key it
   * leaves alone moves into the cell's controls, Enter and F2 only.
   */
  activate: (place: GridCell, event: KeyboardEvent) => boolean
  /** The headings that are drawn, in order. */
  columns: () => HelixHeadlessTableColumn[]
  /** The element in the table's own shadow root holding a part of that name. */
  part: (name: string) => HTMLElement | null
  /** The rows in the order they are drawn. */
  rows: () => Element[]
  /** Selects every row for Control or Command with A, and says whether it did. */
  selectAll: () => boolean
  /** Whether a checkbox column leads. */
  selectable: () => boolean
  /** Whether the table is a grid now. */
  on: () => boolean
}

type Row = Element & Partial<HelixHeadlessTableRow>

/** Whether a row's child is drawn: `hidden="until-found"` is, as a column's is. */
const shown = (element: Element): boolean => {
  const hidden = element.getAttribute('hidden')
  return hidden === null || hidden === 'until-found'
}

/**
 * The keyboard of a `grid` table: one tab stop among its cells, the arrow
 * keys, Home, End and the Page keys between them, and Enter or F2 into a
 * cell's controls.
 *
 * **Tab leaves the grid.** The controls in a cell are the consumer's, so their
 * tab order is left as written: Tab on a cell, or past the last control of a
 * cell, focuses an empty box at the grid's end (Shift: its start) and lets the
 * key go on from there, as React Aria's collections do. A control in a cell
 * that focus reaches from outside by the keyboard hands it to the stop, so the
 * grid is one stop from either side. A press, or a script focusing a cell, is
 * left where it lands, and the stop follows it.
 */
export class TableGridController implements ReactiveController {
  private readonly host: ReactiveControllerHost & HTMLElement

  private readonly options: TableGridOptions

  /** The row holding the stop, `head` for the headings, or nothing for the first row. */
  private stopRow: Element | 'head' | undefined = undefined

  /** The column holding the stop. */
  private stopColumn = 0

  /** Whether the next update focuses the stop, after a key moved it. */
  private focusWanted = false

  /** Whether focus is arriving from a press, which keeps its place. */
  private pointing = false

  /** The cells given a `tabindex`, so a table that stops being a grid takes it back. */
  private readonly given = new Set<HTMLElement>()

  constructor(host: ReactiveControllerHost & HTMLElement, options: TableGridOptions) {
    this.host = host
    this.options = options
    host.addController(this)
  }

  hostConnected(): void {
    this.host.addEventListener('keydown', this.handleKeydown)
    this.host.addEventListener('focusin', this.handleFocusIn)
    this.host.addEventListener('pointerdown', this.handlePointerDown)
  }

  hostDisconnected(): void {
    this.host.removeEventListener('keydown', this.handleKeydown)
    this.host.removeEventListener('focusin', this.handleFocusIn)
    this.host.removeEventListener('pointerdown', this.handlePointerDown)
  }

  /** How many columns lead the consumer's cells: the checkbox column, where there is one. */
  private get offset(): number {
    return this.options.selectable() ? 1 : 0
  }

  /** The first row: the headings where there are any, and the first row of cells otherwise. */
  private get top(): number {
    return this.options.columns().length > 0 || this.options.selectable() ? -1 : 0
  }

  /** A row's cells that are drawn, in order. */
  private cellsOf(row: Element | undefined): HTMLElement[] {
    return [...(row?.children ?? [])].filter(shown) as HTMLElement[]
  }

  /** How many columns a row has. */
  private widthOf(row: number): number {
    const own =
      row === -1 ? this.options.columns().length : this.cellsOf(this.options.rows()[row]).length
    return this.offset + own
  }

  /** The element that takes focus at a place, or nothing where there is none. */
  cellAt({ column, row }: GridPlace): HTMLElement | null {
    const lead = column < this.offset
    if (row === -1) {
      return lead
        ? this.options.part('select-all')
        : (this.options.columns()[column - this.offset]?.cellBox ?? null)
    }
    const line = this.options.rows()[row]
    if (lead) {
      return line?.shadowRoot?.querySelector<HTMLElement>('[part~="select"]') ?? null
    }
    return this.cellsOf(line)[column - this.offset] ?? null
  }

  /** The place holding the stop now, held to the grid as it is. */
  current(): GridPlace {
    const found =
      this.stopRow === undefined || this.stopRow === 'head'
        ? -1
        : this.options.rows().indexOf(this.stopRow)
    /* A row taken away hands the stop to the first row, as a heading row
       taken away does. */
    const row = this.stopRow === 'head' || found < 0 ? this.top : found
    const width = this.widthOf(row)
    return { column: Math.max(0, Math.min(this.stopColumn, width - 1)), row }
  }

  /** Whether the stop is at a place, for a cell the table draws itself. */
  isStop(place: GridPlace): boolean {
    const at = this.current()
    return this.options.on() && at.row === place.row && at.column === place.column
  }

  /** The place an event came from or through, with the element that holds focus there. */
  private placeOf(event: Event): GridCell | undefined {
    const columns = this.options.columns()
    const rows = this.options.rows()
    for (const node of event.composedPath()) {
      if (node === this.host) {
        return undefined
      }
      if (!(node instanceof HTMLElement)) {
        continue
      }
      const heading = columns.indexOf(node as HelixHeadlessTableColumn)
      if (heading >= 0) {
        const cell = (node as HelixHeadlessTableColumn).cellBox
        return cell ? { cell, column: heading + this.offset, row: -1 } : undefined
      }
      const part = node.getAttribute('part') ?? ''
      if (part === 'select-all' && node.getRootNode() === this.host.shadowRoot) {
        return { cell: node, column: 0, row: -1 }
      }
      const root = node.getRootNode() as ShadowRoot
      if (part.split(' ').includes('select') && rows.includes(root.host)) {
        return { cell: node, column: 0, row: rows.indexOf(root.host) }
      }
      const parent = node.parentElement
      if (parent && rows.includes(parent) && shown(node)) {
        const column = this.cellsOf(parent).indexOf(node)
        return { cell: node, column: column + this.offset, row: rows.indexOf(parent) }
      }
    }
    return undefined
  }

  /** Moves the stop to a place, and focus with it on the next update. */
  private moveTo(place: GridPlace, focus = true): void {
    this.stopRow = place.row === -1 ? 'head' : this.options.rows()[place.row]
    this.stopColumn = place.column
    this.focusWanted = focus
    this.host.requestUpdate()
  }

  /**
   * Writes the stops: a `tabindex` on every cell, `0` on the one holding the
   * stop, and the grid's state on the rows and headings. Takes it all back
   * once the table stops being a grid. Called by the table after each update.
   */
  mark(): void {
    const on = this.options.on()
    const at = this.current()
    const columns = this.options.columns()
    for (const [index, column] of columns.entries()) {
      column.gridCell = on
      column.tabStop = on && at.row === -1 && at.column === index + this.offset
    }
    for (const [index, line] of this.options.rows().entries()) {
      const row = line as Row
      if (row.isTableRow) {
        whenHydrated(row, () => {
          row.gridCell = on
          row.selectStop = on && at.row === index && at.column === 0 && this.offset === 1
        })
      }
      for (const [place, cell] of this.cellsOf(line).entries()) {
        if ('isTableCell' in cell) {
          ;(cell as HelixHeadlessTableCell).gridCell = on
        }
        if (!on) {
          continue
        }
        const stop = at.row === index && at.column === place + this.offset ? 0 : -1
        if (cell.tabIndex !== stop || !cell.hasAttribute('tabindex')) {
          cell.tabIndex = stop
        }
        this.given.add(cell)
      }
    }
    for (const cell of this.given) {
      if (!on || !cell.isConnected) {
        if (!on) {
          cell.removeAttribute('tabindex')
        }
        this.given.delete(cell)
      }
    }
  }

  /** Focuses the stop where a key asked for it. Called by the table after `mark`. */
  place(): void {
    if (!this.focusWanted || !this.options.on()) {
      return
    }
    this.focusWanted = false
    this.cellAt(this.current())?.focus()
  }

  /** The controls in a cell, in order: what Enter and F2 move into, and Tab moves between. */
  private controlsIn(place: GridCell): HTMLElement[] {
    if (place.row === -1) {
      return place.column < this.offset
        ? []
        : (this.options.columns()[place.column - this.offset]?.controls ?? [])
    }
    return place.column < this.offset ? [] : focusableElements(place.cell)
  }

  /**
   * Hands focus to the empty box at the grid's end, or its start, so the Tab
   * under way goes on from there and out of the grid.
   */
  private leave(back: boolean): void {
    const edge = this.options.part(back ? 'grid-start' : 'grid-end')
    if (!edge) {
      return
    }
    /* **A stop for the moment, and only then.** Chromium moves on from an
       element with a `tabindex` of `-1` to the next stop in its scope from the
       start, which was the grid's own stop again; at `0` it moves on from
       where the box is. Back at `-1` once focus goes, so Tab into the table
       never lands on it. */
    edge.tabIndex = 0
    edge.addEventListener(
      'focusout',
      () => {
        edge.tabIndex = -1
      },
      { once: true },
    )
    edge.focus({ preventScroll: true })
  }

  /** How many rows a Page key moves from a cell. */
  private pageFrom(cell: HTMLElement): number {
    const room = scrollRoom(scrollingAncestor(cell, { axis: 'y', overflowing: true }))
    return pageRows(room, cell.getBoundingClientRect().height)
  }

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (!this.options.on() || event.defaultPrevented || event.altKey) {
      return
    }
    const place = this.placeOf(event)
    if (!place) {
      return
    }
    if (event.composedPath()[0] !== place.cell) {
      this.handleControlKey(event, place)
      return
    }
    if (event.key === 'Tab') {
      this.leave(event.shiftKey)
      return
    }
    if (selectsAll(event) && !event.shiftKey) {
      if (this.options.selectAll()) {
        event.preventDefault()
      }
      return
    }
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'F2') {
      if (event.key !== 'F2' && this.options.activate(place, event)) {
        event.preventDefault()
        return
      }
      const first = event.key === ' ' ? undefined : this.controlsIn(place)[0]
      if (first) {
        event.preventDefault()
        first.focus()
      }
      return
    }
    const to = gridMove(
      event.key,
      place,
      { last: this.options.rows().length - 1, top: this.top, width: this.widthOf(place.row) },
      {
        control: event.ctrlKey || event.metaKey,
        page: event.key.startsWith('Page') ? this.pageFrom(place.cell) : 1,
        step: inlineStep(this.host, event.key),
      },
    )
    if (!to) {
      return
    }
    event.preventDefault()
    to.column = Math.max(0, Math.min(to.column, this.widthOf(to.row) - 1))
    if (to.row !== place.row || to.column !== place.column) {
      this.moveTo(to)
    }
  }

  /** The keys the grid takes while focus is on a control inside a cell. */
  private handleControlKey(event: KeyboardEvent, place: GridCell): void {
    if (event.key === 'Escape' || event.key === 'F2') {
      event.preventDefault()
      place.cell.focus()
      return
    }
    if (event.key !== 'Tab') {
      return
    }
    const origin = event.composedPath()[0] as Node
    const controls = this.controlsIn(place)
    const at = controls.findIndex((one) => deepContains(one, origin))
    const next = at >= 0 ? controls[at + (event.shiftKey ? -1 : 1)] : undefined
    if (next) {
      event.preventDefault()
      next.focus()
      return
    }
    this.leave(event.shiftKey)
  }

  /**
   * Focus arriving on a cell, or inside one. From outside the grid by the
   * keyboard, anywhere but the stop is handed to the stop; otherwise the stop
   * moves to where focus went.
   */
  private readonly handleFocusIn = (event: FocusEvent): void => {
    if (!this.options.on()) {
      return
    }
    const place = this.placeOf(event)
    if (!place) {
      return
    }
    /* Tab from outside lands on the first control in the grid's order, which
       may be a link in a row above the stop: a cell is reached by Tab only
       where it is the stop, so a control is what arrives anywhere else. A
       cell focused from outside, by a script, keeps its focus. */
    const from = event.relatedTarget
    const entering = !(from instanceof Node && deepContains(this.host, from))
    if (entering && !this.pointing && event.composedPath()[0] !== place.cell) {
      const stop = this.cellAt(this.current())
      if (stop) {
        stop.focus()
        return
      }
    }
    const at = this.current()
    if (at.row !== place.row || at.column !== place.column) {
      this.moveTo(place, false)
    }
  }

  /** A press is under way, so the focus it brings stays where it lands. */
  private readonly handlePointerDown = (): void => {
    this.pointing = true
    setTimeout(() => {
      this.pointing = false
    })
  }
}
