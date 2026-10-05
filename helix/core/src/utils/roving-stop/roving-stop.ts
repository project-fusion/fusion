/** How `rovingStop` reads an item. */
export interface RovingOptions<T> {
  /** Whether an item cannot take the stop. Defaults to none. */
  disabled?: (item: T) => boolean
  /** Whether an item is chosen, which takes the stop before the first. Defaults to none. */
  selected?: (item: T) => boolean
}

/**
 * The item that holds a group's one tab stop: the one the reader was last on,
 * then the first chosen one, then the first that can be reached.
 *
 * A composite widget is one Tab stop whose items the arrow keys move between,
 * and Tab coming back lands where the reader left. A disabled item never holds
 * it, so a group whose first item is disabled can still be entered from the
 * keyboard. `last` is ignored once it has left `items`.
 *
 * Tag Group, a Toggle Group that presses several, and a Notifications feed
 * choose their stop this way.
 */
export const rovingStop = <T>(
  items: readonly T[],
  last: T | undefined,
  { disabled = () => false, selected = () => false }: RovingOptions<T> = {},
): T | undefined =>
  (last !== undefined && items.includes(last) && !disabled(last) ? last : undefined) ??
  items.find((item) => selected(item) && !disabled(item)) ??
  items.find((item) => !disabled(item))
