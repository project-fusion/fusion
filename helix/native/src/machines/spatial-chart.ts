/**
 * A spatial chart on a phone: a box seen from a camera that turns and tilts,
 * its grid, its numbers and names, and the readings a family draws in it,
 * with the reading a finger or a key rests on and its bubble.
 *
 * **Core draws it, as it does for the web's element.** Core's `boxView` lays
 * the box from the camera, and each family's drawing places its readings in
 * it; the drawing is react-native-svg in the box's own units, its `viewBox`
 * the frame core fits around it, widened to the shape of the box it fills as
 * the web's `meet` widens it, so the words over it stand at the same share of
 * the box as the web writes them in it.
 *
 * **A drag across the drawing turns the view**, as on the web, and Shift with
 * an arrow does too. Through a drag the drawing keeps its size, turning round
 * the middle of the data, and settles into its frame once the drag lifts, as
 * the web's does. A tap puts the reading on the reading nearest it.
 */

import { formatNumbers, type Row } from '@fusion.dev/helix-core/chart'
import {
  type BoxView,
  type Camera,
  type Frame,
  frameIn,
  type PagePoint,
  shareOf,
} from '@fusion.dev/helix-core/spatial'
import { useMemo } from 'react'
import type { MachineUse } from '../ir.generated'
import type { Behavior, Props } from '../render/behavior'
import { useChartSource } from '../render/chart-sources'
import type { Family } from '../style/form'
import { type Theme, useTheme } from '../theme/theme'
import {
  axisBehavior,
  cellsOf,
  nameSize,
  percent,
  statusOf,
  useAxisReading,
  useBox,
  withPlotLayout,
} from './axis-chart'
import { type Color, paletteOf, sourceOf } from './chart-common'
import { kebab, wordsIn } from './date-picker-read'
import { langOf } from './picker-field-kind'
import { boundTo, given } from './props'
import {
  fitted,
  lengthOf,
  NO_WORDS,
  pickOf,
  useCamera,
  useRoom,
  wordLists,
} from './spatial-chart-parts'

/** What a family reads of its props, by their web names. */
export type Read = (name: string) => unknown

/** What a family's drawing is, seen from one camera at one size of words. */
export interface SpatialPicture {
  /** The box, its grid, and its numbers and names. */
  readonly view: BoxView
  /** The frame that fits the drawing, and the middle of the data, which a drag turns round. */
  readonly fits: Frame
  readonly middle: PagePoint
  /** Where each reading stands on the page, by its place among the readings. */
  readonly places: readonly PagePoint[]
}

/** A word a family writes in its drawing, in the box's units: a row's name, or a value over its reading. */
export interface SpatialWord {
  readonly text: string
  readonly x: number
  readonly y: number
  /** How tall it is written, in the box's units. */
  readonly size: number
  /** The color it takes, where it is a reading's own, as a toned bar's name. */
  readonly color?: string | undefined
}

/** What the reading a family draws again over the rest is, and the lists its parts repeat. */
export interface SpatialMarks {
  readonly lists: Readonly<Record<string, readonly object[]>>
  readonly states: Readonly<Record<string, string>>
  /** The words the family writes in its drawing, which a phone stands over it: names, and values over readings. */
  readonly words?: readonly SpatialWord[]
  readonly values?: readonly SpatialWord[]
}

/** The box a family's drawing fills, its font size, and how long its readings have grown in, in milliseconds. */
export interface SpatialRoom {
  readonly font: number
  readonly height: number
  readonly width: number
  readonly grown: number
  /** The hooks the element sets on itself, as a row's bar size. */
  readonly hooks: Readonly<Record<string, unknown>>
}

/** A family of spatial chart: how it reads its table, and how it draws it in the box. */
export interface SpatialKind<Model> {
  /** What the family reads of its props, as words, numbers, and switches, which a new model is read for. */
  readonly options: (read: Read) => Readonly<Record<string, boolean | number | string>>
  /** The table as the family reads it, held while the rows and the options are the same. */
  readonly model: (rows: readonly Row[], options: Readonly<Record<string, unknown>>) => Model
  /** How many readings the keys walk, and the row of the table each is. */
  readonly count: (model: Model) => number
  readonly rowOf: (model: Model, at: number) => number
  /** The columns Up and Down walk among, as the measures the readout says first. */
  readonly among: (model: Model) => readonly number[]
  /** The family's drawing seen from `camera`, its words at `words` of their written size. */
  readonly picture: (
    model: Model,
    camera: Camera,
    words: number,
    lang: string,
    room: SpatialRoom,
  ) => SpatialPicture
  /** Whether `picture` fits its words to the room itself, as a bar chart's row does, so it is drawn once. */
  readonly fitsWords?: boolean
  /** What the family's parts repeat, and the ring on the reading at `at`, or `-1`. */
  readonly marks: (
    model: Model,
    picture: SpatialPicture,
    at: number,
    paint: { readonly colorOf: Color; readonly theme: Theme },
  ) => SpatialMarks
  /** The reading a point of the drawing is on, front first, or `-1`: a bar's block, where a point stands nearest. */
  readonly hit?: (model: Model, picture: SpatialPicture, at: PagePoint) => number
  /** How long the readings grow in for, in milliseconds, where the family grows them; zero for none. */
  readonly grows?: (model: Model) => number
  /** How many readings stand in a column the across arrows step over, as a category's series. */
  readonly grid?: (model: Model) => number
  /** The column a reading is said by, and the words for a place with no value. */
  readonly columnOf?: (model: Model, at: number) => number | undefined
  readonly open?: (model: Model, at: number, read: Read) => string | undefined
  /** Whether the reading at `at` holds a value, which a place with none does not, as an empty cell of a bar chart. */
  readonly valued?: (model: Model, at: number) => boolean
}

