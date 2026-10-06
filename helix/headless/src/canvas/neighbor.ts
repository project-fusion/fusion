/**
 * Where focus goes when a stop on a board leaves: the arithmetic, kept apart
 * from the board that moves focus there.
 *
 * Shared by the two ways a stop leaves, Delete and the page taking it away,
 * so a reader lands in the same place either way.
 */

/**
 * The first stop after `at` in `walk` that `kept` keeps, or, with none after
 * it, the nearest one before it. Undefined where none is kept.
 *
 * @param walk Every stop's key, in the order the arrow keys walk them.
 * @param at Where the stop that left was, as an index into `walk`, or `-1`
 *   for nowhere, which takes the first stop kept.
 * @param kept Whether a stop is still there.
 */
export const neighborOf = (
  walk: readonly string[],
  at: number,
  kept: (key: string) => boolean,
): string | undefined =>
  walk.slice(at + 1).find(kept) ?? walk.slice(0, Math.max(at, 0)).reverse().find(kept)
