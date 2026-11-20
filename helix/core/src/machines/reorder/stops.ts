import { EDGE_ZONE } from '../../utils/reorder/reorder.js'
import type { ReorderSpan } from './context.js'

/*
 * Where a reorder host's drag tells the pointer. The host is in `host.ts`,
 * and the two are one file split at the 400 lines a file may have.
 */

/** How many lines run through each edge zone, so the drag tells the pointer as it goes deeper. */
const LINES = 8

/**
 * The lines through each edge zone of a box from `start` to `end`, from the
 * zone's inner line to the edge, as `edgeSpeed` measures the zone.
 *
 * **The gesture capability tells the pointer only as it crosses a stop**, so
 * an edge scroll reads the speed from the last line the pointer crossed. The
 * lines are close enough that the speed steps up as the pointer goes deeper,
 * and the first is just inside the zone, where the speed rounds above nothing.
 */
export const edgeLines = (start: number, end: number): number[] => {
  const reach = Math.min(EDGE_ZONE, (end - start) / 2)
  if (reach <= 0) {
    return []
  }
  return Array.from({ length: LINES }, (_, at) => (reach * (at + 1)) / LINES).flatMap((depth) => [
    start + reach - depth,
    end - reach + depth,
  ])
}

/**
 * The stops a drag tells a pass at, in order along the axis: the other
 * items' middles, where the held item takes another place, and the lines
 * through the scroller's edge zones, where an edge scroll starts and speeds
 * up. An item a window did not draw has no middle.
 */
export const stopsOf = (
  others: readonly (ReorderSpan | undefined)[],
  scroller: { readonly end: number; readonly start: number } | null,
): number[] =>
  [
    ...others.flatMap((span) => (span === undefined ? [] : [(span.start + span.end) / 2])),
    ...(scroller === null ? [] : edgeLines(scroller.start, scroller.end)),
  ].sort((left, right) => left - right)
