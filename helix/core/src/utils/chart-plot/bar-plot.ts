/**
 * What a Bar Chart draws of its readings, as arithmetic with no element in
 * it: the web's element and a phone's both draw what this returns.
 *
 * **Every column is measured from zero**, on the scale of the series drawn,
 * or on a second scale where `secondary` names a series. Each column is a
 * box in the drawing's own units, across the categories and along the
 * measure, which the drawing turns onto its axes: down for columns, and
 * across for bars under `orientation="horizontal"`.
 *
 * What it draws past one column a pixel, its lines, its band, the bubble's
 * place, and a phone's column outline are `bar-marks.ts`.
 */

import { byRow, type Series, type SeriesPoint, seriesKey } from '../read-series/read-series.js'
import { extent, linear, type Scale } from '../scale/scale.js'
import { headroom, ticks } from '../scale/ticks.js'
import { writtenList } from '../written-list/written-list.js'
import { type StackEnd, stackedReadings, stackFarEnds, stackSpans } from './bar-stack.js'
import { PLOT_HEIGHT } from './plot-box.js'

/**
 * A cell's `data-tone`, where it is a name a custom property can carry, or
 * `undefined`. The name is written into a `style` attribute, so anything but
 * letters, digits, and hyphens is refused rather than read as more CSS.
 */
export const barToned = (tone: string | undefined): string | undefined =>
  tone && /^[a-z][a-z0-9-]*$/.test(tone) ? tone : undefined

/**
 * How thick a column drawn again for the reading shown is at least, in CSS
 * pixels, where the columns are thinner than that, so a reader sees which one
 * the tooltip describes.
 */
export const BAR_SHOWN_THICKNESS = 2

/** The names a list of series gives, lowercased and trimmed for matching, as `lines` and `secondary` take them. */
export const barNames = (list: string | undefined): Set<string> =>
  new Set(writtenList(list).map(seriesKey))

/** What a bar chart is asked to draw, which sizes its scales. */
export interface BarAsked {
  /** The series drawn as lines, by `barNames`. */
  readonly lined: ReadonlySet<string>
  /**
   * Whether a scale is measured off the chart, by its numbers or its rules:
   * each scale then takes room above its highest reading, for the reason
   * `lineDomain` gives. A second scale is always measured.
   */
  readonly room?: boolean
  /** The series on the second scale, by `barNames`. */
  readonly scaled: ReadonlySet<string>
  /** Whether the categories run down the side. */
  readonly sideways: boolean
  /** Whether a category's columns stack into one. */
  readonly stacked: boolean
  /** Whether the numbers of the primary scale are drawn. */
  readonly valueAxis: boolean
}

/** What every render of one set of readings shares: the scales, and what is drawn from them. */
export interface BarFrame {
  /** The domain of the primary scale, zero at both ends. */
  domain: [number, number]
  /** Where zero is on the primary scale. */
  floor: number
  /** The domain of the second scale, where `secondary` names a series. */
  other: [number, number]
  /** The scale the tooltip measures a category's far end on, over every series shown. */
  reach: Scale
  /** The widest number on either axis, in characters. */
  widest: number
  y: Scale
  z: Scale | undefined
}

/**
 * The scales every series is drawn against, over `count` categories: zero at
 * both ends of each, so a series that goes negative gets a baseline inside
 * the box. **Over the series drawn**, so hiding one from a legend fits the
 * scale to the rest, and stacked, over the stacks. The primary is taken over
 * the series that did not ask for a scale of their own, and either side with
 * none falls back to the whole set, so `secondary` naming a column that is
 * not there leaves a chart rather than a blank.
 *
 * **The range is inverted for columns and not for bars**: SVG counts down
 * from the top, so a column growing upward needs `[PLOT_HEIGHT, 0]`, and a bar
 * growing rightward is already going the way x counts.
 */
