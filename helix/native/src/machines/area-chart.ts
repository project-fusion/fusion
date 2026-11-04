/**
 * An area chart on a phone: the parts of a total core stacks from its
 * readings, each band and its top edge, the rules and the numbers of the
 * scale, the names along the readings, and the guide and the bubble on the
 * reading a finger or a key rests on.
 *
 * **Core draws it, as it does for the web's element.** The readings are the
 * table a `for` names, which publishes its rows by its id, or `data`, each
 * column of numbers a part. `areaStack` adds them up at each reading, less a
 * part a legend hid on the same table, `areaDomain` gives the scale from
 * zero, and `areaBand` each band's edge and everything under it, drawn the
 * widest first.
 *
 * **The bands and the reading are two layers.** The canvas changes only with
 * the readings, so moving the reading draws the guide and the bubble again
 * and leaves the bands as they are.
 *
 * **The bubble reads the row with its total**, and each part's share under
 * `share`, as `areaTallied` writes it, and so do the words a screen reader is
 * told.
 */

import {
  type AreaAsked,
  type AreaStack,
  areaBand,
  areaDomain,
  areaStack,
  areaTallied,
  areaTipY,
  axisScales,
  type Curve,
  formatNumbers,
  latestShares,
  percentIn,
  type Row,
  seriesIndex,
} from '@fusion.dev/helix-core/chart'
import { useMemo } from 'react'
import type { MachineUse } from '../ir.generated'
import type { Behavior, Props } from '../render/behavior'
import { showsSeries, useChartSource, useHiddenSeries } from '../render/chart-sources'
import type { Family } from '../style/form'
import { useTheme } from '../theme/theme'
import {
  axisBehavior,
  axisOf,
  cellsOf,
  columnName,
  gridlinesAsked,
  gridlinesOf,
  labelsOf,
  listIn,
  nameSize,
  percent,
  plottedOf,
  statusOf,
  useAxisReading,
  useWidth,
} from './axis-chart'
import { type Color, paletteOf, sourceOf } from './chart-common'
import { kebab, wordsIn } from './date-picker-read'
import { langOf } from './picker-field-kind'
import { boundTo, given } from './props'

type Read = (name: string) => unknown

/** The curve a band's edge takes, as `curve` names it, or the resting `straight`. */
const curveOf = (curve: unknown): Curve =>
  curve === 'step' || curve === 'smooth' ? curve : 'straight'

/** What the chart draws from: the table's rows, the parts they make, and whether a part is drawn. */
interface Drawn {
  readonly asked: AreaAsked
  readonly count: number
  readonly rows: readonly Row[]
  readonly shows: (name: string) => boolean
  readonly stack: AreaStack
}

/** The readings the table gives as parts of a total, less the parts a legend hid. */
const drawnOf = (
  source: ReturnType<typeof useChartSource>,
  hidden: ReadonlySet<string>,
  asked: AreaAsked,
): Drawn => {
  const rows = source?.rows ?? []
  const columns = plottedOf(rows)
  const shows = (name: string) => showsSeries(hidden, name)
  const names = columns.map((column) => columnName(rows, column))
  const stack = areaStack(rows, columns, names, shows, asked)
  return { asked, count: columns.length === 0 ? 0 : rows.length, rows, shows, stack }
}

/** What the canvas, the axis, and the names are drawn from, as the props ask. */
interface Plotted {
  readonly axised: boolean
  readonly curve: Curve
  readonly gridlines: string
  readonly lang: string
  readonly size: number
  readonly width: number
}

/** Each band as the vector draws it, the widest first, in its part's palette color. */
const layersOf = (
  drawn: Drawn,
  scales: ReturnType<typeof axisScales>,
  curve: Curve,
  colorOf: Color,
) =>
  drawn.stack.layers
    .map((layer, depth) => ({ band: areaBand(layer, scales, curve), depth }))
    .reverse()
    .flatMap(({ band, depth }) =>
      band === undefined
        ? []
        : [
            {
              color: colorOf(depth),
              key: String(depth),
              line: band.line,
              series: String(seriesIndex(depth)),
              wash: band.wash,
            },
          ],
    )

/** Everything the canvas and the names draw, which a move of the reading leaves as it is. */
const plotOf = (drawn: Drawn, plotted: Plotted, colorOf: Color) => {
  const domain = areaDomain(drawn.stack, drawn.asked)
  const scales = axisScales(domain, Math.max(drawn.count, 1))
  const named = labelsOf(drawn.rows, plotted.width, plotted.size, drawn.count)
  const percents = percentIn(plotted.lang)
  const write = drawn.asked.share
    ? (value: number) => percents.format(value)
    : formatNumbers(plotted.lang)
  return {
    axis: plotted.axised ? axisOf(domain, scales, write) : undefined,
    /* The floor is the baseline's, and a rule on it is the same rule twice. */
    gridlines: gridlinesOf(plotted.gridlines, domain, scales, named.at, domain[0]),
    labels: named.labels,
    layers: layersOf(drawn, scales, plotted.curve, colorOf),
    scales,
    size: plotted.size,
  }
}

