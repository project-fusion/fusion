import type { Left } from './format.js'

/*
 * A table, as the web half of the conformance suite reads what a screen reader
 * hears of each row it draws. The element's rows are the page's markup, drawn in
 * the order the default slot was given them.
 */

type Row = HTMLElement & {
  readonly branch?: boolean
  readonly disabled?: boolean
  readonly open?: boolean
  readonly value?: string
}

type Column = HTMLElement & {
  readonly sorted?: string
  readonly cellBox?: HTMLElement | null
}

const wordsOf = (element: Element | undefined): string =>
  (element?.textContent ?? '').replace(/\s+/g, ' ').trim()

/** A cell's reading: the column's heading, then its words. */
const reading = (heading: string, words: string): string =>
  heading === '' ? words : `${heading}: ${words}`

/** Where a grid's one stop stands, as its row's key and its column. */
const stopIn = (table: HTMLElement, rows: readonly Row[], columns: readonly Column[]): string => {
  const lead = (table as unknown as { lead?: readonly string[] }).lead ?? []
  const at = columns.findIndex((column) => column.cellBox?.getAttribute('tabindex') === '0')
  if (at >= 0) {
    return `head/${lead.length + at}`
  }
  const head = lead.findIndex((name) => {
    const part = { expand: 'expand-head', grip: 'grip-head', select: 'select-all' }[name]
    return table.shadowRoot?.querySelector(`[part~="${part}"]`)?.getAttribute('tabindex') === '0'
  })
  if (head >= 0) {
    return `head/${head}`
  }
  for (const [place, row] of rows.entries()) {
    const key = row.value || String(place)
    const leading = lead.findIndex(
      (name) =>
        row.shadowRoot?.querySelector(`[part~="${name}"]`)?.getAttribute('tabindex') === '0',
    )
    if (leading >= 0) {
      return `${key}/${leading}`
    }
    const cell = [...row.children].findIndex((one) => one.getAttribute('tabindex') === '0')
    if (cell >= 0) {
      return `${key}/${lead.length + cell}`
    }
  }
  return ''
}

/** What a table holds and says, as the record holds it. */
export const tableOf = (table: HTMLElement): NonNullable<Left['table']> => {
  const slot = table.shadowRoot?.querySelector<HTMLSlotElement>('slot:not([name])')
  const rows = (slot?.assignedElements() ?? []) as Row[]
  const columns = [...table.children].filter(
    (child) => child.localName === 'helix-table-column',
  ) as Column[]
  const headings = columns.map((column) => wordsOf(column))
  const { selected, sort } = table as unknown as { selected: string; sort: string }
  const written = [...table.children].filter((child) => child.localName === 'helix-table-row')
  return {
    heads: columns.map((column, at) => ({
      sorted: column.sorted ?? null,
      words: headings[at] ?? '',
    })),
    rows: rows.map((row) => ({
      cells: [...row.children].map((cell, at) => reading(headings[at] ?? '', wordsOf(cell))),
      disabled: row.disabled === true,
      expanded: row.branch === true ? row.open === true : null,
      key: row.value || String(written.indexOf(row)),
    })),
    selected,
    sort,
    stop: stopIn(table, rows, columns),
  }
}

/** The element a grid's reader tabs to: its one stop. */
export const tableStop = (table: HTMLElement): HTMLElement | null => {
  for (const child of table.children) {
    const box = (child as Column).cellBox
    if (box?.getAttribute('tabindex') === '0') {
      return box
    }
    const cell = [...child.children].find((one) => one.getAttribute('tabindex') === '0')
    if (cell instanceof HTMLElement) {
      return cell
    }
    const lead = child.shadowRoot?.querySelector<HTMLElement>('[tabindex="0"]')
    if (lead) {
      return lead
    }
  }
  return table.shadowRoot?.querySelector<HTMLElement>('[tabindex="0"]') ?? null
}
