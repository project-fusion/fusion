/**
 * Spatial Bar Chart's drawing on a phone: each place on the grid a block as
 * tall as its value from zero, its faces painted back to front as core's
 * `barPicture` lays them, a row's floor and names where `layout` asks for
 * one, a toned bar's value over it, and the ring on the bar the reading
 * rests on. The web element draws the same blocks from the same core in its
 * own SVG.
 *
 * **Each face's color is worked out here**, as the web's sheet works it out
 * with a relative color: the bar's tone or its series, darkened by how far
 * the face turns from the light, its edge a step lighter where it is dark and
 * darker where it is light, and under `muted` the neutral ink mixed by the
 * same steps.
 */

import {
  type BarCell,
  type BarField,
  type BarLayout,
  type BarPicture,
  barPicture,
  barsOf,
  type DrawnBar,
  grownAt,
  growTime,
  type PagePoint,
} from '@fusion.dev/helix-core/spatial'
import { lightnessOf, mix, movedLightness } from '../style/color'
import type { Theme } from '../theme/theme'
import { plottedOf } from './axis-chart'
import type { Color } from './chart-common'
import type { SpatialKind, SpatialPicture, SpatialWord } from './spatial-chart'

/** The theme's token for each tone a cell can name with `data-tone`, as the web's hooks rest at. */
const TONES: Readonly<Record<string, string>> = {
  accent: 'color-accent',
  danger: 'color-danger',
  info: 'color-info',
  muted: 'color-foreground-subtle',
  primary: 'color-primary',
  success: 'color-success',
  warning: 'color-warning-mark',
}

/** How many series colors the theme has, after which they come round again. */
const SERIES = 24

/** A cell's tone, where it is a name a hook can carry, as the web's element refuses any other. */
const toned = (tone: string | undefined): string | undefined =>
  tone && /^[a-z][a-z0-9-]*$/.test(tone) ? tone : undefined

/** The chart's table as bars, and how they stand. */
interface Bars {
  readonly emphasis: string
  readonly field: BarField
  readonly grow: boolean
  readonly layout: BarLayout
  readonly noBox: boolean
  readonly texts: readonly (readonly string[])[]
}

/** The picture a phone draws, kept beside the box's picture so the marks read the bars. */
interface BarsPicture extends SpatialPicture {
  readonly bars: BarPicture
}

/** A length a hook gives in points, as a row's bar size, or `undefined`. */
const pointsOf = (written: unknown): number | undefined => {
  const value = typeof written === 'number' ? written : Number.parseFloat(String(written ?? ''))
  return Number.isFinite(value) && value > 0 ? value : undefined
}

/** Whether a point stands inside the hull of a block's corners, which is its outline on the page. */
const within = (corners: readonly PagePoint[], at: PagePoint): boolean => {
  const sorted = [...corners].sort((one, other) => one.x - other.x || one.y - other.y)
  const cross = (o: PagePoint, a: PagePoint, b: PagePoint) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
  const half = (points: readonly PagePoint[]) => {
    const hull: PagePoint[] = []
    for (const point of points) {
      while (
        hull.length >= 2 &&
        cross(hull.at(-2) as PagePoint, hull.at(-1) as PagePoint, point) <= 0
      ) {
        hull.pop()
      }
      hull.push(point)
    }
    return hull.slice(0, -1)
  }
  const hull = [...half(sorted), ...half([...sorted].reverse())]
  return (
    hull.length > 2 &&
    hull.every(
      (point, index) => cross(point, hull[(index + 1) % hull.length] as PagePoint, at) >= 0,
    )
  )
}

/** A bar's own color: its tone's, or its series'. */
const colorOfBar = (cell: BarCell | undefined, theme: Theme, colorOf: Color): string => {
  const series = colorOf((cell?.depth ?? 0) % SERIES)
  const token = cell?.tone === undefined ? undefined : TONES[cell.tone]
  return token === undefined ? series : String(theme.tokens[token] ?? series)
}

/** What one face is painted in: its fill and its edge, as the web's sheet works them out under each emphasis. */
const faceInk = (
  color: string,
  shade: number,
  ask: { readonly emphasis: string; readonly lit: boolean; readonly theme: Theme },
) => {
  const ink = (token: string) => String(ask.theme.tokens[token] ?? 'transparent')
  const face = movedLightness(color, -shade * 0.5) ?? color
  const lightness = lightnessOf(face) ?? 0.5
  const edge =
    movedLightness(face, Math.min(0.1, Math.max(-0.08, (0.6 - lightness) * 1000))) ?? face
  if (ask.emphasis !== 'muted') {
    return { edge, face }
  }
  const share = (value: number) => Math.min(100, Math.max(0, value))
  return {
    edge: mix(ink('color-foreground'), 10, 'transparent'),
    face: ask.lit
      ? mix(color, share(100 - shade * 130), ink('color-surface'))
      : mix(ink('color-foreground'), share(30 - shade * 66), ink('color-surface')),
  }
}

