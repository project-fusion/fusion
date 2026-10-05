/*
 * Where an ordered list's numbers start and which way they run, as arithmetic
 * over `start`, `reversed` and how many rows there are. Pure and beside the
 * family's `index.ts`, so a spec can hold it without a page.
 */

/** The first row's number, and what each row after it adds. */
export interface Numbering {
  first: number
  step: -1 | 1
}

/**
 * The numbering `start` and `reversed` ask for, as `<ol>` reads them, or
 * nothing where they ask for the ordinary count from one.
 *
 * Reversed without a start counts down from the number of rows, which is
 * unknown until the rows are: `count` is `undefined` on a server and while
 * hydrating, and the list counts from one until it knows.
 */
export const numbering = (
  start: number | undefined,
  reversed: boolean,
  count: number | undefined,
): Numbering | undefined => {
  const from = start !== undefined && Number.isFinite(start) ? Math.trunc(start) : undefined
  if (!reversed) {
    return from === undefined ? undefined : { first: from, step: 1 }
  }
  const first = from ?? count
  return first === undefined ? undefined : { first, step: -1 }
}
