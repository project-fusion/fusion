/**
 * A 3D bar chart's table read as bars on a grid of names.
 *
 * Kept apart from the element because it is arithmetic a picture hides: a
 * value put under the wrong name stands as tall as a real one, and a bar
 * measured from anywhere but zero says one value is a multiple of another
 * when it is not.
 */

import {
  type Drawn,
  depthOrder,
  type PagePoint,
  type Projection,
  solid,
} from '../projection/projection.js'
import { ticks } from '../scale/ticks.js'
import { type BoxExtent, inBox } from './box.js'
import { type FieldRow, niceRange, type PlotAxis } from './field.js'

/** How tall the box stands, as a share of its longer side along the floor. */
const HEIGHT = 0.6

/** One place on the grid: a category across, a series in depth, and its value, where the table has one. */
export interface BarCell {
  /** Which category it stands under, counting from zero: the row's place among the rows read. */
  across: number
  /** The column of the row the value was read from, which names its series. */
  column: number
  /** Which series it stands in, counting from zero, which colors it. */
  depth: number
  /**
   * Where its block starts on the value axis: zero, or under `stacked` the
   * readings of the series before it in its category, on its side of zero.
   */
  from: number
  /** The row's own label, which names its category. */
  label: string
  /** Which row of the grid in depth it stands in: its series, or the one row of a stacked chart. */
  lane: number
  /** The row it was read from, counting from zero. */
  row: number
  /** The tone the cell names with `data-tone`, which colors its own bar, where it names one. */
  tone?: string | undefined
  /** The value, where the cell holds a number. */
  value?: number | undefined
}

/** The table as a 3D bar chart reads it. */
export interface BarField {
  /**
   * Across, the categories; up, the values; and in depth, the series. The
   * box is as long along the floor as the grid, so every place on it is
   * square, and one series is a long, low row of bars.
   */
  axes: { extent: BoxExtent; x: PlotAxis; y: PlotAxis; z: PlotAxis }
  /** Every category, in the table's order: each row's label. */
  categories: string[]
  /**
   * Every place on the grid, across first: the bar for category `across` in
   * series `depth` is at `across * series.length + depth`.
   */
  cells: BarCell[]
  /** How many rows of bars stand in depth: one a series, or one in all when stacked. */
  lanes: number
  /** How many cells hold a value. */
  readings: number
  /**
   * How far a `diagonal` row climbs on the page for each step across, where
   * it climbs less than Switchyard's 15 for every 72: a long row in a short
   * plot, whose climb would leave its bars no height.
   */
  climb?: number
  /** Every series, in the table's order: each numeric column's heading. */
  series: string[]
  /** Whether a category's series stand in one column, each on the ones before it. */
  stacked: boolean
}

/**
 * An axis of `count` places, one at each whole number, with the grid's lines
 * between them, and `labels` written at them, where there are any to write.
 * `nearest` runs it from the reader back, so the first place stands in front.
 */
const named = (count: number, labels: string[], nearest = false): PlotAxis => {
  const places = Math.max(count, 1)
  return {
    labels,
    name: '',
    range: nearest ? [places - 0.5, -0.5] : [-0.5, places - 0.5],
    rules: Array.from({ length: places + 1 }, (_, at) => at - 0.5),
    ticks: labels.map((_, at) => at),
  }
}

/**
 * Reads the table as a bar chart does: **each row is a category, named by
 * its label, and each numeric column a series**, named by its heading. The
 * bars stand on a grid of categories across and series in depth, so one
 * series is a single row of bars. A cell with no number leaves its place on
 * the grid empty.
 *
 * **The value axis runs from zero**, whatever the values, so a bar's height
 * is its value: one twice as tall is twice as much. It widens to round
 * numbers past the highest value, and below zero where a value is negative.
 *
 * **`stacked` stands a category's series in one column**, each block on the
 * ones before it, so the column is as tall as the category's total and the
 * axis runs to the tallest total. A negative reading hangs below zero on the
 * negatives before it, as a flat chart's stack does.
 *
 * `toneOf` gives the tone a cell names, by its row and its series.
 */
