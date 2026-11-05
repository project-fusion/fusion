/**
 * A scatter chart on a phone: each series' points as core lays them out in
 * layers of paths, the rules, the lines of best fit, the numbers of both
 * scales and what each measures, and the point and the bubble on the row a
 * finger or a key rests on.
 *
 * **Core draws it, as it does for the web's element.** The readings are the
 * table a `for` names, which publishes its rows by its id, or `data`.
 * `measuresOf` splits the columns of numbers into the one across, the one
 * `size-by` names, and the series up, less those a legend hid on the same
 * table; `scatterField` places each row's points, `scatterLayers` lays a
 * series' points out in up to four layers of paths, a path a size, so points
 * that overlap keep their rings, in the plot's measured points, and
 * `scatterTrends` gives each line of best fit.
 *
 * **The points and the reading are two layers.** Each layer is a canvas that
 * changes only with the readings and the plot's size, so moving the reading
 * draws the point it rests on and the bubble again, each a view over the
 * canvases, and leaves the points as they are.
 *
 * **A finger finds the point nearest it**, within twice the web's reach, and
 * the keys walk the rows left to right across the plot, on a right-to-left
 * page too, and, with Down and Up, the series of a row.
 */

import {
  formatNumbers,
  leastSquares,
  measuresOf,
  type Row,
  type ScatterField,
  type ScatterPoint,
  scatterField,
  scatterLayers,
  scatterNearest,
  scatterOrder,
  scatterTicks,
  scatterTrends,
  seriesIndex,
} from '@fusion.dev/helix-core/chart'
import { useMemo, useRef, useState } from 'react'
import { type LayoutChangeEvent, PixelRatio } from 'react-native'
import type { TrackPoint } from '../drivers/track'
import type { MachineUse } from '../ir.generated'
import type { Behavior, Props } from '../render/behavior'
import { showsSeries, useChartSource, useHiddenSeries } from '../render/chart-sources'
import type { Family } from '../style/form'
import { type Theme, useTheme } from '../theme/theme'
import {
  axisBehavior,
  cellsOf,
  columnName,
  nameSize,
  percent,
  plottedOf,
  statusOf,
  useAxisReading,
  useBox,
  withPlotLayout,
} from './axis-chart'
import { type Color, paletteOf, sourceOf } from './chart-common'
import { kebab, wordsIn } from './date-picker-read'
import { langOf } from './picker-field-kind'
import { boundTo, given } from './props'

type Read = (name: string) => unknown

/** How near a finger has to be to a point to be asking about it, in points: twice the web's pointer reach, as the web's tap. */
const REACH = 48

/** The width below which every other level across is left out, as the web hides it, in rems. */
const NARROW = 30

/** What the chart draws from: the table's rows, the columns by what they measure, and the points. */
interface Drawn {
  readonly field: ScatterField
  readonly order: readonly number[]
  readonly rows: readonly Row[]
  readonly shows: (name: string) => boolean
  readonly ups: readonly number[]
}

/** The rows as points, less the series a legend hid, which keep their colors. */
const drawnOf = (rows: readonly Row[], hidden: ReadonlySet<string>, sizeBy: string): Drawn => {
  const name = (column: number | undefined): string =>
    column === undefined ? '' : columnName(rows, column)
  const shows = (named: string) => showsSeries(hidden, named)
  const { across, size, ups } = measuresOf(plottedOf(rows), name, sizeBy)
  const field = scatterField(
    rows,
    { across, size, ups },
    ups.map((column) => shows(name(column))),
    name,
  )
  return { field, order: scatterOrder(rows, across), rows, shows, ups }
}

/** A length of the theme in points, from a number or a `px` length. */
const pointsOf = (theme: Theme, token: string, fallback: number): number => {
  const value = Number.parseFloat(String(theme.tokens[token] ?? fallback))
  return Number.isFinite(value) ? value : fallback
}

/**
 * How wide a point's ring is drawn, in points: the point's diameter, from the
 * point size to the bubble size by its weight, and a border either side, as
 * the style's resting hooks size it.
 */
const ringOf =
  (theme: Theme) =>
  (point: ScatterPoint): number =>
    8 + (point.weight ?? 0) * (40 - 8) + 2 * pointsOf(theme, 'border-thin', 1)

/** Each layer of each series' points as the canvases draw them: its rings, then its dots, a path a size. */
const layersFor = (
  drawn: Drawn,
  box: { readonly height: number; readonly width: number },
  theme: Theme,
  colorOf: Color,
) => {
  const measured = box.width > 0 && box.height > 0
  const layers = scatterLayers(
    drawn.field,
    box,
    PixelRatio.get(),
    measured ? ringOf(theme) : undefined,
  )
  return layers.map(({ depth, paths }, layer) => {
    const color = colorOf(depth)
    const sized = paths.map(({ d, weight }, key) => ({
      d,
      key: String(key),
      weight: String(weight ?? 0),
    }))
    return {
      dots: sized.map((one) => ({ ...one, color })),
      key: String(layer),
      rings: sized,
      series: String(seriesIndex(depth)),
    }
  })
}

