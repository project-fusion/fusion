/**
 * A 3D bar chart's picture, as numbers: the box seen from a camera, the
 * bars as blocks painted back to front, a row's floor and names, and the
 * values over the bars whose cells name a tone, with the frame that fits
 * them and the size its words are written at. The web's element draws it in
 * SVG and a phone in react-native-svg, so both stand each bar at one place.
 */

import type { Camera } from '../projection/projection.js'
import { type FloorPlate, floorOf, namesOf, type RowName } from './bar-row.js'
import {
  type BarCell,
  type BarField,
  type BarLayout,
  barsDrawn,
  climbing,
  type DrawnBar,
  heightened,
  paintOrder,
  tallestTimes,
  widthOf,
} from './bars.js'
import {
  type BoxView,
  boundsOf,
  boxView,
  type Frame,
  type PlotRoom,
  TICK_SIZE,
  wordsFitted,
} from './box.js'

/**
 * How the names and the value take up the height of a sized row, in lines
 * of the box's font: the names under the floor, and the value over the bar.
 */
const WORD_LINES = 3.6

/** The most of a sized plot's height a `diagonal` row climbs across it. */
const CLIMB_SHARE = 0.25

/** The box the drawing fills, its font size, and the width a row's bars are asked to stand at, in pixels. */
export interface BarRoom extends PlotRoom {
  bar?: number | undefined
}

/** What a bar chart's picture is drawn from beside its field. */
export interface BarAsk {
  readonly camera: Camera
  readonly lang: string
  readonly layout: BarLayout
  readonly noBox: boolean
  readonly room: BarRoom | undefined
  /** How much of its height each bar has reached, or `undefined` for every bar at its height. */
  readonly grown?: ((cell: BarCell) => number) | undefined
  /** The words written over a bar whose cell names a tone: the cell's own text. */
  readonly valueText: (cell: BarCell) => string | undefined
}

/** A toned bar's value, written over it. */
export interface BarValue {
  readonly index: number
  readonly text: string
  readonly tone?: string | undefined
  readonly x: number
  /** The middle of the line of text, over the bar as it stands. */
  readonly y: number
}

/** What a bar chart draws, seen from one camera. */
export interface BarPicture {
  /** Whether the box is left out: under `no-box`, and in a row, which draws its floor in place of it. */
  readonly bare: boolean
  /** The bars as they stand now, and in the order they are painted. */
  readonly bars: readonly DrawnBar[]
  readonly painted: readonly DrawnBar[]
  /** The field drawn, a sized row's value axis made taller. */
  readonly field: BarField
  readonly floor: readonly FloorPlate[]
  readonly names: readonly RowName[]
  /** The frame the drawing fits in, before a drag holds it. */
  readonly placed: Frame
  /** The size the words are written at, in the drawing's units. */
  readonly size: number
  /** How many of the drawing's units make a pixel in a sized row. */
  readonly unit: number | undefined
  readonly values: readonly BarValue[]
  readonly view: BoxView
}

/** The frame that holds `frame` and every one of `points`. */
const around = (frame: Frame, points: readonly { x: number; y: number }[]): Frame => {
  const xs = [frame.x, frame.x + frame.width, ...points.map((point) => point.x)]
  const ys = [frame.y, frame.y + frame.height, ...points.map((point) => point.y)]
  const [left, top] = [Math.min(...xs), Math.min(...ys)]
  return { height: Math.max(...ys) - top, width: Math.max(...xs) - left, x: left, y: top }
}

/**
 * A row with a bar size of its own: how many of the drawing's units make a
 * pixel, so each bar is as wide as asked, and the field with its value axis
 * as tall as fills the plot's height with the names and the value. Where
 * the row is too long for the plot, its bars narrow until it fits.
 */
export const sizedRow = (
  read: BarField,
  projection: BoxView['projection'],
  layout: Exclude<BarLayout, 'grid'>,
  room: BarRoom,
  noBox: boolean,
): { field: BarField; unit: number } | undefined => {
  const first = barsDrawn(read, projection, layout)[0]
  if (!first || !room.bar) {
    return undefined
  }
  const frameOf = (field: BarField, grown?: () => number): Frame => {
    const floor = noBox ? [] : floorOf(field, projection, layout)
    const drawn = barsDrawn(field, projection, layout, grown)
    return boundsOf(
      [...drawn.flatMap((bar) => bar.corners), ...floor.flatMap((one) => one.corners)],
      0,
    )
  }
  const unit = Math.max(
    widthOf(first) / room.bar,
    frameOf(read, () => 0).width / Math.max(1, room.width - room.font * 2),
  )
  /* A diagonal climbs at most a quarter of the plot, so the bars of a long
     row keep their height. */
  const field = climbing(read, room.height * CLIMB_SHARE * unit, frameOf(read, () => 0).width)
  const low = frameOf(field, () => 0)
  const high = frameOf(field)
  const tall = (room.height - room.font * WORD_LINES) * unit
  const rises = high.height - low.height
  const fills = rises > 0 ? Math.max(0.05, (tall - low.height) / rises) : 1
  /* A row of one or two stands no taller than it is long and a quarter
     again, so a lone bar stands as a block. */
  const times = Math.min(
    fills,
    tallestTimes(field, projection, barsDrawn(field, projection, layout)),
  )
  return { field: heightened(field, times), unit }
}

