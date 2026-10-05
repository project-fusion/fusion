/**
 * The order a playlist plays its entries in, and where a step from one lands.
 *
 * Separable because every answer is taken from a list of values and two
 * settings, before anything moves: nothing here reaches a player or an entry.
 * The playlist asks it which value comes next and applies the answer.
 */

/**
 * How a playlist goes on at its end. `one` plays the same entry again when it
 * ends, and `all` goes from the last entry back to the first.
 */
export type Repeat = 'all' | 'one'

/**
 * A shuffled copy of a list, with `first` leading where it is in the list.
 *
 * `first` leads because a reader turning shuffle on is watching something, and
 * a shuffle that could put that entry anywhere would bring it round again
 * before the rest have played.
 *
 * Fisher and Yates' shuffle, which gives every order of the rest the same
 * chance. `random` is the source of chance, `Math.random` unless a caller
 * passes one.
 */
export const shuffled = <T>(
  items: readonly T[],
  first?: T,
  random: () => number = Math.random,
): T[] => {
  const rest = items.filter((one) => one !== first)
  for (let at = rest.length - 1; at > 0; at -= 1) {
    const swap = Math.floor(random() * (at + 1))
    const held = rest[at] as T
    rest[at] = rest[swap] as T
    rest[swap] = held
  }
  return first !== undefined && items.includes(first) ? [first, ...rest] : rest
}

/** Whether two lists hold the same values, in any order. */
const sameValues = (one: readonly string[], other: readonly string[]): boolean =>
  one.length === other.length && one.every((value) => other.includes(value))

/**
 * The order to play in.
 *
 * As written without shuffle. With it, the shuffled order already `held` for
 * as long as it covers the same entries, so stepping back retraces what was
 * played; a new one, led by `current`, once an entry arrives or leaves.
 */
export const playOrder = (
  values: readonly string[],
  shuffle: boolean,
  held: readonly string[] | undefined,
  current: string | undefined,
  random: () => number = Math.random,
): string[] => {
  if (!shuffle) {
    return [...values]
  }
  if (held !== undefined && sameValues(held, values)) {
    return [...held]
  }
  return shuffled(values, current, random)
}

/**
 * Where a step of `by` from `current` lands in `order`, or `undefined` past an
 * end.
 *
 * `wrap` goes round instead of stopping, which is what `repeat="all"` asks
 * for. With no current entry, a step forward lands on the first one and a step
 * back on nothing, as a list that has not started has nothing behind it.
 */
export const stepTo = (
  order: readonly string[],
  current: string | undefined,
  by: number,
  wrap: boolean,
): string | undefined => {
  const at = current === undefined ? -1 : order.indexOf(current)
  if (at < 0) {
    return by > 0 ? order[0] : undefined
  }
  const to = at + by
  if (to >= 0 && to < order.length) {
    return order[to]
  }
  if (!wrap || order.length === 0) {
    return undefined
  }
  return order[((to % order.length) + order.length) % order.length]
}