/** Which rules `gridlines` asks for: a bare one, or a word it does not know, rules both. */
const rulesOf = (given: unknown) => {
  const asked = given !== undefined && given !== null && given !== false
  return { across: asked && given !== 'y', up: asked && given !== 'x' }
}

/** Everything the canvases and the scales draw, which a move of the reading leaves as it is. */
const plotOf = (
  drawn: Drawn,
  asked: { readonly gridlines: unknown; readonly trend: boolean },
  write: (value: number) => string,
  colorOf: Color,
) => {
  const placed = scatterTicks(drawn.field)
  const rules = rulesOf(asked.gridlines)
  const gridlines = [
    ...(rules.across ? placed.x.map(({ place }) => `M${place},0L${place},100`) : []),
    ...(rules.up ? placed.y.map(({ place }) => `M0,${place}L100,${place}`) : []),
  ].map((d, key) => ({ d, key: String(key) }))
  const trends = asked.trend
    ? scatterTrends(drawn.field, drawn.shows, leastSquares).map(({ depth, x1, x2, y1, y2 }) => ({
        color: colorOf(depth),
        d: `M${x1},${y1}L${x2},${y2}`,
        key: String(depth),
        series: String(seriesIndex(depth)),
      }))
    : []
  const xTicks = placed.x.map(({ edge, level, place }, key) => ({
    at: percent(place),
    edge: edge ? 'end' : '',
    key: String(key),
    text: write(level),
  }))
  const yTicks = placed.y.map(({ level, place }, key) => ({
    at: percent(place),
    key: String(key),
    text: write(level),
  }))
  const widest = Math.max(1, ...yTicks.map((one) => one.text.length))
  return { gridlines, trends, widest, xTicks, yTicks }
}

/** Where the levels across stand, and what they say, as the plot and the type measure them. */
interface Across {
  /** The plane's width in points, which the web's container query reads. */
  readonly plane: number
  /** The plot's width in points, which the levels are spread along. */
  readonly plot: number
  readonly rem: number
  /** The size of the levels' type in points. */
  readonly size: number
}

/**
 * The levels across a chart shows: every other one, counted from the far
 * end, once the chart is narrow, as the web hides the rest, and fewer again
 * where a larger type would run one level into the next, as it does at a
 * phone's largest text sizes.
 */
const shownTicks = <T extends { readonly text: string }>(
  ticks: readonly T[],
  across: Across,
): readonly T[] => {
  const narrow = across.plane > 0 && across.plane < NARROW * across.rem
  const widest = Math.max(0, ...ticks.map((one) => one.text.length)) * 0.6 * across.size
  const apart = ticks.length > 1 ? across.plot / (ticks.length - 1) : across.plot
  let every = narrow ? 2 : 1
  while (across.plot > 0 && every < ticks.length && apart * every < widest + across.size) {
    every += 1
  }
  return ticks.filter((_, place) => (ticks.length - 1 - place) % every === 0)
}

/** The points drawn in the row at `at`, in the order of their series. */
const pointsIn = (drawn: Drawn, at: number): ScatterPoint[] =>
  at < 0 ? [] : drawn.field.points.filter((point) => point.row === at)

/**
 * The point the bubble sits on: the one a finger found, or, for a row
 * reached by key, the point of the series the keys rest on, or the row's
 * first.
 */
const pointShown = (
  drawn: Drawn,
  cursor: { readonly at: number; readonly keyed: boolean },
  column: number | undefined,
  nearest: ScatterPoint | undefined,
): ScatterPoint | undefined => {
  if (nearest?.row === cursor.at && !cursor.keyed) {
    return nearest
  }
  const depth = column === undefined ? -1 : drawn.ups.indexOf(column)
  const row = pointsIn(drawn, cursor.at)
  return row.find((one) => one.depth === depth) ?? row[0]
}

/** The reading's points and bubble, or none, by the names the form binds. */
const readingOf = (drawn: Drawn, at: number, point: ScatterPoint | undefined, colorOf: Color) => {
  const active = pointsIn(drawn, at).map((one) => ({
    color: colorOf(one.depth),
    key: `${one.row} ${one.depth}`,
    series: String(seriesIndex(one.depth)),
    weight: String(one.weight ?? 0),
    x: percent(one.x),
    y: percent(one.y),
  }))
  const tipped = at >= 0 && point !== undefined
  return {
    active,
    states: {
      markX: tipped ? percent(point.x) : '',
      markY: tipped ? percent(point.y) : '',
      placement: 'top',
      tipLabel: tipped ? (drawn.rows[at]?.label ?? '') : '',
      tipped,
    },
  }
}

