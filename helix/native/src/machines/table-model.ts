/**
 * What a phone's table reads of what it is passed: its columns and its rows, in
 * the order they are written.
 *
 * **The web element reads the document.** A phone has the elements a page passes
 * in, which say all of it before anything draws, so a sort, the keys, and a
 * cell's heading read them with no row having drawn. A row a page wraps in a
 * component of its own says only what its props say.
 */
import { fittedTracks, SAMPLE, tracksOf } from '@fusion.dev/helix-core/table'
import { Children, isValidElement, type ReactElement, type ReactNode } from 'react'
import { wordsOf } from './words'

/** A cell of a row, as a table reads it. */
export interface CellModel {
  readonly element: ReactNode
  /** Whether it holds words alone, which a screen reader reaches as one stop. */
  readonly plain: boolean
  readonly words: string
}

/** A column, as a table reads it. */
export interface ColumnModel {
  readonly element: ReactElement
  readonly field: string
  readonly key: string
  readonly sortable: boolean
  readonly textAlign: string
  readonly width: string
  readonly words: string
}

/** A row, as a table reads it. */
export interface RowModel {
  readonly cells: readonly CellModel[]
  readonly disabled: boolean
  readonly element: ReactNode
  readonly href: string
  readonly key: string
  readonly parent: string
  readonly words: string
}

type Read = Readonly<Record<string, unknown>>

/** The tag a Helix component says it draws. */
const tagOf = (child: ReactElement): unknown => (child.type as { readonly tag?: unknown }).tag

/** Whether a column or a cell is drawn: `hidden="until-found"` is, as on the web. */
export const isShown = (child: ReactElement): boolean => {
  const { hidden } = child.props as Read
  return hidden === undefined || hidden === null || hidden === false || hidden === 'until-found'
}

const textOf = (value: unknown): string => (typeof value === 'string' ? value : '')

/** The elements passed in, leaving out what a region holds. */
const passed = (children: unknown): ReactNode[] =>
  Children.toArray(children as ReactNode).filter(
    (child) => !(isValidElement(child) && typeof (child.props as Read).slot === 'string'),
  )

/** Whether a child is a table's column. */
const isColumn = (child: unknown): child is ReactElement =>
  isValidElement(child) && tagOf(child) === 'helix-table-column'

const wordsIn = (value: unknown): string =>
  wordsOf(value as never)
    .replace(/\s+/g, ' ')
    .trim()

/** Whether a cell holds words and numbers alone. */
const holdsWords = (children: unknown): boolean =>
  Children.toArray(children as ReactNode).every(
    (child) => typeof child === 'string' || typeof child === 'number',
  )

/** The cells a row's children are, as a row and the table each read them. */
export const cellsOf = (children: unknown): CellModel[] =>
  passed(children).flatMap((child) => {
    if (isValidElement(child) && !isShown(child)) {
      return []
    }
    const held = isValidElement(child) ? (child.props as Read).children : child
    return [{ element: child, plain: holdsWords(held), words: wordsIn(held) }]
  })

const columnOf = (element: ReactElement, at: number): ColumnModel => {
  const props = element.props as Read
  return {
    element,
    field: textOf(props.field),
    key: element.key === null ? String(at) : String(element.key),
    sortable: props.sortable === true,
    textAlign: textOf(props.textAlign),
    width: textOf(props.width),
    words: wordsIn(props.children),
  }
}

const rowOf = (element: ReactNode, at: number): RowModel => {
  const props = (isValidElement(element) ? element.props : {}) as Read
  const cells = cellsOf(props.children)
  return {
    cells,
    disabled: props.disabled === true,
    element,
    href: textOf(props.href),
    key: textOf(props.value) || String(at),
    parent: textOf(props.parent),
    words: cells[0]?.words ?? '',
  }
}

/** The columns and the rows passed in, in the order they are written. */
export const modelOf = (
  children: unknown,
): { readonly columns: ColumnModel[]; readonly rows: RowModel[] } => {
  const all = passed(children)
  return {
    columns: all
      .filter(isColumn)
      .filter(isShown)
      .map((element, at) => columnOf(element, at)),
    rows: all.filter((child) => !isColumn(child)).map((element, at) => rowOf(element, at)),
  }
}

const DEFAULT_TRACK = 'minmax(max-content, 1fr)'

/**
 * Each column's track, as the web element works them out: its own `width`, the
 * track in its place in `columns`, what a table fits to what it holds, and the
 * default. With no columns, `columns` is the whole list, and one track without
 * it, as the web's grid has.
 */
export const tracksFor = (
  columns: readonly ColumnModel[],
  rows: readonly RowModel[],
  written: string,
  resized: Readonly<Record<string, string>>,
): readonly string[] => {
  if (columns.length === 0) {
    const listed = tracksOf(written, 64)
    return listed.length === 0 ? ['minmax(0, 1fr)'] : listed
  }
  const listed = tracksOf(written, columns.length)
  const width = (column: ColumnModel): string => resized[column.key] ?? column.width
  const open = columns.map((column, at) => !width(column) && !listed[at])
  const widths = columns.map((column) => column.words.length)
  for (const row of rows.slice(0, SAMPLE)) {
    for (const [at, was] of widths.entries()) {
      widths[at] = Math.max(was, row.cells[at]?.words.length ?? 0)
    }
  }
  const fitted = open.includes(true) ? fittedTracks(open, widths) : []
  return columns.map((column, at) => width(column) || listed[at] || fitted[at] || DEFAULT_TRACK)
}

/** What the table holds of a reader's moves and its tracks across draws. */
export interface Standing {
  anchor: string | undefined
  asked: number | undefined
  contents: number[]
  measured: Map<string, string>
  nodes: Map<string, unknown>
  scheduled: boolean
  stop: { column: number; row: string | 'head' } | undefined
  wantsFocus: boolean
}

export const noStanding = (): Standing => ({
  anchor: undefined,
  asked: undefined,
  contents: [],
  measured: new Map(),
  nodes: new Map(),
  scheduled: false,
  stop: undefined,
  wantsFocus: false,
})
