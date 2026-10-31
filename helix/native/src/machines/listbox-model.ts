/**
 * What a list of options works out from what it holds: its options as it reads
 * them, a Shift range, a press, a move, and what it says of its state. Pure, so
 * `useListbox` only runs what these say.
 */
import { measure } from '@fusion.dev/helix-core/capabilities/measure'
import { columnStep, type DataOption, pageRows, rangeAdd } from '@fusion.dev/helix-core/listbox'
import type { OptionMember, OptionStanding } from './option'
import { type Reached, reachable } from './virtual-focus'

/** How many rows a page key moves where the list has no height to measure. */
const PAGE = 10

/** One option as the list reads it, whether a page wrote it or `items` holds it. */
export interface Entry extends Reached {
  readonly group: object | undefined
  readonly href: string
  readonly key: object | undefined
}

/** What the machine holds of its options across its draws. */
export interface Held {
  groups: object[]
  members: Map<object, OptionMember>
  order: object[]
  pass: object[]
}

/** A finger's move of an option: where it started and where it would land, among those it moves with. */
export interface Drag {
  readonly from: number
  readonly key: object
  readonly to: number
}

/** The options as the list reads them. */
export const entriesOf = (
  records: readonly DataOption[] | undefined,
  held: Held,
  shows: (text: string) => boolean,
): Entry[] => {
  if (records !== undefined) {
    return records.map((one) => ({
      disabled: one.disabled,
      group: undefined,
      hidden: !shows(one.text),
      href: '',
      key: undefined,
      text: one.text,
      value: one.value,
    }))
  }
  return held.order.flatMap((key) => {
    const one = held.members.get(key)
    return one === undefined
      ? []
      : [
          {
            disabled: one.disabled,
            group: one.group,
            hidden: !shows(one.text),
            href: one.href,
            key,
            text: one.text,
            value: one.value,
          },
        ]
  })
}

/** Whether two members say the same, so a draw that changed nothing asks for no other. */
export const sameMember = (one: OptionMember | undefined, other: OptionMember): boolean =>
  one !== undefined &&
  one.text === other.text &&
  one.value === other.value &&
  one.disabled === other.disabled &&
  one.href === other.href &&
  one.declared === other.declared &&
  one.group === other.group

/** What a Shift range leaves chosen: every option a reader can reach from the anchor to `to` joins. */
export const extended = (
  entries: readonly Entry[],
  chosen: readonly string[],
  anchor: { current: string },
  to: string,
): string[] | null => {
  const reach = reachable(entries).map((one) => one.value)
  const from = reach.indexOf(anchor.current)
  if (from < 0 && reach.includes(to)) {
    anchor.current = to
  }
  return rangeAdd(chosen, reach, from, reach.indexOf(to))
}

/** What a press on an option or Space makes of the value. */
export const toggled = (
  value: string,
  chosen: readonly string[],
  multiple: boolean,
  anchor: { current: string },
): string => {
  if (!chosen.includes(value)) {
    anchor.current = value
  }
  if (!multiple) {
    return value
  }
  const next = chosen.includes(value) ? chosen.filter((one) => one !== value) : [...chosen, value]
  return next.join(',')
}

/** The options moved together with `key`: its group's, or the list's own. */
export const movesWith = (entries: readonly Entry[], key: object | undefined): Entry[] => {
  const group = entries.find((one) => one.key === key)?.group
  return entries.filter((one) => one.group === group)
}

/** An option's box, where it is drawn. */
const boxOf = (held: Held, key: object | undefined) => {
  const node = key === undefined ? undefined : held.members.get(key)?.node()
  return node ? measure().box(node) : null
}

/** How many rows a page key moves. */
export const pageOf = (frame: unknown, entries: readonly Entry[], held: Held): number => {
  const row = boxOf(held, entries.find((one) => !one.hidden && one.key !== undefined)?.key)
  const box = frame ? measure().box(frame) : null
  return row !== null && box !== null && row.height > 0 ? pageRows(box.height, row.height) : PAGE
}

