/**
 * Where a key moves focus in a feed of `count` rows, from the row at `at`, or
 * `undefined` for a key the feed does not take.
 *
 * `onRow` says whether focus is on the row's own box. The arrows and `Home` and
 * `End` move only from there, so a control inside a row keeps its keys.
 * `PageDown` and `PageUp` move from anywhere in a row, which is how the APG feed
 * pattern moves on from inside an article. The answer stays inside the feed.
 */
export const feedStep = (
  key: string,
  at: number,
  count: number,
  onRow: boolean,
): number | undefined => {
  if (count <= 0) {
    return undefined
  }
  const anywhere: Record<string, number> = { PageDown: at + 1, PageUp: at - 1 }
  const fromRow: Record<string, number> = {
    ArrowDown: at + 1,
    ArrowUp: at - 1,
    End: count - 1,
    Home: 0,
  }
  const to = anywhere[key] ?? (onRow ? fromRow[key] : undefined)
  return to === undefined ? undefined : Math.max(0, Math.min(to, count - 1))
}
