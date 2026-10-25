/** A move through a set of items: to its first or last item, or one along. */
export type RoveMove = 'first' | 'last' | 'next' | 'previous'

/** The end a move lands on: the first item for `first` and `next`, the last otherwise. */
const end = (move: RoveMove, count: number): number =>
  move === 'first' || move === 'next' ? 0 : count - 1

/**
 * Where a press in a set of `count` items moves focus to, from the item at
 * `at`, or `undefined` where it moves nothing.
 *
 * **Written by hand on the web, and specified by the roving-focus machine.**
 * Compiling the machine into the element cost core's floor more than its bar
 * allows, so this function is what the web runs, and the machine's spec holds
 * it to the machine over every state and move.
 *
 * **`-1` means two different things, and only one of them is a starting
 * point.** Starting from the selection, it is "nothing is chosen and no item
 * has focus": a forward step lands on the first item and a backward step on
 * the last, both of which are where a reader entering an unanswered set
 * expects to arrive. Starting from focus, `fromFocus`, it is "the press did not
 * come from the set", and there is nothing to move. The listener is on the
 * host, not on the items, and a host can hold more than the set: a tab panel
 * is `tabindex="0"`, so an arrow pressed while reading a panel used to move the
 * tabs out from under the reader.
 *
 * **From nothing, backwards is the last, which the wrapping arithmetic does not
 * give.** `(-1 - 1 + count) % count` is `count - 2`: the *second* to last, so a
 * reader arrowing backwards into an unanswered set would land one short of the
 * end. And the clamp is `Math.max` against the forward step's `Math.min`.
 * Unclamped, a backward step from the first item is `-1`, and nothing would be
 * focused or chosen on a press already swallowed.
 */
export const rove = (
  at: number,
  count: number,
  move: RoveMove,
  wrap: boolean,
  fromFocus: boolean,
): number | undefined => {
  if (at < 0) {
    return fromFocus ? undefined : end(move, count)
  }
  if (move === 'next') {
    return wrap ? (at + 1) % count : Math.min(at + 1, count - 1)
  }
  if (move === 'previous') {
    return wrap ? (at - 1 + count) % count : Math.max(at - 1, 0)
  }
  return end(move, count)
}
