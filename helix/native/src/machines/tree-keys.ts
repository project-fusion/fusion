/**
 * What a key does on a row of a phone's tree, as the tree pattern says, read
 * from core's arithmetic as the web element's keys are. On a phone they are a
 * hardware keyboard's.
 */
import { environment } from '@fusion.dev/helix-core/capabilities/environment'
import type { KeyPress } from '@fusion.dev/helix-core/capabilities/types'
import { reorderKey } from '@fusion.dev/helix-core/reorder'
import { pressRow, type Typeahead, treeArrow } from '@fusion.dev/helix-core/tree'
import {
  checkRange,
  drop,
  focusOn,
  type Held,
  isMultiple,
  moveTo,
  nest,
  orderOf,
  request,
  say,
  valuesOf,
} from './tree-moves'
import { keyOf, ROOT, rowOf, siblingsOf, type TreeRow, visibleOf, walk } from './tree-rows'

/** Whether the page reads right to left. */
const isRtl = (): boolean => environment().read().direction === 'rtl'

/** The direction a key along the line points, `1` where a shut branch's chevron points. */
const alongOf = (key: string): -1 | 0 | 1 => {
  if (key !== 'ArrowRight' && key !== 'ArrowLeft') {
    return 0
  }
  return (key === 'ArrowRight') === isRtl() ? -1 : 1
}

/** Whether a key types a letter of a search: Space only continues one. */
const typed = (press: KeyPress, typeahead: Typeahead): boolean =>
  [...press.key].length === 1 &&
  !(press.control || press.meta || press.alt || press.claimed) &&
  (press.key !== ' ' || typeahead.typing())

/** Control or Command with A checks every item, or clears them all. */
const checkAll = (held: Held): void => {
  const leaves = walk(held.rows, ROOT, false)
    .filter((one) => !rowOf(held.rows, one).branch && !one.disabled && one.value !== '')
    .map((one) => one.value)
  request(
    held,
    pressRow(
      { branch: true, disabled: false, leaves, value: '' },
      valuesOf(held),
      orderOf(held),
    ).join(','),
  )
}

/** Shift and Space checks every item from the one last checked to this one. */
const checkFromAnchor = (held: Held, row: TreeRow): void => {
  const visible = visibleOf(held.rows)
  const at = visible.indexOf(row)
  const anchor = held.rows.anchor === undefined ? undefined : held.rows.rows.get(held.rows.anchor)
  const from = anchor === undefined ? -1 : visible.indexOf(anchor)
  checkRange(held, from < 0 ? [row] : visible.slice(Math.min(from, at), Math.max(from, at) + 1))
}

/** Control, Shift, and Home or End checks to the end, and moves there. */
const checkToEnd = (held: Held, row: TreeRow, key: string): void => {
  const visible = visibleOf(held.rows)
  const at = visible.indexOf(row)
  const range = key === 'Home' ? visible.slice(0, at + 1) : visible.slice(at)
  checkRange(held, range)
  focusOn(held.rows, key === 'Home' ? range[0] : range.at(-1))
}

/** Shift with Up or Down moves to the item there, and checks or unchecks it. */
const checkNext = (held: Held, row: TreeRow, key: string): void => {
  const visible = visibleOf(held.rows)
  const next = visible[visible.indexOf(row) + (key === 'ArrowDown' ? 1 : -1)]
  if (next !== undefined) {
    focusOn(held.rows, next)
    next.select()
  }
}

/** Which of the keys of a tree of check marks a press is. */
const checkKey = (press: KeyPress): string | undefined => {
  const added = press.control || press.meta
  if (added && !press.shift && press.key.toLowerCase() === 'a') {
    return 'all'
  }
  if (!press.shift) {
    return undefined
  }
  if (press.key === ' ') {
    return 'anchor'
  }
  if (added && (press.key === 'Home' || press.key === 'End')) {
    return 'end'
  }
  return press.key === 'ArrowDown' || press.key === 'ArrowUp' ? 'next' : undefined
}

/** The keys of a tree of check marks. Answers whether the key was one. */
const multipleKey = (held: Held, row: TreeRow, press: KeyPress): boolean => {
  const which = checkKey(press)
  if (which === 'all') {
    checkAll(held)
  } else if (which === 'anchor') {
    checkFromAnchor(held, row)
  } else if (which === 'end') {
    checkToEnd(held, row, press.key)
  } else if (which === 'next') {
    checkNext(held, row, press.key)
  }
  return which !== undefined
}