export const barsOf = (
  rows: readonly FieldRow[],
  columns: readonly number[],
  stacked = false,
  toneOf: (row: number, depth: number) => string | undefined = () => undefined,
): BarField => {
  const series = columns.map(
    (column) => rows.find((row) => row.cells[column])?.cells[column]?.name ?? '',
  )
  const cells: BarCell[] = []
  const values: number[] = []
  // The ends the bars reach: each value, or under `stacked` each stack's.
  const reached: number[] = []
  rows.forEach((row, at) => {
    let [above, below] = [0, 0]
    columns.forEach((column, depth) => {
      const value = row.cells[column]?.value
      const read = Number.isFinite(value) ? (value as number) : undefined
      // Where a block here would start: an empty cell starts where the
      // stack has reached, so the cells of a column read in order.
      let from = stacked ? above : 0
      if (read !== undefined) {
        values.push(read)
        if (stacked) {
          from = read < 0 ? below : above
          if (read < 0) {
            below += read
          } else {
            above += read
          }
        }
        reached.push(from + read)
      }
      const lane = stacked ? 0 : depth
      const tone = toneOf(at, depth)
      cells.push({
        across: at,
        column,
        depth,
        from,
        label: row.label,
        lane,
        row: at,
        ...(tone ? { tone } : {}),
        value: read,
      })
    })
  })
  const lanes = stacked ? 1 : series.length
  const [low, high] = [Math.min(0, ...reached), Math.max(0, ...reached)]
  const range: [number, number] = low === high ? [0, 1] : niceRange(low, high)
  const longest = Math.max(rows.length, lanes, 1)
  return {
    axes: {
      extent: [Math.max(rows.length, 1) / longest, HEIGHT, Math.max(lanes, 1) / longest],
      x: named(
        rows.length,
        rows.map((row) => row.label),
      ),
      /* One series is the measure the bars stand for, so it names the axis;
         several are named along the depth instead. */
      y: { name: series.length === 1 ? (series[0] ?? '') : '', range, ticks: ticks(range) },
      /* **The first series in front**, so a later one, often the larger in a
         table read left to right, stands behind it rather than hiding it. */
      z: named(lanes, lanes === 1 ? [] : series, true),
    },
    categories: rows.map((row) => row.label),
    cells,
    lanes,
    readings: values.length,
    series,
    stacked,
  }
}

/** How much of its place on the grid a bar covers along each edge, so neighbors stand apart. */
const FOOTPRINT = 0.6

/**
 * How the bars stand: on the box's grid, in a row level across the page, or
 * in a row that climbs to the right as it recedes.
 */
export type BarLayout = 'diagonal' | 'grid' | 'row'

/**
 * How far a `diagonal` row climbs on the page for each step across it: 15
 * for every 72, the climb of the row of days on Switchyard's page.
 */
const CLIMB = 15 / 72

/**
 * Where each cell's bar stands on the floor, and how far apart places are:
 * the grid's own axes, or in a row along the camera's level line and
 * straight back from it. A `diagonal` row steps back as it goes across, by
 * as much as makes it climb `CLIMB` on the page.
 */
export const placesOf = (
  field: BarField,
  projection: Projection,
  layout: BarLayout,
): { place: (cell: BarCell) => { x: number; y: number }; spacing: number } => {
  const [ex, , ez] = field.axes.extent
  const [cos, sin] = projection.across
  const lined = layout !== 'grid'
  const spread = lined ? Math.abs(cos) + Math.abs(sin) : 1
  const spacing =
    Math.min((2 * ex) / Math.max(field.categories.length, 1), (2 * ez) / Math.max(field.lanes, 1)) /
    spread
  /* A step straight back rises on the page by as much as the camera looks
     down, and a step along the level line moves across it by its length. */
  const origin = projection.at(0, 0, 0)
  const rise = origin.y - projection.at(-sin, cos, 0).y
  const across = projection.at(cos, sin, 0).x - origin.x
  const climb = layout === 'diagonal' && rise > 0 ? ((field.climb ?? CLIMB) * across) / rise : 0
  return {
    place: (cell) => {
      const along = inBox(field.axes.x, cell.across) * ex
      /* The floor's way back is the box's depth turned round, as the box's
         own places are. */
      const back = -inBox(field.axes.z, cell.lane) * ez + along * climb
      return lined
        ? { x: along * cos - back * sin, y: along * sin + back * cos }
        : { x: along, y: back }
    },
    spacing,
  }
}

/**
 * How many categories a row has room for across `width` pixels with each bar
 * `size` pixels wide: a bar covers `FOOTPRINT` of its place, so a place is
 * that much wider than its bar. At least one.
 */
export const rowFits = (width: number, size: number): number =>
  size > 0 ? Math.max(1, Math.floor((width * FOOTPRINT) / size)) : 1

/** How wide a bar is on the page, in the drawing's units. */
export const widthOf = (bar: DrawnBar): number => {
  const xs = bar.corners.map((corner) => corner.x)
  return Math.max(...xs) - Math.min(...xs)
}

/**
 * The field with its `diagonal` row climbing at most `rise` on the page over
 * `length` across, so a long row keeps the height its bars need.
 */
export const climbing = (field: BarField, rise: number, length: number): BarField => ({
  ...field,
  climb: length > 0 ? Math.min(CLIMB, rise / length) : CLIMB,
})

/**
 * How long a row stands tall at most, as a share of its length on the page:
 * a place a bar stands on and its gap, once for each category. One bar
 * stands about as tall as its place is wide and a quarter again, a block
 * about half a pane's plot, and a row of a few already reaches the height
 * the plot gives it.
 */
