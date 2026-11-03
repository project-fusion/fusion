/**
 * The machine a table drawn from an array runs on a phone: what a reader
 * searches, sorts, pages through, opens, hides, and moves, worked out by core's
 * arithmetic as on the web, and the rows of it handed to Table's machine.
 *
 * **Each row is a `TableRow`**, so tracks, the pinned first column, what a screen
 * reader hears of a cell, selecting, and moving rows are Table's, and one set of
 * rules. The hooks a page sets here reach those rows through their own names.
 */
import { cycle, format, inRowOrder, parse } from '@fusion.dev/helix-core/table'
import { formatMessage } from '@fusion.dev/helix-core/words'
import { useMemo, useState } from 'react'
import type { MachineUse } from '../ir.generated'
import type { Behavior, Props } from '../render/behavior'
import { madeFor } from '../render/made'
import type { Family } from '../style/form'
import { useDataTableHandle } from './data-table-handle'
import { DataTableMenuContext, type DataTableMenus } from './data-table-menu'
import {
  axesOf,
  cellContent,
  columnsOf,
  type DataColumn,
  inOrder,
  seenOf,
} from './data-table-model'
import { TreeMark } from './data-table-tree-mark'
import { boundTo, given, tell } from './props'
import { useTable } from './table'
import { ask, reader, useHeld } from './table-choice'
import { wordOf } from './table-words'

/** The rows a table holds. */
type Rows = readonly Readonly<Record<string, unknown>>[]

/** What Table's machine reads and sends, by the names a Data Table has for them. */
const TABLE_PROPS: Readonly<Record<string, string>> = {
  columns: 'columns',
  defaultExpanded: 'default-expanded',
  defaultSelected: 'default-selected',
  defaultSort: 'default-sort',
  expanded: 'expanded',
  label: 'label',
  loadMore: 'load-more',
  reorderable: 'reorderable-rows',
  selectable: 'selectable',
  selected: 'selected',
  selectionBehavior: 'selection-behavior',
  sort: 'sort',
  windowed: 'windowed',
}

const TABLE_EVENTS: Readonly<Record<string, string>> = {
  onBeforeReorder: 'before-reorder',
  onBeforeSelect: 'before-select',
  onBeforeSort: 'before-sort',
  onExpand: 'expand',
  onLoadMore: 'load-more',
  onReorder: 'reorder',
  onSelect: 'select',
  onSort: 'sort',
}

/** A Data Table's use, in the names Table's machine binds. */
const asTable = (use: MachineUse): MachineUse => ({
  ...use,
  bind: {
    ...use.bind,
    ...Object.fromEntries(Object.entries(TABLE_PROPS).map(([to, prop]) => [to, { prop }])),
    ...Object.fromEntries(Object.entries(TABLE_EVENTS).map(([to, event]) => [to, { event }])),
  },
})

/** A number as text, written as a number or as the web's attribute writes one, `page-size="4"`. */
const numberWords = (written: unknown): string | undefined =>
  (typeof written === 'number' || typeof written === 'string') &&
  written !== '' &&
  !Number.isNaN(Number(written))
    ? String(written)
    : undefined

/** A page's size and the page, each held as a number between a page's writes. */
const useHeldNumber = (written: unknown, seed: unknown) => {
  const [held, setHeld] = useHeld(numberWords(written), numberWords(seed) ?? '0')
  return [Number(held), (next: number) => setHeld(String(next))] as const
}

/** The column whose cells head their rows, as the web finds it. */
const headerOf = (columns: readonly DataColumn[]): DataColumn | undefined =>
  columns.find((column) => column.rowHeader) ?? columns.find((column) => column.field !== '')

