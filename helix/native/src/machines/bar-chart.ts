/**
 * A bar chart on a phone: the columns core stands from its readings, or the
 * bars down the side under `orientation="horizontal"`, the lines among them,
 * the rules, the numbers of each scale, the names of the categories, and the
 * band and the bubble on the category a finger or a key rests on.
 *
 * **Core draws it, as it does for the web's element.** `barFrame` measures
 * every column from zero over the series drawn, `barBox` stands each
 * category's columns abreast or stacked, `barPaths` draws past one column a
 * pixel as a path for each series, tone, and side of zero, and `barOutline`
 * rounds a column's far end in the plot's measured points, where the web
 * clips a rect.
 *
 * **The columns and the reading are two layers.** The canvas of every column
 * changes only with the readings and the plot's size; while a reading is
 * shown it fades, and a canvas of the category shown is drawn over it, so a
 * move of the reading draws no other column again.
 */

import {
  type BarAsked,
  barBand,
  barHighest,
  barNames,
  barTip,
  formatNumbers,
  seriesOfRows,
} from '@fusion.dev/helix-core/chart'
import { useMemo } from 'react'
import type { MachineUse } from '../ir.generated'
import type { Behavior, Props } from '../render/behavior'
import { showsSeries, useChartSource, useHiddenSeries } from '../render/chart-sources'
import { direction } from '../render/styles'
import type { Family } from '../style/form'
import { type Theme, useTheme } from '../theme/theme'
import {
  axisAsked,
  axisBehavior,
  cellsOf,
  gridlinesAsked,
  nameSize,
  percent,
  plottedOf,
  roomAsked,
  statusOf,
  useAxisReading,
  useBox,
  withPlotLayout,
} from './axis-chart'
import {
  columnsOf,
  type Drawn,
  type Framed,
  framedOf,
  linesOf,
  type Painter,
  shownOf,
  type Treatments,
  treatmentsOf,
  washesOf,
} from './bar-chart-columns'
import { axesOf, gridlinesOf, labelsAlong, type Plotted } from './bar-chart-parts'
import { type Color, paletteOf, sourceOf } from './chart-common'
import { kebab, wordsIn } from './date-picker-read'
import { langOf } from './picker-field-kind'
import { boundTo, given } from './props'

type Read = (name: string) => unknown

/** The theme's token for each tone a cell can name with `data-tone`, as the web's hooks rest at. */
const TONES: Readonly<Record<string, string>> = {
  accent: 'color-accent',
  danger: 'color-danger',
  info: 'color-info',
  muted: 'color-foreground-subtle',
  primary: 'color-primary',
  success: 'color-success',
  warning: 'color-warning',
}

/** A tone's color in the theme, or the first series' where the tone has no hook, as the web's fallback. */
const toneOf =
  (theme: Theme, colorOf: Color) =>
  (ink: string): string => {
    const token = TONES[ink]
    return token === undefined ? colorOf(0) : String(theme.tokens[token] ?? colorOf(0))
  }

/** Everything the canvases, the scales, and the names draw, which a move of the reading leaves as it is. */
const plotOf = (drawn: Drawn, painter: Painter, toneColor: (ink: string) => string) => {
  const { plotted } = painter
  const write = formatNumbers(plotted.lang)
  const framed = framedOf(drawn, plotted.asked, write)
  const { floor } = framed.frame
  const named = labelsAlong(drawn.rows, plotted, drawn.count)
  return {
    axes: axesOf(framed.frame, drawn, plotted, painter.colorOf, write),
    baseline: plotted.asked.sideways ? `M${floor},0L${floor},100` : `M0,${floor}L100,${floor}`,
    columns: columnsOf(drawn, framed, painter),
    framed,
    gridlines: gridlinesOf(plotted, framed.frame, named.at, drawn.count),
    labels: named.labels,
    lines: linesOf(drawn, framed, plotted, painter.colorOf),
    washes: washesOf(drawn, painter, toneColor),
  }
}

/** The band, the bubble's place, and its heading for the reading at `at`, by the names the form binds. */
const readingOf = (drawn: Drawn, framed: Framed, asked: BarAsked, at: number) => {
  if (at < 0 || drawn.count === 0) {
    return {
      bandHeight: '',
      bandWidth: '',
      bandX: '',
      bandY: '',
      markX: '',
      markY: '',
      placement: 'top',
      reading: false,
      tipLabel: '',
      tipped: false,
    }
  }
  const band = barBand(at, drawn.count, asked.sideways)
  const reached = drawn.series
    .filter((one) => drawn.shows(one.name))
    .flatMap((one) => one.points.find((point) => point.at === at)?.value ?? [])
  const tip = barTip(
    reached,
    { mirrored: direction() === 'rtl', sideways: asked.sideways, stacked: asked.stacked },
    framed.frame.reach,
    at,
    drawn.count,
  )
  return {
    bandHeight: percent(band.height),
    bandWidth: percent(band.width),
    bandX: percent(band.x),
    bandY: percent(band.y),
    markX: tip.x,
    markY: tip.y,
    placement: tip.placement,
    reading: true,
    tipLabel: drawn.rows[at]?.label ?? '',
    tipped: true,
  }
}