const ROW_TALL = 1.25

/**
 * The most times taller a row's value axis may stand than it is drawn in
 * `bars`, so the tallest bar is no taller than `ROW_TALL` times the row's
 * length: each of its places is a bar's width over `FOOTPRINT`, the width
 * `widthOf` gives on the page.
 */
export const tallestTimes = (
  field: BarField,
  projection: Projection,
  bars: readonly DrawnBar[],
): number => {
  const first = bars[0]
  const fall = Math.abs(projection.at(0, 0, 1).y - projection.at(0, 0, 0).y)
  const tallest = Math.max(0, ...bars.map((bar) => bar.height)) * fall
  if (!first || tallest <= 0) {
    return Number.POSITIVE_INFINITY
  }
  const length = (field.categories.length * widthOf(first)) / FOOTPRINT
  return (ROW_TALL * length) / tallest
}

/** The field with its value axis `times` as tall, which stands every bar that much taller. */
export const heightened = (field: BarField, times: number): BarField => {
  const [ex, ey, ez] = field.axes.extent
  return { ...field, axes: { ...field.axes, extent: [ex, ey * times, ez] } }
}

/** A bar as the chart's own drawing paints it. */
export interface DrawnBar {
  /** Where the block starts on the floor's way up, in the box's units. */
  base: number
  /** The block's eight corners on the page, which a drawing with no box is framed around. */
  corners: PagePoint[]
  drawn: Drawn
  height: number
  index: number
  x: number
  y: number
}

/**
 * Each bar with a value as a block, seen through `projection`: standing on
 * its place on the grid, from where it starts to its value, a little
 * narrower than its place so neighbors stand apart. A value below zero
 * hangs from where it starts.
 *
 * **`row` lays the categories in a straight line across the page**, along
 * the way the camera reads as level, and the series straight back from it,
 * so the row stays level whichever way the camera turns, and each block,
 * which keeps to the floor's grid, shows the turn: its top and two sides.
 * Turned, a block is wider on the page than its footprint, so the footprint
 * narrows by as much, and neighbors still stand apart. **`diagonal` lays the
 * same row climbing to the right**, each place a step further back than the
 * one before, at the same climb on the page from any turn.
 *
 * `grown` says how much of its height each bar has reached, from 0 to 1, as
 * the chart grows its bars in.
 */
export const barsDrawn = (
  field: BarField,
  projection: Projection,
  layout: BarLayout = 'grid',
  grown: (cell: BarCell) => number = () => 1,
): DrawnBar[] => {
  const ey = field.axes.extent[1]
  const { place, spacing } = placesOf(field, projection, layout)
  return field.cells.flatMap((cell, index): DrawnBar[] => {
    /* A zero in a stack adds nothing to its column, so it draws no block, as
       a flat chart's stack draws none; standing alone, a zero is a plate on
       the floor that says the reading is there. */
    if (cell.value === undefined || (field.stacked && cell.value === 0)) {
      return []
    }
    const { x, y } = place(cell)
    /* Growing, a stacked column rises as a whole, each block at its share
       of where it starts and ends. */
    const share = grown(cell)
    const start = inBox(field.axes.y, cell.from * share) * ey
    const top = inBox(field.axes.y, (cell.from + cell.value) * share) * ey
    const base = Math.min(start, top)
    const height = Math.abs(top - start)
    /* Lifted to the bar's foot, which is where it starts on the value axis
       rather than the floor of the box where values run below zero. */
    const lifted: Projection = {
      ...projection,
      at: (px, py, pz = 0) => projection.at(px, py, pz + base),
    }
    const width = spacing * FOOTPRINT
    const corners: PagePoint[] = []
    for (const cx of [x - width / 2, x + width / 2]) {
      for (const cy of [y - width / 2, y + width / 2]) {
        corners.push(lifted.at(cx, cy, 0), lifted.at(cx, cy, height))
      }
    }
    return [
      { base, corners, drawn: solid(lifted, 'block', x, y, width, height), height, index, x, y },
    ]
  })
}

/**
 * The bars in the order they are painted, back to front, and **a stacked
 * column from the floor up**: its blocks share a place on the floor, which
 * the order by depth cannot tell apart, and one painted under the block below
 * it would show the lower block's top through the upper one.
 */
export const paintOrder = (projection: Projection, bars: readonly DrawnBar[]): DrawnBar[] => {
  const columns = new Map<string, DrawnBar[]>()
  for (const bar of depthOrder(projection, bars)) {
    const place = `${bar.x},${bar.y}`
    columns.set(place, [...(columns.get(place) ?? []), bar])
  }
  return [...columns.values()].flatMap((column) => column.sort((one, two) => one.base - two.base))
}
