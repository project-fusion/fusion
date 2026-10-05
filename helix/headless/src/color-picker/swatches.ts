/**
 * Where a key moves focus in a row of presets, or `null` for a key that moves
 * nothing.
 *
 * The presets are a listbox, React Aria's ColorSwatchPicker: one tab stop, and
 * the arrows move between the colors without choosing one. `along` is the
 * horizontal arrow's direction along the line of text, from `inlineStep`, so
 * the row reverses with it; Up and Down go to the previous and the next as a
 * list does, since the row wraps. Home and End go to the ends. Focus stops at
 * the ends; a row of colors does not wrap around.
 */
export const swatchMove = (
  key: string,
  along: -1 | 0 | 1,
  at: number,
  count: number,
): number | null => {
  if (count === 0) {
    return null
  }
  const last = count - 1
  let next: number
  if (along !== 0) {
    next = at + along
  } else if (key === 'ArrowUp') {
    next = at - 1
  } else if (key === 'ArrowDown') {
    next = at + 1
  } else if (key === 'Home') {
    next = 0
  } else if (key === 'End') {
    next = last
  } else {
    return null
  }
  return Math.min(last, Math.max(0, next))
}
