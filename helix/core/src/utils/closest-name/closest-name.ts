/**
 * The name in `names` closest to `wrong`, or `undefined` where none is close
 * enough to be the one meant.
 *
 * **Close is the fewest letters added, taken out, changed, or swapped with
 * the one beside them**, a swap counting once, so `chekc` finds `check`.
 * **Up to a third of the name's length**, the ceiling diagnostics' `nearest`
 * keeps, since a confident wrong suggestion costs more than none: `x` is a
 * typo for nothing. The first of two names at the same distance wins.
 */
export const closestName = (wrong: string, names: Iterable<string>): string | undefined => {
  let found: string | undefined
  let least = Math.floor(wrong.length / 3) + 1
  for (const name of names) {
    if (Math.abs(name.length - wrong.length) >= least) {
      continue
    }
    const distance = distanceOf(wrong, name)
    if (distance < least) {
      found = name
      least = distance
    }
  }
  return found
}

/** How many letters added, taken out, changed, or swapped with a neighbor turn `from` into `to`. */
const distanceOf = (from: string, to: string): number => {
  const rows: number[][] = [Array.from({ length: to.length + 1 }, (_, column) => column)]
  for (let row = 1; row <= from.length; row += 1) {
    const above = rows[row - 1] as number[]
    const current = [row]
    for (let column = 1; column <= to.length; column += 1) {
      const same = from[row - 1] === to[column - 1]
      let cell = Math.min(
        (above[column] as number) + 1,
        (current[column - 1] as number) + 1,
        (above[column - 1] as number) + (same ? 0 : 1),
      )
      if (
        row > 1 &&
        column > 1 &&
        from[row - 1] === to[column - 2] &&
        from[row - 2] === to[column - 1]
      ) {
        cell = Math.min(cell, ((rows[row - 2] as number[])[column - 2] as number) + 1)
      }
      current[column] = cell
    }
    rows.push(current)
  }
  return (rows[from.length] as number[])[to.length] as number
}
