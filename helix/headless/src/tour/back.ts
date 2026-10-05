/**
 * The stop Back goes to from `index`: the nearest stop before it that is not a
 * `wait` stop, or `undefined` where there is none.
 *
 * A `wait` stop shows nothing and moves on by itself once its target is on the
 * page, so going back onto one either moves straight on again or leaves the
 * reader at a stop with nothing in it. Back passes over it to the stop that
 * told the reader what to do.
 */
export const stopBefore = (
  types: readonly (string | undefined)[],
  index: number,
): number | undefined => {
  for (let at = Math.min(index, types.length) - 1; at >= 0; at -= 1) {
    if (types[at] !== 'wait') {
      return at
    }
  }
  return undefined
}