/** The plot, worked out again only when what it draws changes. */
const usePlot = (read: Read, drawn: Drawn, width: number, colorOf: Color, lang: string) => {
  const gridlines = gridlinesAsked(read('gridlines'))
  const axised = read('value-axis') === true
  const size = nameSize(useTheme())
  const curve = curveOf(read('curve'))
  return useMemo(
    () => plotOf(drawn, { axised, curve, gridlines, lang, size, width }, colorOf),
    [axised, colorOf, curve, drawn, gridlines, lang, size, width],
  )
}

/** The reading's guide and bubble, or none, by the names the form binds. */
const readingOf = (drawn: Drawn, plot: ReturnType<typeof plotOf>, at: number) => {
  if (at < 0 || drawn.count === 0) {
    return {
      guideX: '',
      markX: '',
      markY: '',
      placement: 'top',
      reading: false,
      tipLabel: '',
      tipped: false,
    }
  }
  const slot = 100 / drawn.count
  return {
    guideX: percent(plot.scales.x(at)),
    markX: percent(at * slot + slot / 2),
    markY: areaTipY(drawn.stack, at, plot.scales.y),
    placement: 'top',
    reading: true,
    tipLabel: drawn.rows[at]?.label ?? '',
    tipped: true,
  }
}

/** The summary: the latest reading's total and each part's share, in `summary-label`, after the chart's name. */
const summaryOf = (read: Read, named: string, drawn: Drawn, lang: string): string => {
  if (drawn.count === 0) {
    return ''
  }
  const last = drawn.rows.length - 1
  const shares = latestShares(drawn.stack, drawn.shows, percentIn(lang))
  const said = wordsIn(read('summary-label'))
    .replaceAll('{reading}', () => drawn.rows[last]?.label ?? '')
    .replaceAll('{totalLabel}', () => wordsIn(read('total-label')))
    .replaceAll('{total}', () => formatNumbers(lang)(drawn.stack.totals[last] ?? 0))
    .replaceAll('{shares}', () => listIn(lang)(shares))
  return `${named ? `${named}, ` : ''}${said}`
}

/** The rows a chart reads as parts of a total, held while the table, `data`, and the stacking are the same. */
const useDrawn = (read: Read, lang: string) => {
  const id = wordsIn(read('for'))
  const table = useChartSource(id)
  const data = read('data')
  const source = useMemo(() => sourceOf(table, data, lang), [table, data, lang])
  const hidden = useHiddenSeries(id)
  const overlap = read('overlap') === true
  const share = read('share') === true
  const drawn = useMemo(
    () => drawnOf(source, hidden, { overlap, share }),
    [source, hidden, overlap, share],
  )
  return { caption: source?.caption ?? '', drawn }
}

/** Hosts an area chart: its bands from its readings, and its reading. */
export const useAreaChart = (family: Family, props: Props, use: MachineUse): Behavior => {
  const read: Read = (name) => given(family, props, kebab(name))
  const lang = langOf(read)
  const { caption, drawn } = useDrawn(read, lang)
  const theme = useTheme()
  const colorOf = useMemo(() => paletteOf(theme), [theme])
  const { onLayout, width } = useWidth()
  const plot = usePlot(read, drawn, width, colorOf, lang)
  const write = formatNumbers(lang)
  const totalLabel = wordsIn(read('total-label'))
  const tallied = useMemo(
    () =>
      areaTallied(
        drawn.rows,
        drawn.stack,
        drawn.asked.share,
        totalLabel,
        formatNumbers(lang),
        percentIn(lang),
      ),
    [drawn, lang, totalLabel],
  )
  const reading = useAxisReading(family, props, use, read, {
    columns: drawn.stack.columns,
    count: drawn.count,
    rows: tallied,
    shows: drawn.shows,
    write,
  })
  const { cursor } = reading
  const name = wordsIn(read('aria-label')) || wordsIn(read('label')) || caption
  const summary = summaryOf(read, name, drawn, lang)
  const any = drawn.count > 0
  const states = {
    ...readingOf(drawn, plot, cursor.at),
    ...statusOf(read, any, name),
    axised: any && plot.axis !== undefined,
    axisWidth: `${plot.axis?.widest ?? 3}ch`,
    live: cursor.keyed && cursor.at >= 0 ? reading.said(cursor.at, cursor.series) : '',
    summary,
  }
  const lists = {
    cells: cellsOf(tallied, drawn.stack.columns, cursor.at, reading.among[cursor.series], colorOf),
    gridlines: plot.gridlines,
    labels: plot.labels,
    layers: plot.layers,
    ticks: plot.axis?.ticks ?? [],
  }
  return axisBehavior({
    flag: (one) => boundTo(use, one, 'state') ?? kebab(one),
    lists,
    measured: {
      'area-chart-axis-size': ((plot.axis?.widest ?? 3) + 1) * 0.6 * plot.size,
      'chart-mark-x': states.markX,
      'chart-mark-y': states.markY,
    },
    name,
    onLayout,
    reading,
    states,
    summary,
  })
}
