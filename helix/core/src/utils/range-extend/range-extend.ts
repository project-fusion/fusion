/**
 * What Shift does to a selection of many in a set that keeps where its last
 * range ran, as arithmetic over the set's items.
 *
 * Pure and in core, because List's hand-written selection and core's
 * multiple-selection machine extend a range the same way, and a spec can hold
 * it without a page.
 */

/** A Shift range, by the values of the items it names. */
export interface RangeExtension {
  /**
   * The value of the item the range runs from, or `undefined` where none was
   * set. With none, or with one no item has now, the range runs from `to`.
   */
  readonly anchor: string | undefined

  /** The values of the items a reader can choose, which are the only ones the range takes in. */
  readonly choosable: readonly string[]

  /** Every item's value, in order, those a reader cannot choose too. */
  readonly items: readonly string[]

  /**
   * The value of the item the last range reached, or `undefined` where no
   * range reached one since the anchor was set. With none, or with no anchor
   * an item has, the last range is taken to reach `to`.
   */
  readonly reached: string | undefined

  /** The value of the item the range runs to. */
  readonly to: string
}

/** The values of the items from one place to the other, either way round, or none where either is missing. */
const span = (items: readonly string[], from: number, to: number): string[] =>
  from < 0 || to < 0 ? [] : items.slice(Math.min(from, to), Math.max(from, to) + 1)

/**
 * The selection after Shift extends a range to `to`, or `null` where it holds
 * the same items as before.
 *
 * React Aria's `extendSelection`, in `SelectionManager`, rule for rule: every
 * item from the anchor to where the last range reached is let go, those a
 * reader cannot choose too, and then every item a reader can choose from the
 * anchor to `to` is taken in. So a range that moves back toward its anchor
 * lets go of the items it no longer reaches, and what was selected outside the
 * last range stays selected. What stays keeps its order, and what is taken in
 * comes after it.
 */
export const rangeExtend = (
  values: readonly string[],
  { anchor, choosable, items, reached, to }: RangeExtension,
): string[] | null => {
  const end = items.indexOf(to)
  const known = anchor === undefined ? -1 : items.indexOf(anchor)
  const from = known < 0 ? end : known
  const last = known < 0 || reached === undefined ? end : items.indexOf(reached)
  const dropped = new Set(span(items, from, last))
  const kept = values.filter((value) => !dropped.has(value))
  const taken = span(items, from, end).filter(
    (value) => choosable.includes(value) && !kept.includes(value),
  )
  const next = [...kept, ...taken]
  const same = next.length === values.length && next.every((value) => values.includes(value))
  return same ? null : next
}
