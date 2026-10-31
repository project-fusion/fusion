/**
 * What a phone's tree does as a reader chooses and moves its items: the change
 * of what is chosen, and a move among siblings or into another branch. The web
 * element does the same with the events of the same names.
 */
import { announce } from '@fusion.dev/helix-core/capabilities/announce'
import { focus } from '@fusion.dev/helix-core/capabilities/focus'
import { checkRows, commaList, pressRow } from '@fusion.dev/helix-core/tree'
import { formatMessage } from '@fusion.dev/helix-core/words'
import type { MachineUse } from '../ir.generated'
import type { Props } from '../render/behavior'
import type { Family } from '../style/form'
import { boundTo, given, tell } from './props'
import { keyOf, ROOT, type Rows, rowOf, siblingsOf, type TreeRow, walk } from './tree-rows'

/** What the tree reads, as its latest render has it. */
export interface Latest {
  readonly active: string
  readonly family: Family
  readonly mode: unknown
  readonly props: Props
  readonly use: MachineUse
}

/** What every step of a tree works on. */
export interface Held {
  readonly latest: { current: Latest }
  readonly rows: Rows
  /** Asks the tree to work out again what it says of its items. */
  readonly schedule: () => void
  /** Holds a new value as what is chosen. */
  readonly setActive: (next: string) => void
}

/** Says the words of a label a prop holds, with its values put in. */
export const say = (
  latest: Latest,
  name: string,
  values: Readonly<Record<string, number | string>>,
): void => {
  const words = String(given(latest.family, latest.props, boundTo(latest.use, name, 'prop')) ?? '')
  if (words !== '') {
    announce().say(formatMessage(words, values, ''), 'polite')
  }
}

/** Moves focus to an item, and takes the tree's one stop with it. */
export const focusOn = (rows: Rows, row: TreeRow | undefined): void => {
  if (row === undefined) {
    return
  }
  rows.stop = row.key
  const node = row.node()
  if (node !== null && node !== undefined) {
    focus().focus(node, false)
  }
}

/** Asks to change what is chosen, as the web's `requestActive` does. */
export const request = ({ latest, schedule, setActive }: Held, next: string): void => {
  const now = latest.current
  if (next === now.active) {
    return
  }
  const before = boundTo(now.use, 'onBeforeChange', 'event')
  if (before !== undefined && !tell(now.family, now.props, before, { value: next })) {
    return
  }
  latest.current = { ...now, active: next }
  setActive(next)
  const after = boundTo(now.use, 'onChange', 'event')
  if (after !== undefined) {
    tell(now.family, now.props, after, { previous: now.active, value: next })
  }
  schedule()
}

/** Whether a reader checks many. */
export const isMultiple = ({ latest }: Held): boolean => latest.current.mode === 'multiple'

/** The checked values. */
export const valuesOf = ({ latest }: Held): string[] => commaList(latest.current.active)

/** Every value in the tree, in the order a reader meets the items. */
export const orderOf = ({ rows }: Held): string[] =>
  walk(rows, ROOT, false)
    .map((row) => row.value)
    .filter((value) => value !== '')

/** An item's choice stood: a value alone, or under `multiple`, what a press checks. */
export const chosen = (held: Held, key: object): void => {
  const row = held.rows.rows.get(key)
  if (row === undefined) {
    return
  }
  held.rows.anchor = key
  request(
    held,
    isMultiple(held)
      ? pressRow(rowOf(held.rows, row), valuesOf(held), orderOf(held)).join(',')
      : row.value,
  )
}

/** Checks every item of a range, and keeps the ones already checked. */
export const checkRange = (held: Held, range: readonly TreeRow[]): void =>
  request(
    held,
    checkRows(
      range.map((row) => rowOf(held.rows, row)),
      valuesOf(held),
      orderOf(held),
    ).join(','),
  )

/** A move a tree asks about. */
interface Move {
  readonly from: number
  readonly key: string
  readonly keys: readonly string[]
  readonly parent?: string
  readonly to: number
}

/** Asks the page for a move of an item, and answers whether it stood. */
const ask = (latest: Latest, move: Move): boolean => {
  const before = boundTo(latest.use, 'onBeforeReorder', 'event')
  const after = boundTo(latest.use, 'onReorder', 'event')
  const detail = { ...move, kind: 'item', value: move.keys.join(',') }
  const stood = before === undefined || tell(latest.family, latest.props, before, detail)
  if (stood && after !== undefined) {
    tell(latest.family, latest.props, after, detail)
  }
  return stood
}

