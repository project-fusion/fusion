/**
 * What every chart on a phone reads the same way: the rows it draws, from the
 * table its `for` names or from `data`, and the palette color of a series.
 */

import { isChartData, rowsFromData, seriesIndex } from '@fusion.dev/helix-core/chart'
import type { useChartSource } from '../render/chart-sources'
import type { Theme } from '../theme/theme'
import { wordsIn } from './date-picker-read'

/** The palette color of the series at a place, as the tree sets it in `--chart-series`. */
export type Color = (place: number) => string

/**
 * The palette color of the series at a place: the theme's series color, the
 * first sixteen trading places with their other tone in dark, as the web's
 * `--chart-series-*` hooks do. **A phone reads the color here**, since a
 * custom property a tree sets reads no `var()` of its own.
 */
export const paletteOf =
  (theme: Theme): Color =>
  (place) => {
    const slot = seriesIndex(place)
    const dark = theme.mode === 'dark'
    const toned = !dark || slot > 16 ? slot : slot <= 8 ? slot + 8 : slot - 8
    return String(theme.tokens[`color-series-${toned}`] ?? 'transparent')
  }

/** The rows a chart reads: the table its `for` names first, as the web's chart reads one, and then `data`. */
export const sourceOf = (
  table: ReturnType<typeof useChartSource>,
  data: unknown,
  lang: string,
): ReturnType<typeof useChartSource> =>
  table ??
  (isChartData(data) ? { caption: data.caption ?? '', rows: rowsFromData(data, lang) } : undefined)

/** Each name of a record as the form binds it. */
export const boundAll = <T>(
  flag: (name: string) => string,
  record: Readonly<Record<string, T>>,
): Record<string, T> =>
  Object.fromEntries(Object.entries(record).map(([name, value]) => [flag(name), value]))

/** Which words stand in place of the drawing: `error-text` first, then the loading words, then the empty ones. */
export const shownStatus = (read: (name: string) => unknown, any: boolean) => {
  const error = !any && wordsIn(read('error-text')) !== ''
  const loading = !any && !error && read('loading') === true
  return { empty: !any && !error && !loading, error, loading }
}