export const barFrame = (
  series: readonly Series[],
  count: number,
  shows: (name: string) => boolean,
  asked: BarAsked,
  format: (value: number) => string,
): BarFrame => {
  const { lined, scaled } = asked
  const own = (one: Series): boolean => scaled.has(seriesKey(one.name))
  const shown = series.filter((one) => shows(one.name))
  const values = shown.flatMap((one) => one.points.map((point) => point.value))
  const readingsOf = (group: Series[]): number[] =>
    asked.stacked
      ? stackedReadings(group, count, (one) => lined.has(seriesKey(one.name)))
      : group.flatMap((one) => one.points.map((point) => point.value))
  const on = (which: (one: Series) => boolean): number[] => {
    const found = readingsOf(shown.filter(which))
    return found.length > 0 ? found : values.length > 0 ? values : [0]
  }
  const [low, high] = extent(scaled.size === 0 ? on(() => true) : on((one) => !own(one)))
  /* Room above the highest reading wherever a scale is drawn, and on the
     second scale too, so its top is a numbered level as well. Columns with no
     axis and no rules keep the whole height. */
  const measured = asked.room === true || scaled.size > 0
  const room = (span: [number, number]): [number, number] => (measured ? headroom(span) : span)
  const domain = room([Math.min(0, low), Math.max(0, high)])
  const range: [number, number] = asked.sideways ? [0, PLOT_HEIGHT] : [PLOT_HEIGHT, 0]
  const y = linear(domain, range)
  const floor = y(0)

  const [second, top] = extent(scaled.size > 0 ? on(own) : [0])
  const other = room([Math.min(0, second), Math.max(0, top)])
  const z = scaled.size > 0 ? linear(other, range) : undefined

  /* The widest number on either scale, in characters, so the axis column is
     the size of its own contents: its ticks are placed absolutely and give it
     no width of their own. */
  const levels = [...ticks(domain), ...(z === undefined ? [] : ticks(other))]
  const widest =
    z === undefined && !asked.valueAxis
      ? 0
      : Math.max(1, ...levels.map((level) => format(level).length))

  /* The tooltip stands off the far end of a category's columns, measured
     over every series shown, on whichever scale each is drawn. */
  let reach = y
  if (scaled.size > 0) {
    const [near, far] = extent(readingsOf(shown).concat(0))
    reach = linear([Math.min(0, near), Math.max(0, far)], range)
  }
  return { domain, floor, other, reach, widest, y, z }
}

/** One series drawn as columns: its place in the slot and its place in the palette. */
export interface BarColumn {
  one: Series
  slots: (SeriesPoint | undefined)[]
  tone: number
}

/**
 * The series drawn as columns, each laid out one slot per category, kept
 * with the index it has among all the series, its tone, so it keeps the
 * color the legend gives it. A series drawn as a line, or one a legend hid,
 * takes no room in the slot.
 */
export const barColumns = (
  series: readonly Series[],
  count: number,
  shows: (name: string) => boolean,
  lined: ReadonlySet<string>,
  slotsOf: (one: Series, count: number) => (SeriesPoint | undefined)[] = byRow,
): BarColumn[] =>
  series
    .map((one, index) => ({ one, slots: slotsOf(one, count), tone: index }))
    .filter(({ one }) => !lined.has(seriesKey(one.name)) && shows(one.name))

/** Where a column stands, in the drawing's own units. */
export interface ColumnBox {
  /** Where it starts across the categories. */
  across: number
  /** Where it starts along the measure. */
  along: number
  /** How long it is along the measure. */
  size: number
  /** How thick it is across the categories. */
  thickness: number
}

/** How a category's room is shared: how many columns stand abreast, the slot, and where zero is. */
export interface BarLayout {
  /** How many columns stand side by side in a category: one under `stacked`. */
  readonly abreast: number
  /** Where zero is along the measure. */
  readonly floor: number
  /** The share of a category's room one column is thick. */
  readonly share: number
  /** How much of the axis a category has. */
  readonly slot: number
}

