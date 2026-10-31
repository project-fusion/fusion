/**
 * What a phone's table holds of a reader's choices: the sort, the selection, and
 * what a screen reader hears as each one changes. Each asks first, as the web's
 * `requestChange` does.
 */
import { announce } from '@fusion.dev/helix-core/capabilities/announce'
import {
  commaList,
  cycle,
  format,
  inRowOrder,
  parse,
  toggleEvery,
} from '@fusion.dev/helix-core/table'
import { useEffect, useRef, useState } from 'react'
import type { MachineUse } from '../ir.generated'
import type { Props } from '../render/behavior'
import type { Family } from '../style/form'
import { boundTo, given, tell } from './props'
import type { ColumnModel, RowModel, Standing } from './table-model'
import { worded, wordOf } from './table-words'

/** A value the page writes, and between writes what a reader last chose, as on the web. */
export const useHeld = (
  written: unknown,
  seed: unknown,
): readonly [string, (next: string) => void] => {
  const [held, setHeld] = useState(() =>
    typeof written === 'string' ? written : String(seed ?? ''),
  )
  const [seen, setSeen] = useState(written)
  if (seen !== written) {
    setSeen(written)
    if (typeof written === 'string') {
      setHeld(written)
    }
  }
  return [held, setHeld]
}

/** Reads a table's prop by the name its source binds. */
export const reader = (family: Family, props: Props, use: MachineUse) => (name: string) =>
  given(family, props, boundTo(use, name, 'prop'))

/** Asks with `before`, then applies and says it with `after`, as the web's `requestChange` does. */
export const ask = (
  family: Family,
  props: Props,
  use: MachineUse,
  names: readonly [string, string],
  value: string,
  apply: () => void,
): boolean => {
  const before = boundTo(use, names[0], 'event')
  if (before !== undefined && !tell(family, props, before, { value })) {
    return false
  }
  apply()
  const after = boundTo(use, names[1], 'event')
  if (after !== undefined) {
    tell(family, props, after, { value })
  }
  return true
}

/** What a screen reader hears of a sort. */
const sortSaid = (
  family: Family,
  props: Props,
  sort: string,
  columns: readonly ColumnModel[],
): string => {
  const spec = parse(sort)
  if (!spec) {
    return wordOf(family, props, 'unsortedLabel')
  }
  const column = columns.find((one) => one.field === spec.field)
  return worded(family, props, 'sortedLabel', {
    column: column?.words || spec.field,
    direction: spec.direction === 'asc' ? 'ascending' : 'descending',
  })
}

/** Says what stood in a live region's place: a sort, or a selection beside no sort. */
export const useSaid = (
  family: Family,
  props: Props,
  sort: string,
  selected: string,
  count: number,
  columns: readonly ColumnModel[],
): void => {
  const was = useRef({ selected, sort })
  useEffect(() => {
    const before = was.current
    was.current = { selected, sort }
    if (before.sort !== sort) {
      announce().say(sortSaid(family, props, sort, columns), 'polite')
    } else if (before.selected !== selected) {
      announce().say(worded(family, props, 'selectedLabel', { count }), 'polite')
    }
  })
}

/** What the selection does. */
export const useChoice = (
  family: Family,
  props: Props,
  use: MachineUse,
  rows: readonly RowModel[],
  selected: string,
  setSelected: (next: string) => void,
  standing: Standing,
) => {
  const read = reader(family, props, use)
  const single = read('selectionMode') === 'single'
  const replaces = read('selectable') === true && read('selectionBehavior') === 'replace'
  const order = rows.map((row) => row.key)
  const chosen = new Set(commaList(selected))
  const isOut = (key: string): boolean => rows.find((row) => row.key === key)?.disabled === true
  const request = (next: ReadonlySet<string>): boolean => {
    const value = inRowOrder(next, order).join(',')
    return ask(family, props, use, ['onBeforeSelect', 'onSelect'], value, () => setSelected(value))
  }
  const choose = (key: string, on: boolean): void => {
    if (isOut(key)) {
      return
    }
    standing.anchor = key
    const next = new Set(single ? [] : chosen)
    if (on) {
      next.add(key)
    } else {
      next.delete(key)
    }
    request(next)
  }
  const only = (key: string): void => {
    if (isOut(key)) {
      return
    }
    standing.anchor = key
    if (!(chosen.size === 1 && chosen.has(key))) {
      request(new Set([key]))
    }
  }
  const enabled = order.filter((key) => !isOut(key))
  const chooseAll = (): void => {
    if (!single) {
      request(new Set(toggleEvery(chosen, enabled)))
    }
  }
  return { choose, chooseAll, chosen, enabled, isOut, only, replaces, request, single }
}

/** The sort, and a press on a heading. */
export const useSorting = (family: Family, props: Props, use: MachineUse) => {
  const read = reader(family, props, use)
  const [sort, setSort] = useHeld(read('sort'), read('defaultSort'))
  const toggleSort = (field: string): void => {
    const value = format(cycle(parse(sort), field))
    ask(family, props, use, ['onBeforeSort', 'onSort'], value, () => setSort(value))
  }
  return { sort, toggleSort }
}
