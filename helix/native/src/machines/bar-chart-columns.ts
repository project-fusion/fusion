/**
 * A bar chart's columns as a phone draws them: each column's outline from
 * core, its far end rounded in the plot's measured points and its edge open
 * at its base, the paths of a chart too dense for a column each, the category
 * the reading rests on drawn again, the gradient each series and tone is
 * washed with, and the series drawn as lines.
 */

import {
  BAR_SHOWN_THICKNESS,
  type BarAsked,
  type BarColumn,
  type BarDraw,
  type BarFrame,
  type BarLayout,
  barBox,
  barColumns,
  barColumnsAt,
  barDense,
  barFrame,
  barLayout,
  barLinePath,
  barNames,
  barOutline,
  barPaths,
  barToned,
  type ColumnBox,
  type Row,
  type Series,
  type StackEnd,
  seriesIndex,
  seriesKey,
} from '@fusion.dev/helix-core/chart'
import { PixelRatio } from 'react-native'
import type { Plotted } from './bar-chart-parts'
import type { Color } from './chart-common'

/** A column's far corner, in points, as the web's `--bar-chart-bar-radius` rests at. */
const RADIUS = 2

/** Half the edge `outlined` and `subtle` draw, in points: the web's `border-thick` over two. */
const HALF_EDGE = 1

/** What the chart's columns are drawn from: its rows' series, how many readings, and whether a series is drawn. */
export interface Drawn {
  readonly columns: readonly number[]
  readonly count: number
  readonly rows: readonly Row[]
  readonly series: readonly Series[]
  readonly shows: (name: string) => boolean
}

/** The treatments the props ask of the series, by name, and of the chart. */
export interface Treatments {
  readonly emphasis: string
  readonly glass: string
  readonly outlined: string
  readonly subtle: string
}

/**
 * The treatments the series at a tone asked for, by its palette slot, as the
 * web's element writes them, and whether its column draws an edge: where its
 * series, or the chart where its series names none, is `outlined` or `subtle`.
 */
export const treatmentsOf = (asked: Treatments, series: readonly Series[]) => {
  const slots = (list: string): Set<number> =>
    new Set(
      [...barNames(list)].flatMap((name) => {
        const at = series.findIndex((one) => seriesKey(one.name) === name)
        return at < 0 ? [] : [seriesIndex(at)]
      }),
    )
  const outlined = slots(asked.outlined)
  const subtle = slots(asked.subtle)
  const glass = slots(asked.glass)
  return (tone: number) => {
    const slot = seriesIndex(tone)
    const emphasis = outlined.has(slot) ? 'outlined' : subtle.has(slot) ? 'subtle' : ''
    const by = emphasis || asked.emphasis
    return {
      edged: by === 'outlined' || by === 'subtle',
      emphasis,
      material: glass.has(slot) ? 'glass' : '',
    }
  }
}

/** What the canvases draw a column with. */
export interface Painter {
  readonly colorOf: Color
  readonly plotted: Plotted
  readonly treated: ReturnType<typeof treatmentsOf>
}

/** What a column is, beside its box. */
interface Column {
  readonly end: StackEnd | undefined
  readonly ink: string | undefined
  readonly sinks: boolean
  readonly tone: number
}

/** A length in points as the drawing's units along a side of the plot. */
const units = (points: number, along: number): number => (along > 0 ? (points * 100) / along : 0)

/** One column as a phone draws it: its outline, its edge where it has one, its paint, and what it is. */
const columnOf = (painter: Painter, box: ColumnBox, column: Column, key: string) => {
  const { asked, box: plot } = painter.plotted
  const { d, edge } = barOutline(
    box,
    { end: column.end, stacked: asked.stacked },
    asked.sideways,
    { x: units(RADIUS, plot.width), y: units(RADIUS, plot.height) },
    { x: units(HALF_EDGE, plot.width), y: units(HALF_EDGE, plot.height) },
  )
  const treated = painter.treated(column.tone)
  const series = seriesIndex(column.tone)
  const wash = column.ink ? `helix-bar-wash-tone-${column.ink}` : `helix-bar-wash-${series}`
  return {
    color: painter.colorOf(column.tone),
    d,
    edge: treated.edged ? edge : '',
    emphasis: treated.emphasis,
    end: column.end !== undefined,
    endNegative: column.end === 'negative',
    key,
    material: treated.material,
    negative: column.sinks,
    series: String(series),
    tone: column.ink ?? '',
    wash: `url(#${wash})`,
  }
}

/** What a chart's columns are worked out from: its scales, its columns, and how a slot is shared. */
export interface Framed {
  readonly against: (one: Series) => (value: number) => number
  readonly columns: BarColumn[]
  readonly frame: BarFrame
  readonly layout: BarLayout
}

