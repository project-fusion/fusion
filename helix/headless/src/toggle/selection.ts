/**
 * The values of a group where several items can be pressed, written as one
 * comma-separated `value`.
 */
export const pressedValues = (value: string): string[] =>
  value
    .split(',')
    .map((one) => one.trim())
    .filter(Boolean)

/**
 * The pressed values after `value` is pressed or released, in the order the
 * items are written, so the set reads the same whichever was pressed first.
 */
export const toggledValues = (pressed: string[], value: string, order: string[]): string[] => {
  const next = new Set(pressed)
  if (next.has(value)) {
    next.delete(value)
  } else {
    next.add(value)
  }
  return order.filter((one) => next.has(one))
}
