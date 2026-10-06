/**
 * What one pass of a virtual list draws, worked out before any element moves.
 *
 * The list keeps the element of a row that stays in the window, so a pass
 * compares what is drawn with what is wanted and changes only the difference.
 * These are that comparison and the tab-stop rule that follows it, as
 * arithmetic over item indices.
 */

/** What a pass does to the rows in the tree. */
export interface DrawPlan {
  /** The items the pass draws, in order: the window, and a kept item outside it. */
  wanted: number[]
  /** The items whose rows leave the tree. */
  remove: Set<number>
}

/** The window, the set's length, the item kept outside the window, and the rows drawn. */
export interface DrawInput {
  /** The first item of the window. */
  first: number
  /** One past the last item of the window. */
  last: number
  /** How many items the set holds. */
  count: number
  /** The item drawn outside the window to keep or take focus, where there is one. */
  kept?: number | undefined
  /** The item each drawn row element holds, `NaN` for an element that holds none. */
  drawn: readonly number[]
  /** Whether every drawn row is drawn again from nothing, as for a new way of drawing. */
  redraw?: boolean
  /**
   * How many items a line holds, in a grid. The kept item brings its whole
   * line, so the columns of the lines around it stay where they are.
   */
  across?: number
}

/**
 * Which items a pass draws, and which drawn rows leave.
 *
 * A drawn row leaves when its item is not wanted, when it holds no item, or
 * when everything is drawn again. A wanted item with no row left is drawn new.
 */
export const drawPlan = ({
  across = 1,
  count,
  drawn,
  first,
  kept,
  last,
  redraw = false,
}: DrawInput): DrawPlan => {
  const wanted: number[] = []
  for (let at = first; at < Math.min(last, count); at += 1) {
    wanted.push(at)
  }
  if (kept !== undefined && !wanted.includes(kept)) {
    const width = Math.max(1, across)
    const start = kept - (kept % width)
    for (let at = start; at < Math.min(start + width, count); at += 1) {
      wanted.push(at)
    }
    wanted.sort((a, b) => a - b)
  }
  const keep = new Set(wanted)
  const remove = new Set(
    drawn.filter((index) => redraw || !Number.isInteger(index) || !keep.has(index)),
  )
  return { remove, wanted }
}

/**
 * Which item holds the list's tab stop after a pass.
 *
 * The item that held it, while its row is drawn. Otherwise the first item on
 * screen, held inside the window and the set.
 */
export const stopAfter = (
  active: number,
  wanted: readonly number[],
  {
    count,
    first,
    last,
    onScreen,
  }: { count: number; first: number; last: number; onScreen: number },
): number =>
  wanted.includes(active)
    ? active
    : Math.max(Math.min(onScreen, Math.min(last, count) - 1), first, 0)

/**
 * The items a span of lines holds, `across` items to a line: what a window of
 * lines draws, or which items a reader sees.
 */
export const itemsOf = (
  lines: { first: number; last: number },
  across: number,
  count: number,
): { first: number; last: number } => {
  const width = Math.max(1, across)
  return {
    first: Math.min(lines.first * width, count),
    last: Math.min(lines.last * width, count),
  }
}
