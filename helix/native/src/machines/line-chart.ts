/**
 * A line chart on a phone: each series core draws from its readings, its
 * marks and its end, the rules and the numbers of the scale, the names along
 * the readings, and the band, the guide, and the bubble on the reading a
 * finger or a key rests on.
 *
 * **Core draws it, as it does for the web's element.** The readings are the
 * table a `for` names, which publishes its rows by its id, or `data`, each
 * column of numbers a series, less those a legend hid on the same table.
 * `lineDomain` and `axisScales` give the scales, `seriesRuns` each series'
 * line as one path through its unbroken runs, `lineMarks` its marks as one
 * path of strokes of no length, and `lineEnds` where it ended.
 *
 * **The lines and the reading are two layers.** The canvas changes only with
 * the readings, so moving the reading draws the band, the guide, and the
 * bubble again, each a view beside the canvas, and leaves the lines as they
 * are.
 *
 * **A finger finds a reading by the slot it is in**, so a drag along the plot
 * scrubs it, and the keys walk the readings and, with Down and Up, the series
 * of a reading, as `useAxisReading` says. The reading in words is the row,
 * or the one cell the keys rest on, and where it stands among the readings.
 */

import {
  type AxisScales,
  axisScales,
  baselineAt,
  type Curve,
  formatNumbers,
  latestReadings,
  latestWords,
  lineDomain,
  lineEnds,
  lineMarks,
  lineTipAt,
  lineWash,
  type Row,
  type Series,
  seriesIndex,
  seriesKey,
  seriesOfRows,
  seriesRuns,
  shownSlots,
  slotOf,
  unbroken,
  writtenList,
} from '@fusion.dev/helix-core/chart'
import { useMemo } from 'react'
import { PixelRatio, useWindowDimensions } from 'react-native'
import type { MachineUse } from '../ir.generated'
import type { Behavior, Props } from '../render/behavior'
import { showsSeries, useChartSource, useHiddenSeries } from '../render/chart-sources'
import type { Family } from '../style/form'
import { useTheme } from '../theme/theme'
import {
  axisBehavior,
  axisOf,
  cellsOf,
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

/** The curve a line takes, as `curve` names it, or the resting `smooth`. */
const curveOf = (curve: unknown): Curve =>
  curve === 'step' || curve === 'straight' ? curve : 'smooth'

/** What the chart draws from: the table's rows, its series, and the columns each series was read from. */
interface Drawn {
  readonly columns: readonly number[]
  readonly count: number
  readonly rows: readonly Row[]
  readonly series: readonly Series[]
  readonly shows: (name: string) => boolean
}

/** The readings the table gives, less the series a legend hid. */
const drawnOf = (source: ReturnType<typeof useChartSource>, hidden: ReadonlySet<string>): Drawn => {
  const rows = source?.rows ?? []
  const series = seriesOfRows(rows, source?.caption)
  return {
    columns: plottedOf(rows),
    count: series.length === 0 ? 0 : rows.length,
    rows,
    series,
    shows: (name) => showsSeries(hidden, name),
  }
}

/** What the props ask the lines to be. */
interface Asked {
  readonly area: boolean
  readonly curve: Curve
  readonly dashed: string
  readonly markers: boolean
  readonly zero: boolean
}

/** Each series as the vector draws it: its line, its wash, and its marks, in its palette color. */
const layersOf = (
  drawn: Drawn,
  scales: AxisScales,
  asked: Asked,
  columns: number,
  colorOf: Color,
) => {
  const dashed = writtenList(asked.dashed).map(seriesKey)
  const layers: Record<string, boolean | string>[] = []
  const marks: Record<string, string>[] = []
  drawn.series.forEach((one, depth) => {
    if (!drawn.shows(one.name)) {
      return
    }
    const pieces = unbroken(one)
    const runs = seriesRuns(pieces, scales, asked.curve, columns)
    const color = colorOf(depth)
    const series = String(seriesIndex(depth))
    if (runs.length > 0) {
      layers.push({
        color,
        dashed: dashed.includes(seriesKey(one.name)),
        key: String(depth),
        line: runs.map((run) => run.path).join(''),
        series,
        wash: asked.area ? lineWash(runs) : '',
      })
    }
    const { lone, marks: dots } = lineMarks(pieces, scales, asked.markers)
    if (lone !== '' || dots !== '') {
      marks.push({ color, key: String(depth), lone, marks: dots, ring: dots + lone, series })
    }
  })
  return { layers, marks }
}

/** The chart's name and each series' latest reading, as the web's summary says them. */
const summaryOf = (named: string, drawn: Drawn, lang: string): string => {
  const latest = latestReadings(
    drawn.series,
    drawn.shows,
    (depth, at) => drawn.rows[at]?.cells[drawn.columns[depth] ?? -1]?.text,
  )
  return latest.length === 0
    ? ''
    : `${named ? `${named}, ` : ''}${latestWords(latest, listIn(lang))}.`
}

/** What the canvas, the axis, and the names are drawn from, as the props ask. */
interface Plotted {
  readonly asked: Asked
  readonly axised: boolean
  readonly columns: number
  readonly gridlines: string
  readonly lang: string
  readonly size: number
  readonly width: number
}

/** Everything the canvas and the names draw, which a move of the reading leaves as it is. */
const plotOf = (drawn: Drawn, plotted: Plotted, colorOf: Color) => {
  const domain = lineDomain(drawn.series, drawn.shows, plotted.asked.zero)
  const scales = axisScales(domain, Math.max(drawn.count, 1))
  const named = labelsOf(drawn.rows, plotted.width, plotted.size, drawn.count)
  const floor = baselineAt(domain, scales.y)
  return {
    ...layersOf(drawn, scales, plotted.asked, plotted.columns, colorOf),
    axis: plotted.axised ? axisOf(domain, scales, formatNumbers(plotted.lang)) : undefined,
    baseline: floor === undefined ? '' : `M0,${floor}L100,${floor}`,
    gridlines: gridlinesOf(plotted.gridlines, domain, scales, named.at),
    labels: named.labels,
    scales,
    size: plotted.size,
  }
}

/** The plot, worked out again only when what it draws changes. */
const usePlot = (read: Read, drawn: Drawn, width: number, colorOf: Color, lang: string) => {
  const window = useWindowDimensions()
  /* The device's pixels across the plot, past which a line keeps only the points they show. */
  const columns = Math.round((width || window.width) * PixelRatio.get())
  const gridlines = gridlinesAsked(read('gridlines'))
  const axised = read('value-axis') === true
  const size = nameSize(useTheme())
  const area = read('area') === true
  const curve = curveOf(read('curve'))
  const dashed = wordsIn(read('dashed'))
  const markers = read('markers') === true
  const zero = read('zero') === true
  return useMemo(
    () =>
      plotOf(
        drawn,
        {
          asked: { area, curve, dashed, markers, zero },
          axised,
          columns,
          gridlines,
          lang,
          size,
          width,
        },
        colorOf,
      ),
    [
      area,
      axised,
      colorOf,
      columns,
      curve,
      dashed,
      drawn,
      gridlines,
      lang,
      markers,
      size,
      width,
      zero,
    ],
  )
}

/** The reading's band, guide, and bubble, or none, by the names the form binds. */
const readingOf = (drawn: Drawn, plot: ReturnType<typeof plotOf>, at: number) => {
  if (at < 0 || drawn.count === 0) {
    return {
      bandWidth: '',
      bandX: '',
      guideX: '',
      markX: '',
      markY: '',
      placement: 'top',
      reading: false,
      tipLabel: '',
      tipped: false,
    }
  }
  const slot = slotOf(at, drawn.count)
  const slots = shownSlots(drawn.series, drawn.shows, drawn.count)
  const tip = lineTipAt(slots, at, drawn.count, plot.scales.y)
  return {
    bandWidth: percent(slot.width),
    bandX: percent(slot.x),
    guideX: percent(plot.scales.x(at)),
    markX: tip.x,
    markY: tip.y,
    placement: 'top',
    reading: true,
    tipLabel: drawn.rows[at]?.label ?? '',
    tipped: true,
  }
}

/** Where each series ended, unless `terminus` is `none`, in its palette color. */
const endsOf = (read: Read, drawn: Drawn, plot: ReturnType<typeof plotOf>, colorOf: Color) =>
  wordsIn(read('terminus')) === 'none'
    ? []
    : lineEnds(drawn.series, drawn.shows, plot.scales).map((end) => ({
        color: colorOf(end.index - 1),
        key: String(end.index),
        x: percent(end.x),
        y: percent(end.y),
      }))

/** The rows a chart reads, held while the table and `data` are the same. */
const useDrawn = (read: Read, lang: string) => {
  const id = wordsIn(read('for'))
  const table = useChartSource(id)
  const data = read('data')
  const source = useMemo(() => sourceOf(table, data, lang), [table, data, lang])
  const hidden = useHiddenSeries(id)
  const drawn = useMemo(() => drawnOf(source, hidden), [source, hidden])
  return { caption: source?.caption ?? '', drawn }
}

/** Hosts a line chart: its lines from its readings, and its reading. */
export const useLineChart = (family: Family, props: Props, use: MachineUse): Behavior => {
  const read: Read = (name) => given(family, props, kebab(name))
  const lang = langOf(read)
  const { caption, drawn } = useDrawn(read, lang)
  const theme = useTheme()
  const colorOf = useMemo(() => paletteOf(theme), [theme])
  const { onLayout, width } = useWidth()
  const plot = usePlot(read, drawn, width, colorOf, lang)
  const any = drawn.count > 0
  const reading = useAxisReading(family, props, use, read, {
    columns: drawn.columns,
    count: drawn.count,
    rows: drawn.rows,
    shows: drawn.shows,
    write: formatNumbers(lang),
  })
  const { cursor } = reading
  const name = wordsIn(read('aria-label')) || wordsIn(read('label')) || caption
  const summary = summaryOf(name, drawn, lang)
  const states = {
    ...readingOf(drawn, plot, cursor.at),
    ...statusOf(read, any, name),
    axised: any && plot.axis !== undefined,
    axisWidth: `${plot.axis?.widest ?? 3}ch`,
    based: plot.baseline !== '',
    baseline: plot.baseline,
    live: cursor.keyed && cursor.at >= 0 ? reading.said(cursor.at, cursor.series) : '',
    summary,
  }
  const lists = {
    cells: cellsOf(drawn.rows, drawn.columns, cursor.at, reading.among[cursor.series], colorOf),
    ends: endsOf(read, drawn, plot, colorOf),
    gridlines: plot.gridlines,
    labels: plot.labels,
    layers: plot.layers,
    marks: plot.marks,
    ticks: plot.axis?.ticks ?? [],
  }
  return axisBehavior({
    flag: (one) => boundTo(use, one, 'state') ?? kebab(one),
    lists,
    measured: {
      'chart-mark-x': states.markX,
      'chart-mark-y': states.markY,
      /* The axis' width: a figure is about six tenths of its type, and one more for a sign. */
      'line-chart-axis-size': ((plot.axis?.widest ?? 3) + 1) * 0.6 * plot.size,
    },
    name,
    onLayout,
    reading,
    states,
    summary,
  })
}