/** The scales, the columns, and the slot, as the web's element works them out. */
export const framedOf = (
  drawn: Drawn,
  asked: BarAsked,
  write: (value: number) => string,
): Framed => {
  const frame = barFrame(drawn.series, drawn.count, drawn.shows, asked, write)
  const against = (one: Series) =>
    frame.z !== undefined && asked.scaled.has(seriesKey(one.name)) ? frame.z : frame.y
  const columns = barColumns(drawn.series, drawn.count, drawn.shows, asked.lined)
  const layout = barLayout(columns.length, asked.stacked, drawn.count, frame.floor)
  return { against, columns, frame, layout }
}

/** The drawing's units in a point along the categories, or 0 before the plot is laid out. */
const unitsAlong = (plotted: Plotted): number =>
  units(1, plotted.asked.sideways ? plotted.box.height : plotted.box.width)

/** Each column of one category, as `make` draws it from its box and what it is. */
const each = <T>(
  framed: Framed,
  stacked: boolean,
  index: number,
  make: (box: ColumnBox, column: Column & { depth: number }) => T,
  room?: number,
): T[] => {
  const draw: BarDraw<T> = (value, depth, tone, scale, from, end, named) =>
    make(barBox(framed.layout, value, index, depth, scale, from, room), {
      depth,
      end,
      ink: barToned(named),
      sinks: value < (from ?? 0),
      tone,
    })
  return barColumnsAt(framed.columns, index, stacked, framed.against, draw)
}

/** Every column, a path for each, or past one column a pixel the paths of them all. */
export const columnsOf = (drawn: Drawn, framed: Framed, painter: Painter) => {
  const { asked } = painter.plotted
  const ratio = PixelRatio.get()
  const per = unitsAlong(painter.plotted)
  if (!barDense(framed.layout, per, ratio)) {
    return Array.from({ length: drawn.count }, (_, index) =>
      each(framed, asked.stacked, index, (box, column) =>
        columnOf(painter, box, column, `${index}-${column.depth}-${column.tone}`),
      ),
    ).flat()
  }
  const plot = {
    abreast: framed.layout.abreast,
    count: drawn.count,
    pixel: per / ratio,
    sideways: asked.sideways,
    slot: framed.layout.slot,
  }
  const none = { across: 0, along: 0, size: 0, thickness: 0 }
  return barPaths(plot, (index, add) => {
    each(framed, asked.stacked, index, (box, column) => add(box, column))
  }).map((path, at) => ({
    ...columnOf(painter, none, { ...path, end: undefined }, `path-${at}`),
    d: path.d,
    edge: '',
  }))
}

/** The category the reading rests on drawn again, each column at least two pixels thick. */
export const shownOf = (drawn: Drawn, framed: Framed, painter: Painter, at: number) => {
  const room = Math.max(
    framed.layout.slot,
    (BAR_SHOWN_THICKNESS * unitsAlong(painter.plotted)) / framed.layout.share,
  )
  return at < 0 || at >= drawn.count
    ? []
    : each(
        framed,
        painter.plotted.asked.stacked,
        at,
        (box, column) => columnOf(painter, box, column, `shown-${column.depth}-${column.tone}`),
        room,
      )
}

/** The `data-tone` names the cells give, each a gradient of its own. */
const tonesOf = (series: readonly Series[]): string[] => [
  ...new Set(series.flatMap((one) => one.points.flatMap((point) => barToned(point.tone) ?? []))),
]

/** The gradient each series and each tone is washed with, in its color, along the measure. */
export const washesOf = (drawn: Drawn, painter: Painter, toneColor: (ink: string) => string) => {
  const sideways = painter.plotted.asked.sideways
  const along = { x2: sideways ? '1' : '0', y2: sideways ? '0' : '1' }
  return [
    ...drawn.series.map((_, index) => ({
      ...along,
      color: painter.colorOf(index),
      id: `helix-bar-wash-${seriesIndex(index)}`,
      key: `series-${index}`,
    })),
    ...tonesOf(drawn.series).map((ink) => ({
      ...along,
      color: toneColor(ink),
      id: `helix-bar-wash-tone-${ink}`,
      key: `tone-${ink}`,
    })),
  ]
}

/** Each series `lines` names, drawn as a line through the middle of each slot. */
export const linesOf = (drawn: Drawn, framed: Framed, plotted: Plotted, colorOf: Color) => {
  const { asked, box } = plotted
  const columns = Math.round((asked.sideways ? box.height : box.width) * PixelRatio.get())
  return drawn.series.flatMap((one, depth) =>
    asked.lined.has(seriesKey(one.name)) && drawn.shows(one.name)
      ? [
          {
            color: colorOf(depth),
            d: barLinePath(one, framed.layout.slot, framed.against(one), asked.sideways, columns),
            key: String(depth),
            series: String(seriesIndex(depth)),
          },
        ]
      : [],
  )
}
