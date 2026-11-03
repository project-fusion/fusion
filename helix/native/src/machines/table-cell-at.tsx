import { type ReactNode, useMemo } from 'react'
import { type Around, AroundContext, useAround } from '../render/around'

/** What a cell stands in where no element is around the table. */
const NOTHING: Around = { children: {}, values: {}, within: { flex: true, row: false, tracks: [] } }

/**
 * A cell at its place among the row's cells. **Each cell stands in a box of its
 * own on a phone**, so it would read the place of the element around the table,
 * and every cell of a table that is the last thing on a page would take the rule
 * for the row's last, which drops the inset that separates a column from the next.
 */
export const CellAt = ({
  at,
  children,
  count,
}: {
  readonly at: number
  readonly children: ReactNode
  readonly count: number
}): ReactNode => {
  const outer = useAround()
  const value = useMemo(
    () => ({
      ...(outer ?? NOTHING),
      place: { first: at === 0, fromEnd: count - at, index: at + 1, last: at === count - 1 },
    }),
    [at, count, outer],
  )
  return <AroundContext.Provider value={value}>{children}</AroundContext.Provider>
}
