/**
 * Which item a key moves to in a vertical list of `count` items, from `at`.
 *
 * Index arithmetic, because most of the items are not drawn: the list moves to
 * an index, scrolls it into view, and focuses the row once it is there. The
 * keys are the ones a listbox answers:
 *
 * - Up and Down move one item.
 * - Home and End move to the first and the last.
 * - Page Up and Page Down move by `page`, the number of items on screen less
 *   one, so the item at one edge of the box lands at the other.
 *
 * `undefined` for a key the list does not take, and for an empty list.
 */
export const stepIndex = (
  key: string,
  at: number,
  count: number,
  page: number,
): number | undefined => {
  if (count <= 0) {
    return undefined
  }
  const last = count - 1
  const from = Math.max(0, Math.min(at, last))
  const jump = Math.max(1, page)
  switch (key) {
    case 'ArrowDown':
      return Math.min(last, from + 1)
    case 'ArrowUp':
      return Math.max(0, from - 1)
    case 'End':
      return last
    case 'Home':
      return 0
    case 'PageDown':
      return Math.min(last, from + jump)
    case 'PageUp':
      return Math.max(0, from - jump)
    default:
      return undefined
  }
}
