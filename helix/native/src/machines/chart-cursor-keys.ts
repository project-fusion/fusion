/**
 * Where a chart's keys move its reading on a phone: stepped by place among
 * the readings drawn, through core's `stepReading`, as the web's chart steps.
 */

import { stepReading } from '@fusion.dev/helix-core/chart'
import { direction } from '../render/styles'
import type { CursorSetup } from './chart-cursor'

/** How far Page Up and Page Down move: four columns of a grid, or a tenth of the readings, at least one. */
const pageOf = (count: number, grid: number): number =>
  grid > 1 ? grid * 4 : Math.max(1, Math.round(count / 10))

/** The places of the readings drawn, which the keys walk. */
export const shownOf = (setup: CursorSetup): number[] =>
  (setup.order ?? Array.from({ length: setup.count }, (_, at) => at)).filter(
    (at) => setup.shows?.(at) !== false,
  )

/** Where the keys rest: a reading, and the series within it. */
interface Place {
  readonly at: number
  readonly series: number
}

/**
 * The reading and the series a key moves to from `from`, or `undefined` for
 * a key that moves nothing: stepped by place among the readings drawn, so a
 * hidden one is never landed on, as the web's chart steps. `series` is how
 * many series the cross pair of arrows walks.
 */
export const keyedTo = (
  key: string,
  from: Place,
  setup: CursorSetup,
  series = setup.series ?? 1,
): Place | undefined => {
  const shown = shownOf(setup)
  const count = shown.length
  /* A page the chart measures itself, such as a month of days, from a reading shown. */
  const paged =
    (key === 'PageDown' || key === 'PageUp') && from.at >= 0
      ? setup.pageFrom?.(from.at, key === 'PageDown')
      : undefined
  if (paged !== undefined && shown.includes(paged)) {
    return { at: paged, series: from.series }
  }
  const grid = Math.max(1, setup.grid ?? 1)
  const next = stepReading(
    key,
    { at: shown.indexOf(from.at), series: from.series },
    {
      axis: setup.axis ?? 'inline',
      count,
      grid,
      page: pageOf(count, grid),
      rtl: setup.ltr !== true && direction() === 'rtl',
      series,
    },
  )
  return next === undefined ? undefined : { at: shown[next.at] ?? -1, series: next.series }
}
