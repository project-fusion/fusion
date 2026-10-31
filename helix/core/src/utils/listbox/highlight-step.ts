/**
 * Where a key moves a highlight among the options a reader can reach, which a
 * list's web element and a phone's virtual focus both read.
 *
 * Down and Up go round from the last to the first, and with no highlight start
 * from the first and the last. Home and End go to the ends. Page Down and Page
 * Up move by `page` and stop at the ends. A key that moves nothing answers `at`.
 */
export const highlightStep = (key: string, at: number, count: number, page: number): number => {
  const last = count - 1
  switch (key) {
    case 'ArrowDown':
      return at < 0 ? 0 : (at + 1) % count
    case 'ArrowUp':
      return at < 0 ? last : (at - 1 + count) % count
    case 'Home':
      return 0
    case 'End':
      return last
    case 'PageDown':
      return at < 0 ? 0 : Math.min(at + page, last)
    case 'PageUp':
      return at < 0 ? last : Math.max(at - page, 0)
    default:
      return at
  }
}
