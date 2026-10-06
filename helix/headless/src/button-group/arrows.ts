/*
 * Where a key moves focus among a group's toggle buttons, as a pure function
 * of the key, the step it takes along the line and where focus is.
 *
 * Beside the family's `index.ts`, because the arithmetic of a ring is a rule
 * and not the group's template.
 */

/**
 * The index a key moves focus to, or `-1` for a key that moves nothing.
 *
 * Down and Up step forward and back, and Left and Right step by `step`, which
 * core's `inlineStep` turns on a right-to-left page. Home and End go to the
 * ends. A step wraps from the last button round to the first, as a toolbar's
 * does.
 *
 * @param key The key pressed.
 * @param step `1` or `-1` for Left and Right, from `inlineStep`, and `0` otherwise.
 * @param from The index focus is on, or `-1` where it is on none of them.
 * @param count How many buttons focus can move between.
 */
export const arrowTarget = (key: string, step: number, from: number, count: number): number => {
  const by = key === 'ArrowDown' ? 1 : key === 'ArrowUp' ? -1 : step
  if (from < 0 || count === 0) {
    return -1
  }
  if (key === 'Home' || key === 'End') {
    return key === 'Home' ? 0 : count - 1
  }
  return by === 0 ? -1 : (from + by + count) % count
}
