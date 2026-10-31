/**
 * The items a phone's tree has joined: their order, which of them a reader can
 * reach, and what the tree says of each.
 */

import { dropMark } from '@fusion.dev/helix-core/reorder'
import { type CheckableRow, checkedState, commaList } from '@fusion.dev/helix-core/tree'

/** What stands for the top level, where an item stands in no item. */
export const ROOT: object = {}

/** What an item tells its tree of itself, at its latest draw. */
export interface TreeRow {
  /** Chooses or opens it, as Enter does. */
  readonly activate: () => void
  /** Whether it holds items. */
  readonly branch: boolean
  readonly disabled: boolean
  /** What the tree knows it by. */
  readonly key: object
  /** The view focus moves to. */
  readonly node: () => unknown
  /** Whether its items are shown. */
  readonly open: boolean
  /** The item it stands in, where it stands in one. */
  readonly parent: object | undefined
  /** Chooses it, as a press does. */
  readonly select: () => void
  /** Where a finger that has traveled `by` along the column would drop it. */
  readonly travel: (by: number, siblings: readonly TreeRow[], from: number) => number
  /** Asks it to open or close. */
  readonly turn: (open: boolean) => void
  readonly value: string
  readonly words: string
}

/** What a tree says of an item. */
export interface Facts {
  readonly checked: boolean | 'mixed'
  /** Where it stands in a move. */
  readonly move: 'dragging' | 'drop-after' | 'drop-before' | undefined
  /** Its place among its siblings, from one. */
  readonly position: number
  readonly selected: boolean
  /** How many siblings it has, itself included. */
  readonly size: number
  /** Whether it holds the tree's one stop. */
  readonly stop: boolean
}

/** An item a reader holds. */
export interface Hold {
  readonly from: number
  readonly key: object
  readonly to: number
}

/** What a tree holds of its items. */
export interface Rows {
  /** The item last checked, where a range starts. */
  anchor: object | undefined
  facts: Map<object, Facts>
  hold: Hold | undefined
  /** Each item's items, in order, under `ROOT` for the top level. */
  kids: Map<object, object[]>
  /** The items each item heard draw since the tree last settled, in the order they drew. */
  pass: Map<object, object[]>
  rows: Map<object, TreeRow>
  /** The item that holds the tree's one stop. */
  stop: object | undefined
}

/** The key an item is moved by: its `value`, or its words where it has none. */
export const keyOf = (row: TreeRow): string => row.value || row.words

/**
 * Takes in the order the items drew in. **Those that drew keep the places they
 * held, in the order they drew**, since a draw of some of them says nothing of
 * the others, and an item new to its parent goes last.
 */
const takeOrder = (rows: Rows): void => {
  for (const [parent, seen] of rows.pass) {
    const was = rows.kids.get(parent) ?? []
    const known = was.filter((key) => seen.includes(key))
    const fresh = seen.filter((key) => !was.includes(key))
    let next = 0
    const ordered = seen.filter((key) => was.includes(key))
    const merged = was.map((key) => (known.includes(key) ? (ordered[next++] as object) : key))
    rows.kids.set(parent, [...merged, ...fresh])
  }
  rows.pass.clear()
}

/** Each item under `from`, in the order a reader moving down meets them. */
export const walk = (rows: Rows, from: object, shownOnly: boolean): TreeRow[] => {
  const out: TreeRow[] = []
  for (const key of rows.kids.get(from) ?? []) {
    const row = rows.rows.get(key)
    if (row !== undefined) {
      out.push(row)
      if (!shownOnly || row.open) {
        out.push(...walk(rows, key, shownOnly))
      }
    }
  }
  return out
}

/** The items a reader can reach: none inside a closed branch. */
export const visibleOf = (rows: Rows): TreeRow[] => walk(rows, ROOT, true)

/** An item and those beside it, under one parent, in order. */
export const siblingsOf = (rows: Rows, row: TreeRow): TreeRow[] =>
  (rows.kids.get(row.parent ?? ROOT) ?? []).flatMap((key) => {
    const one = rows.rows.get(key)
    return one === undefined ? [] : [one]
  })

/** What the selection reads of an item. */
export const rowOf = (rows: Rows, row: TreeRow): CheckableRow => {
  const branch = row.branch
  const leaves = branch
    ? walk(rows, row.key, false)
        .filter((one) => !one.branch && !one.disabled && one.value !== '')
        .map((one) => one.value)
    : []
  return { branch, disabled: row.disabled, leaves, value: row.value }
}

/** The nearest item around `row` a reader can see. */
const shownAround = (
  rows: Rows,
  row: TreeRow | undefined,
  visible: readonly TreeRow[],
): TreeRow | undefined => {
  let at = row?.parent === undefined ? undefined : rows.rows.get(row.parent)
  while (at !== undefined) {
    if (visible.includes(at)) {
      return at
    }
    at = at.parent === undefined ? undefined : rows.rows.get(at.parent)
  }
  return undefined
}

/** The item that holds the stop: where it was, or above it, or the chosen item, or the first. */
const stopOf = (rows: Rows, active: string, visible: readonly TreeRow[]): object | undefined => {
  const was = rows.stop === undefined ? undefined : rows.rows.get(rows.stop)
  const held = was !== undefined && visible.includes(was) ? was : shownAround(rows, was, visible)
  const stop =
    held ??
    visible.find((row) => !row.disabled && row.value !== '' && row.value === active) ??
    visible.find((row) => !row.disabled)
  rows.stop = stop?.key
  return stop?.key
}

/** Where an item stands in a move held now. */
const moveOf = (rows: Rows, row: TreeRow, at: number): Facts['move'] => {
  const hold = rows.hold
  if (hold === undefined) {
    return undefined
  }
  if (hold.key === row.key) {
    return 'dragging'
  }
  const moved = rows.rows.get(hold.key)
  if (moved === undefined || moved.parent !== row.parent) {
    return undefined
  }
  const mark = dropMark(hold.from, hold.to)
  if (mark === undefined || mark.index !== at) {
    return undefined
  }
  return mark.edge === 'before' ? 'drop-before' : 'drop-after'
}

/** What the tree says of each item, with the order the items last drew in. */
export const factsOf = (rows: Rows, active: string, multiple: boolean): Map<object, Facts> => {
  takeOrder(rows)
  const visible = visibleOf(rows)
  const stop = stopOf(rows, active, visible)
  const chosen = new Set(multiple ? commaList(active) : [])
  const facts = new Map<object, Facts>()
  for (const row of rows.rows.values()) {
    const siblings = siblingsOf(rows, row)
    const at = siblings.indexOf(row)
    facts.set(row.key, {
      checked: multiple ? checkedState(rowOf(rows, row), chosen) : false,
      move: moveOf(rows, row, at),
      position: at + 1,
      selected: !multiple && row.value !== '' && row.value === active,
      size: siblings.length,
      stop: row.key === stop,
    })
  }
  return facts
}

/** Whether what the tree says of its items has changed. */
export const settled = (rows: Rows, next: ReadonlyMap<object, Facts>): boolean => {
  if (rows.facts.size !== next.size) {
    return true
  }
  for (const [key, facts] of next) {
    const was = rows.facts.get(key)
    if (
      was === undefined ||
      (Object.keys(facts) as (keyof Facts)[]).some((name) => was[name] !== facts[name])
    ) {
      return true
    }
  }
  return false
}