/** A typed letter moves to the item it starts, and a star opens every branch beside. */
const typing = (held: Held, row: TreeRow, press: KeyPress, typeahead: Typeahead): boolean => {
  if (!typed(press, typeahead)) {
    return false
  }
  if (press.key === '*') {
    for (const one of siblingsOf(held.rows, row)) {
      if (one.branch && !one.open) {
        one.turn(true)
      }
    }
    return true
  }
  const visible = visibleOf(held.rows)
  const at = typeahead.match(
    press.key,
    visible.map((one) => one.words),
    visible.indexOf(row),
  )
  if (at >= 0) {
    focusOn(held.rows, visible[at])
  }
  return true
}

/** The keys of an item a press on its grip holds. Answers whether the key was one. */
const heldKey = (held: Held, row: TreeRow, press: KeyPress): boolean => {
  const { rows, schedule } = held
  const hold = rows.hold
  if (hold === undefined || hold.key !== row.key) {
    return false
  }
  if (press.key === 'Escape' || press.key === 'Enter' || press.key === ' ') {
    drop(held, press.key !== 'Escape')
    return true
  }
  const count = siblingsOf(rows, row).length
  const to = reorderKey(press.key, { axis: 'block', count, rtl: isRtl(), to: hold.to })
  if (to === null) {
    return false
  }
  if (to !== hold.to) {
    rows.hold = { ...hold, to }
    say(held.latest.current, 'movedLabel', {
      count,
      name: row.words || keyOf(row),
      position: to + 1,
    })
    schedule()
  }
  return true
}

/** Alt with an arrow moves an item. Answers whether the key was one. */
const moving = (held: Held, row: TreeRow, press: KeyPress, reorderable: boolean): boolean => {
  if (!press.alt || row.disabled || !reorderable) {
    return false
  }
  const along = alongOf(press.key)
  if (along !== 0) {
    return nest(held, row, along)
  }
  const keys = siblingsOf(held.rows, row).map(keyOf)
  const from = keys.indexOf(keyOf(row))
  const to = reorderKey(press.key, { axis: 'block', count: keys.length, rtl: isRtl(), to: from })
  if (to === null) {
    return false
  }
  moveTo(held, row, to)
  return true
}

/** What the arrow along the line does on a row. */
const arrow = (held: Held, row: TreeRow, along: -1 | 1): void => {
  const { rows } = held
  const said = treeArrow({ branch: row.branch, disabled: row.disabled, open: row.open }, along)
  if (said === 'open' || said === 'close') {
    row.turn(said === 'open')
  } else if (said === 'child') {
    const visible = visibleOf(rows)
    focusOn(rows, visible[visible.indexOf(row) + 1])
  } else if (said === 'parent' && row.parent !== undefined) {
    focusOn(rows, rows.rows.get(row.parent))
  }
}

/** Where a key that moves in the column lands, by the items a reader can reach. */
const columnTo = (held: Held, row: TreeRow, key: string): TreeRow | undefined => {
  const visible = visibleOf(held.rows)
  const at = visible.indexOf(row)
  const places: Readonly<Record<string, number>> = {
    ArrowDown: Math.min(visible.length - 1, at + 1),
    ArrowUp: Math.max(0, at - 1),
    End: visible.length - 1,
    Home: 0,
  }
  const place = places[key]
  return place === undefined ? undefined : visible[place]
}

/** The keys every tree has. Answers whether the key did anything. */
const plain = (held: Held, row: TreeRow, press: KeyPress): boolean => {
  const along = alongOf(press.key)
  const landed = columnTo(held, row, press.key)
  if (isMultiple(held) && press.key === ' ') {
    row.select()
    held.rows.anchor = row.key
  } else if (landed !== undefined) {
    focusOn(held.rows, landed)
  } else if (along !== 0) {
    arrow(held, row, along)
  } else if (press.key === 'Enter' || press.key === ' ') {
    row.activate()
  } else {
    return false
  }
  return true
}

/** What a key pressed on a row does. Answers whether the tree took it. */
export const treeKey = (
  held: Held,
  row: TreeRow,
  press: KeyPress,
  typeahead: Typeahead,
  reorderable: boolean,
): boolean => {
  const took =
    heldKey(held, row, press) ||
    moving(held, row, press, reorderable) ||
    (isMultiple(held) && multipleKey(held, row, press)) ||
    typing(held, row, press, typeahead)
  if (took) {
    return true
  }
  const pressed = plain(held, row, press)
  if (pressed) {
    typeahead.reset()
  }
  return pressed
}