/** The keys of siblings once the one at `from` stands at `to`. */
const placed = (keys: readonly string[], from: number, to: number): string[] => {
  const next = keys.filter((_, at) => at !== from)
  next.splice(to, 0, keys[from] ?? '')
  return next
}

/** Moves an item to `to` among its siblings, and says so. */
export const moveTo = ({ latest, rows }: Held, row: TreeRow, to: number): void => {
  const keys = siblingsOf(rows, row).map(keyOf)
  const key = keyOf(row)
  const from = keys.indexOf(key)
  if (to === from || to < 0 || to >= keys.length) {
    return
  }
  const stood = ask(latest.current, { from, key, keys: placed(keys, from, to), to })
  say(latest.current, stood ? 'movedLabel' : 'canceledLabel', {
    count: keys.length,
    name: row.words || key,
    position: to + 1,
  })
}

/** Where a move into the item before an item, or out to after its parent, lands. */
const nestedPlace = (
  rows: Rows,
  row: TreeRow,
  toward: number,
): { readonly into: TreeRow | undefined; readonly keys: string[] } | undefined => {
  const key = keyOf(row)
  if (toward > 0) {
    const siblings = siblingsOf(rows, row)
    const before = siblings[siblings.indexOf(row) - 1]
    if (before === undefined || before.disabled) {
      return undefined
    }
    return { into: before, keys: [...walkKids(rows, before.key).map(keyOf), key] }
  }
  const parent = row.parent === undefined ? undefined : rows.rows.get(row.parent)
  if (parent === undefined) {
    return undefined
  }
  const keys = siblingsOf(rows, parent).map(keyOf)
  keys.splice(keys.indexOf(keyOf(parent)) + 1, 0, key)
  return { into: parent.parent === undefined ? undefined : rows.rows.get(parent.parent), keys }
}

/** The items directly inside an item. */
const walkKids = (rows: Rows, key: object): TreeRow[] =>
  (rows.kids.get(key) ?? []).flatMap((one) => {
    const inside = rows.rows.get(one)
    return inside === undefined ? [] : [inside]
  })

/**
 * Moves an item into the item before it, `toward` the line's end, or out to
 * after its parent. Answers whether the key moved anything.
 */
export const nest = ({ latest, rows }: Held, row: TreeRow, toward: number): boolean => {
  const place = nestedPlace(rows, row, toward)
  if (place === undefined) {
    return false
  }
  const { into, keys } = place
  const key = keyOf(row)
  const to = keys.indexOf(key)
  const now = latest.current
  const from = siblingsOf(rows, row).indexOf(row)
  if (!ask(now, { from, key, keys, parent: into === undefined ? '' : keyOf(into), to })) {
    say(now, 'canceledLabel', {})
    return true
  }
  const top = String(given(now.family, now.props, boundTo(now.use, 'label', 'prop')) ?? '')
  say(now, 'movedIntoLabel', {
    count: keys.length,
    name: row.words || key,
    parent: into === undefined ? top : into.words || keyOf(into),
    position: to + 1,
  })
  if (into !== undefined && !into.open) {
    into.turn(true)
  }
  return true
}

/** Picks an item up. */
export const pickUp = ({ latest, rows, schedule }: Held, key: object): void => {
  const row = rows.rows.get(key)
  if (row === undefined || rows.hold !== undefined) {
    return
  }
  const from = siblingsOf(rows, row).indexOf(row)
  rows.hold = { from, key, to: from }
  say(latest.current, 'pickedUpLabel', { name: row.words || keyOf(row) })
  schedule()
}

/** Puts the held item down where it is held, or back where it was. */
export const drop = ({ latest, rows, schedule }: Held, dropped: boolean): void => {
  const hold = rows.hold
  rows.hold = undefined
  schedule()
  const row = hold === undefined ? undefined : rows.rows.get(hold.key)
  if (hold === undefined || row === undefined) {
    return
  }
  const now = latest.current
  if (!dropped || hold.to === hold.from) {
    say(now, dropped ? 'droppedLabel' : 'canceledLabel', {})
    return
  }
  const keys = siblingsOf(rows, row).map(keyOf)
  const stood = ask(now, {
    from: hold.from,
    key: keyOf(row),
    keys: placed(keys, hold.from, hold.to),
    to: hold.to,
  })
  say(now, stood ? 'droppedLabel' : 'canceledLabel', {})
}