/** The chart's name and each series' highest reading, as the web's summary says them. */
const summaryOf = (read: Read, named: string, drawn: Drawn): string => {
  const highest = drawn.series.flatMap((one, depth) => {
    const top = barHighest(one)
    if (top === undefined || !drawn.shows(one.name)) {
      return []
    }
    const text = drawn.rows[top.at]?.cells[drawn.columns[depth] ?? -1]?.text ?? String(top.value)
    return [`${one.name} ${top.label} ${text}`]
  })
  const said = wordsIn(read('summary-label'))
    .replaceAll('{highestLabel}', () => wordsIn(read('highest-label')))
    .replaceAll('{readings}', () => highest.join('; '))
  return drawn.count === 0 ? '' : `${named ? `${named}. ` : ''}${said}`
}

/** The rows a chart reads, held while the table, `data`, and the series a legend hid are the same. */
const useDrawn = (read: Read, lang: string) => {
  const id = wordsIn(read('for'))
  const table = useChartSource(id)
  const data = read('data')
  const source = useMemo(() => sourceOf(table, data, lang), [table, data, lang])
  const hidden = useHiddenSeries(id)
  const drawn = useMemo((): Drawn => {
    const rows = source?.rows ?? []
    const series = seriesOfRows(rows, source?.caption)
    return {
      columns: plottedOf(rows),
      count: series.length === 0 ? 0 : rows.length,
      rows,
      series,
      shows: (name) => showsSeries(hidden, name),
    }
  }, [source, hidden])
  return { caption: source?.caption ?? '', drawn }
}

/** What the props ask the columns to be, each as words or a flag, which a memo can compare. */
const wantedOf = (read: Read) => ({
  emphasis: wordsIn(read('emphasis')),
  glass: wordsIn(read('glass')),
  gridlines: read('gridlines'),
  lines: wordsIn(read('lines')),
  outlined: wordsIn(read('outlined')),
  secondary: wordsIn(read('secondary')),
  sideways: read('orientation') === 'horizontal',
  stacked: read('stacked') === true,
  subtle: wordsIn(read('subtle')),
  valueAxis: axisAsked(read('value-axis')),
})

/** The plot, worked out again only when what it draws changes. */
const usePlot = (read: Read, drawn: Drawn, box: Plotted['box'], lang: string) => {
  const theme = useTheme()
  const colorOf = useMemo(() => paletteOf(theme), [theme])
  const wanted = wantedOf(read)
  const { emphasis, glass, gridlines, lines, outlined, secondary, sideways, stacked, subtle } =
    wanted
  const { valueAxis } = wanted
  const size = nameSize(theme)
  return useMemo(() => {
    const asked: BarAsked = {
      lined: barNames(lines),
      room: roomAsked(valueAxis, gridlinesAsked(gridlines)),
      scaled: barNames(secondary),
      sideways,
      stacked,
      valueAxis,
    }
    const treatments: Treatments = { emphasis, glass, outlined, subtle }
    const plotted: Plotted = { asked, box, gridlines, lang, size }
    const painter: Painter = { colorOf, plotted, treated: treatmentsOf(treatments, drawn.series) }
    return { colorOf, painter, plot: plotOf(drawn, painter, toneOf(theme, colorOf)) }
  }, [
    box,
    colorOf,
    drawn,
    emphasis,
    glass,
    gridlines,
    lang,
    lines,
    outlined,
    secondary,
    sideways,
    size,
    stacked,
    subtle,
    theme,
    valueAxis,
  ])
}

/** Hosts a bar chart: its columns from its readings, and its reading. */
export const useBarChart = (family: Family, props: Props, use: MachineUse): Behavior => {
  const read: Read = (name) => given(family, props, kebab(name))
  const lang = langOf(read)
  const { caption, drawn } = useDrawn(read, lang)
  const { box, onLayout } = useBox()
  const { colorOf, painter, plot } = usePlot(read, drawn, box, lang)
  const { asked } = painter.plotted
  const reading = useAxisReading(family, props, use, read, {
    axis: asked.sideways ? 'block' : 'inline',
    columns: drawn.columns,
    count: drawn.count,
    rows: drawn.rows,
    shows: drawn.shows,
    write: formatNumbers(lang),
  })
  const { cursor } = reading
  const name = wordsIn(read('aria-label')) || wordsIn(read('label')) || caption
  const summary = summaryOf(read, name, drawn)
  const any = drawn.count > 0
  const states = {
    ...readingOf(drawn, plot.framed, asked, cursor.at),
    ...statusOf(read, any, name),
    active: cursor.at >= 0,
    baseline: plot.baseline,
    live: cursor.keyed && cursor.at >= 0 ? reading.said(cursor.at, cursor.series) : '',
    summary,
  }
  const shown = shownOf(drawn, plot.framed, painter, cursor.at)
  const every = {
    columns: plot.columns,
    faded: shown.length > 0,
    key: 'every',
    washes: plot.washes,
  }
  const again = { columns: shown, faded: false, key: 'shown', washes: plot.washes }
  const lists = {
    axes: any ? plot.axes.list : [],
    bars: any ? (shown.length > 0 ? [every, again] : [every]) : [],
    cells: cellsOf(drawn.rows, drawn.columns, cursor.at, reading.among[cursor.series], colorOf),
    gridlines: plot.gridlines,
    labels: plot.labels,
    lines: plot.lines,
  }
  const behavior = axisBehavior({
    flag: (one) => boundTo(use, one, 'state') ?? kebab(one),
    lists,
    measured: {
      ...plot.axes.measured,
      'bar-chart-plot-size': box.height,
      'chart-mark-x': states.markX,
      'chart-mark-y': states.markY,
    },
    name,
    onLayout: () => undefined,
    reading,
    states,
    summary,
  })
  return withPlotLayout(behavior, onLayout)
}
