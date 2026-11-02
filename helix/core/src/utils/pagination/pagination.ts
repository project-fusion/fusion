/**
 * Pagination's arithmetic: how many pages there are, which of them a row shows
 * and where its gaps stand, where a gap goes, and which items a page holds. The
 * web element and a phone's machine both read it.
 */

export { formatNumbers } from '../format-numbers/format-numbers.js'

/** A run of pages a row does not show. */
export interface Hidden {
  /** First page it covers. */
  readonly from: number
  /** Last page it covers. */
  readonly to: number
}

/** What a slot in the row holds: a page number, or the pages between two runs. */
export type Slot = Hidden | number

/**
 * How many pages, clamped once. `pages` is the explicit answer, then `total` over
 * `pageSize`, and then one, so a result that has not loaded draws a single page.
 */
export const pageCount = (pages: number, total: number, pageSize: number): number => {
  if (pages > 0) {
    return Math.max(1, Math.floor(pages))
  }
  if (total > 0 && pageSize > 0) {
    return Math.max(1, Math.ceil(total / pageSize))
  }
  return 1
}

/**
 * Which pages to show, and where the runs break.
 *
 * `most` is the number of slots the row holds at its widest: both boundaries, the
 * run around the current page, and a gap on each side. Below that nothing is
 * hidden. A gap standing over exactly one page is not drawn, and where one side
 * has no gap the run on that side extends to `most` slots, which holds the width
 * still.
 */
export const paginationSlots = (
  total: number,
  current: number,
  asked: { readonly boundaries: number; readonly siblings: number },
): Slot[] => {
  const boundaries = Math.max(0, Math.floor(asked.boundaries) || 0)
  const siblings = Math.max(0, Math.floor(asked.siblings) || 0)
  const most = 2 * boundaries + 2 * siblings + 3
  const range = (from: number, to: number): number[] =>
    Array.from({ length: Math.max(0, to - from + 1) }, (_, index) => from + index)
  if (total <= most) {
    return range(1, total)
  }
  if (current - siblings <= boundaries + 2) {
    const head = most - boundaries - 1
    return [
      ...range(1, head),
      { from: head + 1, to: total - boundaries },
      ...range(total - boundaries + 1, total),
    ]
  }
  if (current + siblings >= total - boundaries - 1) {
    const tail = total - (most - boundaries - 2)
    return [...range(1, boundaries), { from: boundaries + 1, to: tail - 1 }, ...range(tail, total)]
  }
  return [
    ...range(1, boundaries),
    { from: boundaries + 1, to: current - siblings - 1 },
    ...range(current - siblings, current + siblings),
    { from: current + siblings + 1, to: total - boundaries },
    ...range(total - boundaries + 1, total),
  ]
}

/**
 * Where a gap goes: the middle of what it hides, the binary-search step, so any
 * page in a set of any size is a handful of presses.
 */
export const gapTarget = (hidden: Hidden): number => Math.round((hidden.from + hidden.to) / 2)

/** Which side of the current page a gap stands on, which keys its control. */
export const gapKey = (hidden: Hidden, current: number): string =>
  hidden.from < current ? 'gap-before' : 'gap-after'

/**
 * The first and last item a page holds, or nothing where no count is known. A page
 * past the end is held to the last one, as the row beside it holds it, and the last
 * item to the total, since the last page is rarely full.
 */
export const pageRange = (
  page: number,
  pageSize: number,
  total: number,
): { readonly from: number; readonly to: number } | undefined => {
  if (total <= 0 || pageSize <= 0) {
    return undefined
  }
  const size = Math.max(1, Math.floor(pageSize))
  const pages = Math.max(1, Math.ceil(total / size))
  const at = Math.min(pages, Math.max(1, Math.floor(page) || 1))
  const from = (at - 1) * size + 1
  return { from, to: Math.min(total, from + size - 1) }
}

/** The sizes a page-size control offers, from its comma-separated attribute. */
export const pageSizes = (sizes: string): number[] =>
  sizes
    .split(',')
    .map((one) => Number.parseInt(one.trim(), 10))
    .filter((one) => Number.isFinite(one) && one > 0)