/** What the columns a reader arranged leave: their order, and the ones hidden. */
const useArranged = (family: Family, props: Props, use: MachineUse) => {
  const [order, setOrder] = useHeld(
    given(family, props, 'order'),
    given(family, props, 'default-order'),
  )
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set())
  const all = useMemo(() => columnsOf(props.children), [props.children])
  const arrangedColumns = inOrder(all, order)
  const isOut = (column: DataColumn): boolean => column.hidden || hidden.has(column.field)
  const shown = arrangedColumns.filter((column) => !isOut(column))
  const moveColumn = (field: string, by: number): void => {
    const fields = shown.map((column) => column.field)
    const past = fields[fields.indexOf(field) + by]
    if (past === undefined) {
      return
    }
    const list = arrangedColumns.map((column) => column.field).filter((one) => one !== field)
    list.splice(list.indexOf(past) + (by > 0 ? 1 : 0), 0, field)
    const value = list.join(' ')
    const detail = {
      from: arrangedColumns.findIndex((column) => column.field === field),
      key: field,
      keys: list,
      kind: 'column',
      to: list.indexOf(field),
      value,
    }
    const before = boundTo(use, 'onBeforeReorder', 'event')
    if (before !== undefined && !tell(family, props, before, detail)) {
      return
    }
    setOrder(value)
    const after = boundTo(use, 'onReorder', 'event')
    if (after !== undefined) {
      tell(family, props, after, detail)
    }
  }
  const toggle = (field: string, hide: boolean): boolean => {
    const column = all.find((one) => one.field === field)
    const out = column !== undefined && isOut(column)
    if (column === undefined || field === '' || out === hide || (hide && shown.length <= 1)) {
      return false
    }
    const detail = { field, hidden: hide }
    if (!tell(family, props, 'before-column-toggle', detail)) {
      return false
    }
    setHidden((was) => {
      const next = new Set(was)
      if (hide) {
        next.add(field)
      } else {
        next.delete(field)
      }
      return next
    })
    tell(family, props, 'column-toggle', detail)
    return true
  }
  return { all, arrangedColumns, hidden, moveColumn, shown, toggle }
}

/** The search, the page, and its size. */
const usePaged = (family: Family, props: Props) => {
  const [filter, setFilter] = useHeld(
    given(family, props, 'filter'),
    given(family, props, 'default-filter'),
  )
  const search = (query: string): boolean => {
    if (!tell(family, props, 'before-filter', { value: query })) {
      return false
    }
    setFilter(query)
    tell(family, props, 'filter', { value: query })
    return true
  }
  const [size] = useHeldNumber(
    given(family, props, 'page-size'),
    given(family, props, 'default-page-size'),
  )
  const [page, setPage] = useHeldNumber(
    given(family, props, 'page'),
    given(family, props, 'default-page'),
  )
  const navigate = (next: number): boolean => {
    const value = String(next)
    const details = { page: next, value }
    if (!tell(family, props, 'before-navigate', details)) {
      return false
    }
    setPage(next)
    tell(family, props, 'navigate', details)
    return true
  }
  return { filter, navigate, page: Math.max(1, page), search, size: Math.max(0, Math.floor(size)) }
}