/** The rows a chart reads, held while the table, `data`, the hidden series, and `size-by` are the same. */
const useDrawn = (read: Read, lang: string) => {
  const id = wordsIn(read('for'))
  const table = useChartSource(id)
  const data = read('data')
  const source = useMemo(() => sourceOf(table, data, lang), [table, data, lang])
  const hidden = useHiddenSeries(id)
  const sizeBy = wordsIn(read('size-by'))
  const drawn = useMemo(() => drawnOf(source?.rows ?? [], hidden, sizeBy), [source, hidden, sizeBy])
  return { caption: source?.caption ?? '', drawn }
}

/** The plane's width in points, measured as it is laid out, which says which levels across fit. */
const usePlaneWidth = () => {
  const [width, setWidth] = useState(0)
  const onLayout = (event: LayoutChangeEvent) => {
    const next = Math.round(event.nativeEvent.layout.width)
    setWidth((was) => (was === next ? was : next))
  }
  return { onLayout, width }
}

/** Hosts a scatter chart: its points from its readings, and its reading. */
export const useScatterChart = (family: Family, props: Props, use: MachineUse): Behavior => {
  const read: Read = (name) => given(family, props, kebab(name))
  const lang = langOf(read)
  const { caption, drawn } = useDrawn(read, lang)
  const theme = useTheme()
  const colorOf = useMemo(() => paletteOf(theme), [theme])
  const { box, onLayout } = useBox()
  const plane = usePlaneWidth()
  const write = formatNumbers(lang)
  const gridlines = read('gridlines')
  const trend = read('trend') === true
  const plot = useMemo(
    () => plotOf(drawn, { gridlines, trend }, formatNumbers(lang), colorOf),
    [colorOf, drawn, gridlines, lang, trend],
  )
  const layers = useMemo(() => layersFor(drawn, box, theme, colorOf), [box, colorOf, drawn, theme])
  const nearest = useRef<ScatterPoint | undefined>(undefined)
  const any = drawn.field.points.length > 0
  const reading = useAxisReading(family, props, use, read, {
    among: drawn.ups,
    axis: 'none',
    columns: drawn.ups,
    count: any ? drawn.rows.length : 0,
    ltr: true,
    order: drawn.order,
    pick: (point: TrackPoint) => {
      nearest.current = scatterNearest(
        drawn.field.points,
        box,
        { x: point.x * box.width, y: point.y * box.height },
        REACH,
      )
      return nearest.current?.row ?? -1
    },
    rows: drawn.rows,
    shows: drawn.shows,
    write,
  })
  const { cursor } = reading
  const column = reading.among[cursor.series]
  const shown = readingOf(
    drawn,
    cursor.at,
    cursor.at < 0 ? undefined : pointShown(drawn, cursor, column, nearest.current),
    colorOf,
  )
  const name = wordsIn(read('aria-label')) || wordsIn(read('label')) || caption
  const states = {
    ...shown.states,
    ...statusOf(read, any, name),
    live: cursor.keyed && cursor.at >= 0 ? reading.said(cursor.at, cursor.series) : '',
    summary: '',
    xName: drawn.field.xName,
    yName: drawn.field.yNames.join(', '),
  }
  const lists = {
    active: shown.active,
    cells: cellsOf(drawn.rows, drawn.ups, cursor.at, column, colorOf),
    gridlines: any ? plot.gridlines : [],
    layers: any ? layers : [],
    trends: any ? plot.trends : [],
    xTicks: shownTicks(plot.xTicks, {
      plane: plane.width,
      plot: box.width,
      rem: theme.rem,
      size: nameSize(theme),
    }),
    yTicks: plot.yTicks,
  }
  const size = nameSize(theme)
  const behavior = axisBehavior({
    flag: (one) => boundTo(use, one, 'state') ?? kebab(one),
    lists,
    measured: {
      'chart-mark-x': states.markX,
      'chart-mark-y': states.markY,
      /* The levels' width: a figure is about six tenths of its type, and one more for a sign. */
      'scatter-chart-axis-size': (plot.widest + 1) * 0.6 * size,
    },
    name,
    onLayout: () => undefined,
    reading,
    states,
    summary: '',
  })
  const measured = withPlotLayout(behavior, onLayout)
  return {
    ...measured,
    parts: { ...measured.parts, plane: { view: { onLayout: plane.onLayout } } },
  }
}