/** Each face of each bar, back to front, in its colors, the bar the reading rests on marked. */
const facesOf = (
  model: Bars,
  painted: readonly DrawnBar[],
  at: number,
  paint: { readonly colorOf: Color; readonly theme: Theme },
) =>
  painted.flatMap((bar) => {
    const cell = model.field.cells[bar.index]
    const color = colorOfBar(cell, paint.theme, paint.colorOf)
    const lit = cell?.tone !== undefined
    return bar.drawn.faces.map((face, side) => {
      const ink = faceInk(color, face.darken, { emphasis: model.emphasis, lit, theme: paint.theme })
      return {
        color,
        current: bar.index === at,
        d: face.d,
        edge: ink.edge,
        face: ink.face,
        key: `${bar.index} ${side}`,
        tone: cell?.tone ?? '',
      }
    })
  })

/** A row's names under its floor, a toned one in its bar's color, as words over the drawing. */
const namesOver = (
  picture: BarPicture,
  paint: { readonly colorOf: Color; readonly theme: Theme },
): SpatialWord[] =>
  picture.names.map((name) => ({
    color:
      name.tone === undefined
        ? undefined
        : colorOfBar(
            picture.field.cells.find((cell) => cell.across === name.across && cell.tone),
            paint.theme,
            paint.colorOf,
          ),
    size: picture.size,
    text: name.text,
    x: name.x,
    y: name.y,
  }))

/** The spatial bar chart, as the shared spatial chart draws it. */
export const spatialBar: SpatialKind<Bars> = {
  among: () => [],
  columnOf: (model, at) => model.field.cells[at]?.column,
  count: (model) => model.field.cells.length,
  fitsWords: true,
  grid: (model) => Math.max(1, model.field.series.length),
  grows: (model) =>
    model.grow && model.field.readings > 0 ? growTime(model.field.categories.length) : 0,
  hit: (_model, picture, at) => {
    const painted = (picture as BarsPicture).bars.painted
    for (let place = painted.length - 1; place >= 0; place -= 1) {
      const bar = painted[place]
      if (bar !== undefined && within(bar.corners, at)) {
        return bar.index
      }
    }
    return -1
  },
  marks: (model, picture, at, paint) => {
    const drawn = (picture as BarsPicture).bars
    const active = drawn.bars.find((bar) => bar.index === at)
    return {
      lists: {
        faces: facesOf(model, drawn.painted, at, paint),
        floor: drawn.floor.map((plate, key) => ({ d: plate.d, key: String(key) })),
      },
      states: {
        ring: active?.drawn.outline ?? '',
        ringBehind: active?.drawn.outline ?? '',
      },
      values: drawn.values.map((value) => ({
        size: drawn.size,
        text: value.text,
        x: value.x,
        y: value.y,
      })),
      words: namesOver(drawn, paint),
    }
  },
  model: (rows, options) => {
    const columns = plottedOf(rows)
    const field = barsOf(rows, columns, options.stacked === true, (row, depth) =>
      toned(rows[row]?.cells[columns[depth] ?? -1]?.tone),
    )
    const layout = String(options.layout ?? '')
    return {
      emphasis: String(options.emphasis ?? ''),
      field,
      grow: options.grow === true,
      layout: layout === 'row' || layout === 'diagonal' ? layout : 'grid',
      noBox: options.noBox === true,
      texts: rows.map((row) => row.cells.map((cell) => cell.text)),
    }
  },
  open: (model, at, read) => {
    const cell = model.field.cells[at]
    if (cell === undefined || cell.value !== undefined) {
      return undefined
    }
    return String(read('open-label') ?? '')
      .replace('{category}', cell.label)
      .replace('{series}', model.field.series[cell.depth] ?? '')
  },
  options: (read) => ({
    emphasis: String(read('emphasis') ?? ''),
    grow: read('grow') === true,
    layout: String(read('layout') ?? ''),
    noBox: read('no-box') === true,
    stacked: read('stacked') === true,
  }),
  picture: (model, camera, _words, lang, room) => {
    const categories = model.field.categories.length
    const growing = Number.isFinite(room.grown)
    const bars = barPicture(model.field, {
      camera,
      grown: growing ? (cell) => grownAt(cell.across, categories, room.grown) : undefined,
      lang,
      layout: model.layout,
      noBox: model.noBox,
      room:
        room.width > 0 && room.height > 0
          ? {
              bar: pointsOf(room.hooks.barSize),
              font: room.font,
              height: room.height,
              width: room.width,
            }
          : undefined,
      valueText: (cell) => model.texts[cell.row]?.[cell.column],
    })
    const places: PagePoint[] = []
    for (const bar of bars.bars) {
      places[bar.index] = { x: bar.drawn.peak.x, y: bar.drawn.crown }
    }
    return { bars, fits: bars.placed, middle: bars.view.on([0, 0, 0]), places, view: bars.view }
  },
  rowOf: (model, at) => model.field.cells[at]?.row ?? -1,
  valued: (model, at) => model.field.cells[at]?.value !== undefined,
}