/** What a family's reading reads of the family beside the host's: its grid, its columns, and its places with no value. */
const kindReading = <Model>(
  kind: SpatialKind<Model>,
  model: Model,
  read: Read,
  order: readonly number[],
) => {
  const grid = kind.grid?.(model)
  return {
    columnOf: (at: number) => kind.columnOf?.(model, at),
    ...(grid === undefined ? {} : { grid }),
    open: (at: number) => kind.open?.(model, at, read),
    rowOf: (at: number) => (kind.valued?.(model, at) === false ? -1 : (order[at] ?? -1)),
  }
}

/** Hosts a spatial chart of `kind`: its box and readings from its table, its view, and its reading. */
export const useSpatialChart = <Model>(
  kind: SpatialKind<Model>,
  family: Family,
  props: Props,
  use: MachineUse,
): Behavior => {
  const read: Read = (name) => given(family, props, kebab(name))
  const lang = langOf(read)
  const theme = useTheme()
  const colorOf = useMemo(() => paletteOf(theme), [theme])
  const id = wordsIn(read('for'))
  const table = useChartSource(id)
  const data = read('data')
  const source = useMemo(() => sourceOf(table, data, lang), [table, data, lang])
  const rows = source?.rows ?? []
  const key = JSON.stringify(kind.options(read))
  const model = useMemo(() => kind.model(rows, JSON.parse(key)), [kind, rows, key])
  const count = kind.count(model)
  const { box: plot, onLayout } = useBox()
  /* The drawing's box, inset from the plot on every side as the web's fallback is. */
  const inset = lengthOf(theme, 'space-md', 16)
  const box = {
    height: Math.max(0, plot.height - 2 * inset),
    width: Math.max(0, plot.width - 2 * inset),
  }
  const view = useCamera(box)
  const room = useRoom(kind, model, { box, font: nameSize(theme), hooks: props.hooks })
  const picture = fitted(kind, model, view.camera, room, lang)
  const frame = frameIn(view.frameOf(picture.fits, picture.middle), box.width, box.height)
  const order = useMemo(
    () => Array.from({ length: count }, (_, at) => kind.rowOf(model, at)),
    [count, kind, model],
  )
  const ordered = order.map((row) => rows[row] ?? { cells: [], label: '' })
  const among = kind.among(model)
  const reading = useAxisReading(family, props, use, read, {
    ...kindReading(kind, model, read, order),
    axis: 'none',
    claim: view.claim,
    columns: among,
    count,
    ltr: true,
    pick: pickOf(kind, model, picture, frame, { box, inset, plot }),
    rows: ordered,
    shows: () => true,
    turn: view.turn,
    write: formatNumbers(lang),
  })
  const { cursor } = reading
  const marks = kind.marks(model, picture, cursor.at, { colorOf, theme })
  const active = picture.places[cursor.at]
  const mark = active === undefined ? undefined : shareOf({ bounds: frame } as BoxView, active)
  const any = count > 0
  const name =
    wordsIn(read('aria-label')) ||
    wordsIn(read('label')) ||
    source?.caption ||
    wordsIn(read('plot-label'))
  const states = {
    ...marks.states,
    ...statusOf(read, any, name),
    grid: picture.view.grid,
    live: cursor.keyed && cursor.at >= 0 ? reading.said(cursor.at, cursor.series) : '',
    markX: mark === undefined ? '' : percent(mark.x * 100),
    markY: mark === undefined ? '' : percent(mark.y * 100),
    placement: 'top',
    tipLabel: active === undefined ? '' : (ordered[cursor.at]?.label ?? ''),
    /* The bubble follows the reading while a drag turns the view, as the web's does. */
    tipped: active !== undefined,
    viewBox: `${frame.x} ${frame.y} ${frame.width} ${frame.height}`,
  }
  const lists = {
    ...marks.lists,
    cells: cellsOf(ordered, [], cursor.at, undefined, colorOf),
    ...(any ? wordLists(picture.view, marks, frame, box.width) : NO_WORDS),
  }
  const behavior = axisBehavior({
    flag: (one) => boundTo(use, one, 'state') ?? kebab(one),
    lists,
    measured: { 'chart-mark-x': states.markX, 'chart-mark-y': states.markY },
    name,
    onLayout: () => undefined,
    reading,
    states,
    summary: '',
  })
  return withPlotLayout(behavior, onLayout)
}
