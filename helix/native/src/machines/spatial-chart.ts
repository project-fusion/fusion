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

import { environment } from '@fusion.dev/helix-core/capabilities/environment'
import { formatNumbers, type Row } from '@fusion.dev/helix-core/chart'
import {
  type BoxView,
  type Camera,
  dragged,
  type Frame,
  frameIn,
  type PagePoint,
  SPATIAL_VIEW,
  shareOf,
  TurnFrame,
  turned,
} from '@fusion.dev/helix-core/spatial'
import { useMemo, useRef, useState } from 'react'
import type { TrackPoint } from '../drivers/track'
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

/** What the reading a family draws again over the rest is, and the lists its parts repeat. */
export interface SpatialMarks {
  readonly lists: Readonly<Record<string, readonly object[]>>
  readonly states: Readonly<Record<string, string>>
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
  readonly picture: (model: Model, camera: Camera, words: number, lang: string) => SpatialPicture
  /** What the family's parts repeat, and the ring on the reading at `at`, or `-1`. */
  readonly marks: (
    model: Model,
    picture: SpatialPicture,
    at: number,
    colorOf: Color,
  ) => SpatialMarks
}

/** How near a finger has to be to a reading to be asking about it, in points, as the web's tap. */
const REACH = 24

/** The arrow keys that turn the view while Shift is held, and which way each turns it. */
const TURNS: Readonly<Record<string, { across: number; up: number }>> = {
  ArrowDown: { across: 0, up: -1 },
  ArrowLeft: { across: -1, up: 0 },
  ArrowRight: { across: 1, up: 0 },
  ArrowUp: { across: 0, up: 1 },
}

/** A length of the theme in points, from a `rem` or a `px` length. */
const lengthOf = (theme: Theme, token: string, fallback: number): number => {
  const written = String(theme.tokens[token] ?? '')
  const value = Number.parseFloat(written)
  if (!Number.isFinite(value)) {
    return fallback
  }
  return written.endsWith('rem') ? value * theme.rem : value
}

/** The camera, the frame it holds through a drag, and the drag and the keys that turn it. */
const useCamera = (box: { readonly height: number; readonly width: number }) => {
  const [camera, setCamera] = useState<Camera>(SPATIAL_VIEW)
  const [moving, setMoving] = useState(false)
  const [, redraw] = useState(0)
  const frames = useRef(new TurnFrame())
  const turn = {
    by: (from: TrackPoint, to: TrackPoint) => {
      setMoving(true)
      setCamera((was) => dragged(was, (to.x - from.x) * box.width, (to.y - from.y) * box.height))
    },
    end: () => setMoving(false),
  }
  const claim = (key: {
    readonly key: string
    readonly shift: boolean
    readonly alt: boolean
    readonly control: boolean
    readonly meta: boolean
  }) => {
    const step = TURNS[key.key]
    if (!key.shift || step === undefined || key.alt || key.control || key.meta) {
      return false
    }
    setCamera((was) => turned(was, step.across, step.up))
    return true
  }
  /** The frame to draw in, which asks for another draw while the drawing settles. */
  const frameOf = (fits: Frame, middle: PagePoint): Frame => {
    const still = environment().read().reducedMotion
    const { settling, shown } = frames.current.frame(fits, middle, moving, still)
    if (settling) {
      requestAnimationFrame(() => redraw((count) => count + 1))
    }
    return shown
  }
  return { camera, claim, frameOf, turn }
}

/**
 * The picture whose words stand at the box's type size on the screen, as the
 * web's `wordsFitted` measures them: the drawing scales to its box, so a word
 * written in the box's units is sized again on the frame it widened.
 */
const fitted = <Model>(
  kind: SpatialKind<Model>,
  model: Model,
  camera: Camera,
  room: { readonly font: number; readonly height: number; readonly width: number },
  lang: string,
): SpatialPicture => {
  let picture = kind.picture(model, camera, 1, lang)
  if (!(room.width > 0 && room.height > 0)) {
    return picture
  }
  for (let pass = 0; pass < 4; pass += 1) {
    const { height, width } = picture.fits
    const pixel = 1 / Math.min(room.width / width, room.height / height)
    picture = kind.picture(
      model,
      camera,
      Math.min(3, Math.max(0.25, (room.font * pixel) / 0.13)),
      lang,
    )
  }
  return picture
}

/** A number or a name over the drawing, at its share of the frame. */
const wordsAt = (view: BoxView, frame: Frame, name: boolean) =>
  view.labels
    .filter((one) => one.name === name)
    .map((one, key) => {
      const at = shareOf({ ...view, bounds: frame }, one)
      return { key: String(key), text: one.text, x: percent(at.x * 100), y: percent(at.y * 100) }
    })

/** The reading under a finger: the one whose place is nearest it on the screen, within `REACH`. */
const nearestOf =
  (
    places: readonly PagePoint[],
    frame: Frame,
    box: { readonly height: number; readonly width: number },
  ) =>
  (point: TrackPoint): number => {
    let found = -1
    let distance = REACH
    places.forEach((place, at) => {
      const share = shareOf({ bounds: frame } as BoxView, place)
      const away = Math.hypot((share.x - point.x) * box.width, (share.y - point.y) * box.height)
      if (away < distance) {
        distance = away
        found = at
      }
    })
    return found
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
  const room = { font: nameSize(theme), height: box.height, width: box.width }
  const picture = fitted(kind, model, view.camera, room, lang)
  const frame = frameIn(view.frameOf(picture.fits, picture.middle), box.width, box.height)
  const order = useMemo(
    () => Array.from({ length: count }, (_, at) => kind.rowOf(model, at)),
    [count, kind, model],
  )
  const ordered = order.map((row) => rows[row] ?? { cells: [], label: '' })
  const among = kind.among(model)
  const reading = useAxisReading(family, props, use, read, {
    axis: 'none',
    claim: view.claim,
    columns: among,
    count,
    ltr: true,
    pick: (point) =>
      nearestOf(
        picture.places,
        frame,
        box,
      )({
        x: (point.x * plot.width - inset) / Math.max(1, box.width),
        y: (point.y * plot.height - inset) / Math.max(1, box.height),
      }),
    rowOf: (at) => order[at] ?? -1,
    rows: ordered,
    shows: () => true,
    turn: view.turn,
    write: formatNumbers(lang),
  })
  const { cursor } = reading
  const marks = kind.marks(model, picture, cursor.at, colorOf)
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
    tipped: active !== undefined,
    viewBox: `${frame.x} ${frame.y} ${frame.width} ${frame.height}`,
  }
  const lists = {
    ...marks.lists,
    cells: cellsOf(ordered, [], cursor.at, undefined, colorOf),
    names: any ? wordsAt(picture.view, frame, true) : [],
    ticks: any ? wordsAt(picture.view, frame, false) : [],
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