/** Where a grid's Up and Down go: the same column, by where each is drawn. */
export const gridStep = (
  key: string,
  from: string,
  shown: readonly Entry[],
  held: Held,
): string => {
  const starts = shown.map((one) => boxOf(held, one.key)?.x ?? 0)
  const at = shown.findIndex((one) => one.value === from)
  return shown[columnStep(starts, at, key === 'ArrowDown' ? 1 : -1)]?.value ?? from
}

/** Where a finger `along` from where it lifted an option would land it, among those it moves with. */
export const landing = (
  entries: readonly Entry[],
  held: Held,
  drag: Drag,
  along: number,
): { readonly finger: number; readonly to: number } | undefined => {
  const own = boxOf(held, drag.key)
  if (own === null) {
    return undefined
  }
  const around = movesWith(entries, drag.key)
  const finger = own.y + along
  const passed = around.filter((one) => {
    const box = boxOf(held, one.key)
    return box !== null && box.y + box.height / 2 < finger
  }).length
  const to = Math.max(0, Math.min(around.length - 1, passed > drag.from ? passed - 1 : passed))
  return { finger, to }
}

/** Every value in a new order, with one option moved among those it moves with. */
export const reordered = (
  entries: readonly Entry[],
  key: object,
  to: number,
):
  | {
      readonly from: number
      readonly moved: Entry
      readonly order: string[]
      readonly size: number
    }
  | undefined => {
  const around = movesWith(entries, key)
  const from = around.findIndex((one) => one.key === key)
  const moved = around[from]
  if (moved === undefined || from === to || to < 0 || to >= around.length) {
    return undefined
  }
  const inGroup = around.map((one) => one.value)
  inGroup.splice(from, 1)
  inGroup.splice(to, 0, moved.value)
  const left = [...inGroup]
  const order = entries.map((one) =>
    one.group === moved.group ? (left.shift() ?? one.value) : one.value,
  )
  return { from, moved, order, size: around.length }
}

/** The state an option's styles read while a finger moves it, or the one the drop goes beside. */
const moveOf = (at: number, drag: Drag | undefined): OptionStanding['move'] => {
  if (drag === undefined || at < 0) {
    return undefined
  }
  if (at === drag.from) {
    return 'dragging'
  }
  if (at !== drag.to) {
    return undefined
  }
  return drag.to > drag.from ? 'drop-after' : 'drop-before'
}

/** What a list says of one option. */
export const standingOf = (
  value: string,
  entries: readonly Entry[],
  active: string,
  chosen: readonly string[],
  drag: Drag | undefined,
): OptionStanding => {
  const entry = entries.find((one) => one.value === value)
  const set = drag === undefined ? undefined : movesWith(entries, drag.key)
  return {
    active: active === value,
    hidden: entry?.hidden === true,
    move: moveOf(set === undefined || entry === undefined ? -1 : set.indexOf(entry), drag),
    selected: chosen.includes(value),
  }
}

/** What the words about a list's state say. */
export const statusOf = ({
  emptyText,
  entries,
  errorText,
  filter,
  known,
  loading,
  noResultsText,
}: {
  readonly emptyText: string
  readonly entries: readonly Entry[]
  readonly errorText: string
  readonly filter: string
  readonly known: boolean
  readonly loading: boolean
  readonly noResultsText: unknown
}) => {
  const anyShown = entries.some((one) => !one.hidden)
  const given = filter === '' ? entries.length > 0 : anyShown
  const shows = !known || loading ? true : given
  const noResults = known && !loading && filter !== '' && entries.length > 0 && !anyShown
  return {
    emptyShown: errorText === '' && !loading && !shows,
    emptyWords: noResults && typeof noResultsText === 'string' ? noResultsText : emptyText,
    errorShown: errorText !== '',
    loadingShown: errorText === '' && loading,
    noResults,
    shows,
  }
}

/** Whether a load is due: within a screen of the end, once for each number of options. */
export const asksForMore = (
  remaining: number,
  frame: number,
  content: number,
  count: number,
  askedAt: number,
): boolean => count !== askedAt && count > 0 && remaining <= frame && content > frame
