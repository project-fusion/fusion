/**
 * What a phone's `grid` table does with its one stop: which cell holds it, its
 * focus, and what Enter, Space, and Shift do on a cell.
 */
import { focus } from '@fusion.dev/helix-core/capabilities/focus'
import { keys } from '@fusion.dev/helix-core/capabilities/keys'
import { openLink } from '@fusion.dev/helix-core/capabilities/open-link'
import type { KeyPress } from '@fusion.dev/helix-core/capabilities/types'
import {
  anchorAt,
  type GridPlace,
  type RowShape,
  rangeAdd,
  Typeahead,
} from '@fusion.dev/helix-core/table'
import { useLayoutEffect, useRef } from 'react'
import type { useChoice } from './table-choice'
import { type GridHost, gridKey } from './table-keys'
import type { ColumnModel, RowModel, Standing } from './table-model'

/** What a grid's keys read of the table. */
export const useGrid = (
  on: boolean,
  drawn: readonly RowModel[],
  columns: readonly ColumnModel[],
  lead: readonly string[],
  standing: Standing,
  redraw: () => void,
  actions: Omit<
    GridHost,
    'last' | 'lead' | 'moveTo' | 'page' | 'top' | 'typeahead' | 'widthOf' | 'words'
  >,
) => {
  const typeahead = useRef(new Typeahead()).current
  const top = columns.length > 0 || lead.length > 0 ? -1 : 0
  const widthOf = (row: number): number =>
    lead.length + (row === -1 ? columns.length : (drawn[row]?.cells.length ?? 0))
  const rowAt = (key: string | 'head' | undefined): number =>
    key === undefined || key === 'head'
      ? top
      : Math.max(
          top,
          drawn.findIndex((row) => row.key === key),
        )
  const now = (): GridPlace => {
    const row = standing.stop === undefined ? top : rowAt(standing.stop.row)
    const width = widthOf(row)
    return { column: Math.max(0, Math.min(standing.stop?.column ?? 0, width - 1)), row }
  }
  const idOf = (row: number, column: number): string =>
    `${row === -1 ? 'head' : drawn[row]?.key}/${column}`
  const moveTo = (place: GridPlace): void => {
    standing.stop = {
      column: place.column,
      row: place.row === -1 ? 'head' : (drawn[place.row]?.key ?? 'head'),
    }
    standing.wantsFocus = true
    redraw()
  }
  const host: GridHost = {
    ...actions,
    last: drawn.length - 1,
    lead,
    moveTo,
    page: 10,
    top,
    typeahead,
    widthOf,
    words: drawn.map((row) => row.words),
  }
  const hostRef = useRef(host)
  hostRef.current = host
  useLayoutEffect(() => {
    if (standing.wantsFocus && on) {
      standing.wantsFocus = false
      const place = now()
      const node = standing.nodes.get(idOf(place.row, place.column))
      if (node !== undefined) {
        focus().focus(node, false)
      }
    }
  })
  const refs = useRef(new Map<string, (view: unknown) => void>()).current
  const placeOf = (id: string): GridPlace => {
    const cut = id.lastIndexOf('/')
    const rowKey = id.slice(0, cut)
    return {
      column: Number(id.slice(cut + 1)),
      row: rowKey === 'head' ? -1 : latestRows.current.findIndex((row) => row.key === rowKey),
    }
  }
  const latestRows = useRef(drawn)
  latestRows.current = drawn
  const refOf = (id: string): ((view: unknown) => void) => {
    const found = refs.get(id)
    if (found !== undefined) {
      return found
    }
    const made = (view: unknown): (() => void) | undefined => {
      if (view === null) {
        standing.nodes.delete(id)
        return undefined
      }
      standing.nodes.set(id, view)
      return keys().listen(view, (press) =>
        gridKey(hostRef.current, placeOf(id), press as KeyPress),
      )
    }
    refs.set(id, made)
    return made
  }
  const gridCell = (row: number, column: number): Readonly<Record<string, unknown>> => {
    if (!on) {
      return {}
    }
    const id = idOf(row, column)
    const place = now()
    return {
      focusable: place.row === row && place.column === column,
      onFocus: () => {
        const at = placeOf(id)
        const was = now()
        if (at.row !== was.row || at.column !== was.column) {
          standing.stop = {
            column: at.column,
            row: at.row === -1 ? 'head' : (latestRows.current[at.row]?.key ?? 'head'),
          }
          redraw()
        }
      },
      ref: refOf(id),
    }
  }
  return { gridCell }
}

/** What Space and Enter do on a heading. */
const onHeading = (
  column: ColumnModel | undefined,
  kind: string | undefined,
  chooseAll: () => void,
  toggleSort: (field: string) => void,
): boolean => {
  if (kind === 'select') {
    chooseAll()
    return true
  }
  if (column?.sortable && column.field !== '') {
    toggleSort(column.field)
    return true
  }
  return false
}

/** What Space and Enter do on a cell of words: select the row, or follow its link. */
const onCell = (
  row: RowModel,
  kind: string | undefined,
  key: string,
  toggle: boolean,
  choice: ReturnType<typeof useChoice>,
  selectable: boolean,
): boolean => {
  if (selectable && (key === ' ' || kind === 'select')) {
    if (choice.replaces && kind !== 'select' && !toggle) {
      choice.only(row.key)
    } else {
      choice.choose(row.key, !choice.chosen.has(row.key))
    }
    return true
  }
  if (key === 'Enter' && row.href !== '' && !row.disabled) {
    void openLink().open(row.href)
    return true
  }
  return false
}

/** What Space and Enter do on a cell of a grid. */
export const activating =
  (
    drawn: readonly RowModel[],
    columns: readonly ColumnModel[],
    lead: readonly string[],
    shapes: ReadonlyMap<string, RowShape>,
    choice: ReturnType<typeof useChoice>,
    sorting: { readonly toggleSort: (field: string) => void },
    discloseRow: (key: string) => void,
    selectable: boolean,
    pick: (key: string) => void,
  ) =>
  (place: GridPlace, key: string, toggle: boolean): boolean => {
    const kind = lead[place.column]
    if (place.row === -1) {
      return onHeading(
        columns[place.column - lead.length],
        kind,
        choice.chooseAll,
        sorting.toggleSort,
      )
    }
    const row = drawn[place.row]
    if (row === undefined) {
      return false
    }
    if (kind === 'grip') {
      pick(row.key)
      return true
    }
    if (kind === 'expand') {
      const branch = shapes.get(row.key)?.branch === true
      if (branch) {
        discloseRow(row.key)
      }
      return branch
    }
    return onCell(row, kind, key, toggle, choice, selectable)
  }

/** Selects every row from the one last chosen to the drawn row `to`. */
export const rangeTo =
  (
    drawn: readonly RowModel[],
    choice: ReturnType<typeof useChoice>,
    standing: Standing,
    selectable: boolean,
  ) =>
  (to: number, from: number): boolean => {
    if (!selectable) {
      return false
    }
    const target = drawn[to]
    if (choice.single) {
      if (target !== undefined) {
        choice.only(target.key)
      }
      return true
    }
    const list = drawn.map((row) => row.key)
    const { anchor, anchorKey } = anchorAt(list, standing.anchor, from)
    standing.anchor = anchorKey
    const next = rangeAdd([...choice.chosen], list, anchor, to)?.filter(
      (key) => choice.chosen.has(key) || !choice.isOut(key),
    )
    if (next && next.length > choice.chosen.size) {
      choice.request(new Set(next))
    }
    return true
  }
