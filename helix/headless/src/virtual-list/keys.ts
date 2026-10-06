/**
 * Which item a key moves to in a list of `count` items laid out `across`
 * items to a line, from `at`.
 *
 * Index arithmetic, because most of the items are not drawn: the list moves to
 * an index, scrolls it into view, and focuses the row once it is there. The
 * keys are the ones a listbox answers, and in a grid the ones a grid of
 * options answers:
 *
 * - Up and Down move one line, to the item in the same column. Down from the
 *   line above a shorter last line goes to the last item.
 * - Left and Right move one item, in a grid only, with `forward` naming the
 *   one that moves ahead along the line: Right, or Left on a right-to-left
 *   page. In a list they move nothing, and are left to the row.
 * - Home and End move to the first and the last item.
 * - Page Up and Page Down move by `page` lines, the number of lines on screen
 *   less one, so the line at one edge of the box lands at the other.
 *
 * `undefined` for a key the list does not take, and for an empty list.
 */
export const stepIndex = (
  key: string,
  at: number,
  count: number,
  page: number,
  { across = 1, forward = 'ArrowRight' }: { across?: number; forward?: string } = {},
): number | undefined => {
  if (count <= 0) {
    return undefined
  }
  const width = Math.max(1, Math.trunc(across))
  const last = count - 1
  const from = Math.max(0, Math.min(at, last))
  const line = Math.floor(from / width)
  /* The item `lines` lines away, in the same column, held to the set. */
  const along = (lines: number): number => {
    const to = Math.max(0, Math.min(line + lines, Math.floor(last / width)))
    return Math.min(last, to * width + (from % width))
  }
  switch (key) {
    case 'ArrowDown':
      return along(1)
    case 'ArrowUp':
      return along(-1)
    case 'ArrowLeft':
    case 'ArrowRight':
      if (width === 1) {
        return undefined
      }
      return Math.max(0, Math.min(last, from + (key === forward ? 1 : -1)))
    case 'End':
      return last
    case 'Home':
      return 0
    case 'PageDown':
      return along(Math.max(1, page))
    case 'PageUp':
      return along(-Math.max(1, page))
    default:
      return undefined
  }
}