/** How a category's room is shared by `columns` series over `count` categories. */
export const barLayout = (
  columns: number,
  stacked: boolean,
  count: number,
  floor: number,
): BarLayout => {
  const abreast = stacked ? 1 : columns
  return {
    abreast,
    floor,
    share: (0.72 / Math.max(abreast, 1)) * (abreast > 1 ? 0.92 : 1),
    slot: 100 / count,
  }
}

/**
 * One column's box: the reading `value` of the category at `index`, the
 * series at `depth` in the slot, on `scale`, from `from` where it stands on
 * a stack. `room` is the share of the axis the category's columns stand in,
 * its slot, and wider for a category drawn again for the reading shown,
 * centered on the slot.
 *
 * **The stride is what the columns share and the thickness is what they
 * draw**, with a gap between two, centered in the stride so the group sits
 * where it did. `0.36` is half of the `0.72` of the room the group takes,
 * and it is what centers the group in its slot.
 */
export const barBox = (
  layout: BarLayout,
  value: number,
  index: number,
  depth: number,
  scale: Scale,
  from?: number,
  room = layout.slot,
): ColumnBox => {
  const { abreast, floor, slot } = layout
  const stride = (room * 0.72) / Math.max(abreast, 1)
  const gap = abreast > 1 ? stride * 0.08 : 0
  const at = scale(value)
  const base = from === undefined ? floor : scale(from)
  return {
    across: (index + 0.5) * slot - room * 0.36 + depth * stride + gap / 2,
    along: Math.min(base, at),
    size: Math.abs(base - at),
    thickness: stride - gap,
  }
}

/** A column's place and size on the drawing's axes: down for columns, and across for bars. */
export const barRect = (
  box: ColumnBox,
  sideways: boolean,
): { height: number; width: number; x: number; y: number } =>
  sideways
    ? { height: box.thickness, width: box.size, x: box.along, y: box.across }
    : { height: box.size, width: box.thickness, x: box.across, y: box.along }

/** What a column is drawn from, as `barColumnsAt` hands it to `draw`. */
export type BarDraw<T> = (
  value: number,
  depth: number,
  tone: number,
  scale: Scale,
  from: number | undefined,
  end: StackEnd | undefined,
  named: string | undefined,
) => T

/**
 * One category's columns stacked into one, each on the ones before it on
 * its own scale, through `stackSpans`, each as `draw` makes it. Only the
 * outermost segment in each direction is a far end.
 */
const stackAt = <T>(
  columns: readonly BarColumn[],
  index: number,
  against: (one: Series) => Scale,
  draw: BarDraw<T>,
): T[] => {
  const scales = [...new Set(columns.map(({ one }) => against(one)))]
  return scales.flatMap((scale) => {
    const mine = columns.filter(({ one }) => against(one) === scale)
    const values = mine.map(({ slots }) => slots[index]?.value)
    const spans = stackSpans(values)
    const ends = stackFarEnds(values)
    return mine.flatMap(({ slots, tone }, place) => {
      const span = spans[place]
      return span === undefined
        ? []
        : [draw(span[1], 0, tone, scale, span[0], ends[place], slots[index]?.tone)]
    })
  })
}

/**
 * A category's columns, side by side or stacked, as `draw` makes each. A
 * blank cell is no column at all, and a column alone is a stack of one, so
 * it is its own far end, above zero or below it.
 */
export const barColumnsAt = <T>(
  columns: readonly BarColumn[],
  index: number,
  stacked: boolean,
  against: (one: Series) => Scale,
  draw: BarDraw<T>,
): T[] =>
  stacked
    ? stackAt(columns, index, against, draw)
    : columns.flatMap(({ slots, one, tone }, depth) => {
        const point = slots[index]
        return point === undefined
          ? []
          : [
              draw(
                point.value,
                depth,
                tone,
                against(one),
                undefined,
                stackFarEnds([point.value])[0],
                point.tone,
              ),
            ]
      })

export type { StackEnd } from './bar-stack.js'
export { stackEnds, stackedReadings, stackFarEnds, stackSpans } from './bar-stack.js'