/** Hosts a table drawn from an array. */
export const useDataTable = (family: Family, props: Props, use: MachineUse): Behavior => {
  const tableUse = asTable(use)
  const read = reader(family, props, tableUse)
  const data = (read('data') ?? []) as Rows
  const rowKey = String(given(family, props, 'row-key') ?? '')
  const childField = String(given(family, props, 'child-field') ?? '')
  const server = given(family, props, 'mode') === 'server'
  const total = Number(given(family, props, 'total') ?? 0)
  const heldSort = useHeld(read('sort'), read('defaultSort'))
  const [sort, setSort] = heldSort
  const sorting = {
    sort,
    toggleSort: (field: string): void => {
      const value = format(cycle(parse(sort), field))
      ask(family, props, tableUse, ['onBeforeSort', 'onSort'], value, () => setSort(value))
    },
  }
  const expanded = useHeld(read('expanded'), read('defaultExpanded'))
  const columns = useArranged(family, props, tableUse)
  const paged = usePaged(family, props)
  const open = new Set(expanded[0].split(',').filter((one) => one !== ''))
  const axes = useMemo(() => axesOf(columns.all), [columns.all])
  const seen = seenOf(data, axes, {
    childField,
    filter: paged.filter,
    open,
    page: paged.page,
    rowKey,
    server,
    size: paged.size,
    sort: sorting.sort,
    total,
  })
  const header = headerOf(columns.shown)
  const says = (name: string): string => wordOf(family, props, name)
  const disclose = (key: string): void => {
    const next = new Set(open)
    if (!next.delete(key)) {
      next.add(key)
    }
    const value = inRowOrder(next, seen.every).join(',')
    ask(family, props, tableUse, ['onBeforeExpand', 'onExpand'], value, () => expanded[1](value))
  }
  const row = madeFor('helix-table-row')
  const cell = madeFor('helix-table-cell')
  const hooks = (props as { readonly hooks?: Readonly<Record<string, unknown>> }).hooks
  const rowHooks = hooks === undefined ? undefined : rowHooksOf(hooks)
  const children = [
    ...columns.arrangedColumns.map((column) =>
      column.hidden || columns.hidden.has(column.field) ? null : column.element,
    ),
    ...(row === undefined || cell === undefined
      ? []
      : seen.page.map(({ key, row: entry }) => (
          <row.Component hooks={rowHooks} key={key} value={key}>
            {columns.shown.map((column) => (
              <cell.Component header={column === header} hooks={rowHooks} key={column.field}>
                {column === header && childField !== '' ? (
                  <TreeMark
                    branch={seen.shapes.get(key)?.branch === true}
                    label={formatMessage(
                      says('expandRowLabel'),
                      { row: String(column.read(entry)) },
                      '',
                    )}
                    level={seen.shapes.get(key)?.level ?? 1}
                    onPress={() => disclose(key)}
                    open={open.has(key)}
                  />
                ) : null}
                {cellContent(column.read(entry))}
              </cell.Component>
            ))}
          </row.Component>
        ))),
  ]
  useDataTableHandle({
    columns: columns.shown,
    hide: columns.toggle,
    ref: props.ref,
    rows: seen.all,
    search: paged.search,
    toggleSort: (field) => {
      const value = format(cycle(parse(sorting.sort), field))
      return ask(family, props, tableUse, ['onBeforeSort', 'onSort'], value, () => setSort(value))
    },
  })
  const table = useTable(family, { ...props, children }, tableUse, {
    everyKey: seen.every,
    expanded,
    grid: true,
    shapes: seen.shapes,
    sorting,
  })
  const pages = paged.size > 0 ? Math.max(1, Math.ceil(seen.matched / paged.size)) : 1
  const paginated = given(family, props, 'paginated') === true || paged.size > 0
  const moreDrawn =
    read('loadMore') === true &&
    given(family, props, 'loading') !== true &&
    String(given(family, props, 'errorText') ?? '') === '' &&
    seen.page.length > 0
  const menus: DataTableMenus = {
    columns: columns.shown.map((column) => column.field),
    hide: (field) => columns.toggle(field, true),
    move: columns.moveColumn,
    moves: given(family, props, 'reorderable') === true,
    restorable: columns.arrangedColumns
      .filter((column) => columns.hidden.has(column.field))
      .map((column) => column.field),
    restore: (fields) => {
      for (const field of fields) {
        columns.toggle(field, false)
      }
    },
    says,
    sort: sorting.sort,
    sortTo: (field, direction) => {
      const value = format({ direction, field })
      if (value !== sorting.sort) {
        ask(family, props, tableUse, ['onBeforeSort', 'onSort'], value, () => setSort(value))
      }
    },
  }
  return {
    ...table,
    parts: {
      ...table.parts,
      host: {
        ...table.parts.host,
        states: {
          ...table.parts.host?.states,
          more: moreDrawn,
          pagination: paginated,
        },
      },
      'more-button': {
        view: {
          accessibilityRole: 'button',
          onPress: () => {
            const sends = boundTo(tableUse, 'onLoadMore', 'event')
            if (sends !== undefined) {
              tell(family, props, sends, {})
            }
          },
        },
      },
      pagination: {
        view: {
          gapLabel: says('gapLabel'),
          label: says('paginationLabel'),
          locale: says('locale'),
          nextLabel: says('nextLabel'),
          onBeforeNavigate: (event: {
            readonly detail: { readonly value: string }
            preventDefault: () => void
          }) => {
            const wanted = Number(event.detail.value)
            if (!Number.isFinite(wanted) || wanted > pages || !paged.navigate(wanted)) {
              event.preventDefault()
            }
          },
          page: Math.min(paged.page, pages),
          pageLabel: says('pageLabel'),
          pageSize: paged.size || 1,
          previousLabel: says('previousLabel'),
          total: seen.matched,
        },
      },
    },
    provide: (inside) => (
      <DataTableMenuContext.Provider value={menus}>
        {table.provide === undefined ? inside : table.provide(inside)}
      </DataTableMenuContext.Provider>
    ),
  }
}

/** What Data Table's hooks are called on the rows and cells it draws. */
const HOOKS_OF_A_ROW: Readonly<Record<string, string>> = {
  draggingOpacity: 'draggingOpacity',
  dropIndicatorColor: 'dropIndicatorColor',
  dropIndicatorSize: 'dropIndicatorSize',
  gripColor: 'gripColor',
  gripDisabledOpacity: 'gripDisabledOpacity',
  paddingBlock: 'paddingBlock',
  ruleColor: 'ruleColor',
}

const rowHooksOf = (hooks: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> =>
  Object.fromEntries(
    Object.entries(HOOKS_OF_A_ROW).flatMap(([from, to]) =>
      hooks[from] === undefined ? [] : [[to, hooks[from]]],
    ),
  )
