/**
 * A heading level a reader can be told: a whole number from 1 to 6, from
 * the level asked for, or `fallback` where none was.
 *
 * `aria-level` takes a whole number, so a fraction is cut to the level below
 * it, and a level past either end is held at it: `0` is 1 and `9` is 6.
 */
export const headingLevel = (level: number | undefined, fallback = 3): number => {
  const asked = level === undefined || Number.isNaN(level) ? fallback : level
  return Math.min(6, Math.max(1, Math.trunc(asked)))
}