/**
 * How many of the drawing's units make a pixel in `frame`, or `undefined`
 * where nothing has measured the box: a sized row holds its scale until its
 * words reach past the plot, and then it shrinks to fit as any does.
 */
export const barPixel = (
  room: BarRoom | undefined,
  unit: number | undefined,
  frame: Frame,
): number | undefined => {
  const fitted = room && 1 / Math.min(room.width / frame.width, room.height / frame.height)
  return unit === undefined ? fitted : Math.max(unit, fitted ?? 0)
}

/**
 * The bar chart's picture: the box fitted to its words, a sized row at the
 * scale that makes each bar as wide as asked, the bars as they have grown,
 * and the names and values written at the box's own font size whatever the
 * drawing's scale. The frame and the words are measured on the bars at
 * their height, so the drawing holds still while they grow.
 */
export const barPicture = (read: BarField, ask: BarAsk): BarPicture => {
  const { layout, room } = ask
  const lined = layout === 'grid' ? undefined : layout
  const bare = ask.noBox || lined !== undefined
  const view = wordsFitted(room, (words) =>
    boxView(read.axes, ask.camera, [], bare, words, ask.lang),
  )
  const sized =
    lined && room?.bar ? sizedRow(read, view.projection, lined, room, ask.noBox) : undefined
  const field = sized?.field ?? read
  const full = barsDrawn(field, view.projection, layout)
  const bars = ask.grown ? barsDrawn(field, view.projection, layout, ask.grown) : full
  const floor = lined && !ask.noBox ? floorOf(field, view.projection, lined) : []
  const base = bare
    ? boundsOf([...full.flatMap((bar) => bar.corners), ...floor.flatMap((one) => one.corners)], 0.1)
    : view.bounds
  const sizeOf = (frame: Frame): number => {
    const pixel = barPixel(room, sized?.unit, frame)
    return room && pixel !== undefined ? room.font * pixel : TICK_SIZE
  }
  const wordsAt = (size: number) => {
    const names = floor.length > 0 ? namesOf(field, floor, size) : []
    const values = full.flatMap((bar): BarValue[] => {
      const one = field.cells[bar.index]
      const text = one?.tone ? ask.valueText(one) : undefined
      return one && text
        ? [
            {
              index: bar.index,
              text,
              tone: one.tone,
              x: bar.drawn.peak.x,
              y: bar.drawn.crown - size,
            },
          ]
        : []
    })
    const extents = [...names, ...values].flatMap((word) => {
      const half = (word.text.length * size * 0.62) / 2
      return [
        { x: word.x - half, y: word.y - size * 0.7 },
        { x: word.x + half, y: word.y + size * 0.7 },
      ]
    })
    return { frame: around(base, extents), names, values }
  }
  /* Three passes, each on the frame the last one widened: a name stood at 10.4
     pixels at 390 wide when the frame was read once. */
  let size = sizeOf(wordsAt(sizeOf(base)).frame)
  size = sizeOf(wordsAt(size).frame)
  size = sizeOf(wordsAt(size).frame)
  const { frame: fits, names, values } = wordsAt(size)
  /* A sized row is centered in a frame the plot's own size at its scale,
     unless its words reach past it, when it shrinks to fit as any does. */
  const wide = sized && room ? room.width * sized.unit : 0
  const high = sized && room ? room.height * sized.unit : 0
  const placed: Frame =
    sized && fits.width <= wide + 1e-9 && fits.height <= high + 1e-9
      ? {
          height: high,
          width: wide,
          x: fits.x + (fits.width - wide) / 2,
          y: fits.y + (fits.height - high) / 2,
        }
      : fits
  /* Over the bar as it stands, so the value rises as the bar grows. */
  const risen = values.map((value) => {
    const crown = bars.find((bar) => bar.index === value.index)?.drawn.crown ?? value.y + size
    return { ...value, y: crown - size }
  })
  return {
    bare,
    bars,
    field,
    floor,
    names,
    painted: paintOrder(view.projection, bars),
    placed,
    size,
    unit: sized?.unit,
    values: risen,
    view,
  }
}
