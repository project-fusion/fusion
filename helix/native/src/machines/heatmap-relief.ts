/**
 * A spatial heatmap's relief on a phone: Heatmap's readings drawn as prisms,
 * each as tall as its value, on a slab, seen from a camera a drag and Shift
 * with an arrow turn, and the first and last labels under their ends of the
 * front edge.
 *
 * **Core lays it out, as it does for the web's element.** `reliefOf` gives
 * each prism's faces, the slab, the box they fit in, and the order to paint
 * them from the camera, `heightsOf` each height against the highest reading
 * in the table, and `labelPlaces` where the labels stand clear of the
 * drawing. The drawing is react-native-svg in the relief's own units, its
 * `viewBox` the box core fits round it, held through a drag as the web's is.
 *
 * **Each face's colors are worked out here**, as the web's relative colors
 * work them out: the top in the reading's tone, the sides a step and two
 * steps less light, and each edge a step lighter where the face is dark and
 * darker where it is light, with emphasis and material mixed in.
 */

import {
  type HeatmapReading,
  heatmapFits,
  heatmapTone,
  writtenList,
  writtenNumbers,
} from '@fusion.dev/helix-core/chart'
import {
  ACROSS,
  heightsOf,
  highestOf,
  ISOMETRIC,
  type LabelSize,
  labelPlaces,
  type PagePoint,
  type Prism,
  type Relief,
  reliefOf,
} from '@fusion.dev/helix-core/spatial'
import { useCallback, useRef, useState } from 'react'
import type { LayoutChangeEvent } from 'react-native'
import type { TrackPoint } from '../drivers/track'
import { lightnessOf, mix, movedLightness } from '../style/color'
import type { Theme } from '../theme/theme'
import { colorOf, lengthOf, type Treatment, throughOf, toneColor } from './heatmap-cells'
import { within } from './spatial-bar'
import { useCamera } from './spatial-chart-parts'

/** The family that draws its strip as a relief. */
export const RELIEF = 'spatial-heatmap'

/** The smallest cell and the gap the web's arithmetic plans around, its `min-cell` and `gap`. */
const MIN_CELL = 10
const GAP = 2

/** How far a label stands below what it clears, in points, as the web's. */
const LABEL_GAP = 4

/** How much less light each side is than the top, the web's two shade hooks at rest. */
const SHADES = { left: 0.07, right: 0.14 }

/**
 * How many readings fit a strip `width` wide, as whole columns, newest kept,
 * as the web's relief counts them: a cell takes `ACROSS` of its pitch across
 * the page, and a strip `rows` deep starts that many cells to the left of its
 * first column. All of them before the strip is measured.
 */
export const reliefFits = (count: number, width: number, rows: number): number => {
  if (!(width > 0)) {
    return count
  }
  const across = width / ACROSS - rows * (MIN_CELL + GAP) - GAP
  return heatmapFits(count, Math.max(across, Number.MIN_VALUE), MIN_CELL, GAP, rows)
}

/** A face's paint as the tree writes it on the face. */
interface Paint {
  readonly fill: string
  readonly stroke: string
}

/** The edge a face draws: a step lighter where it is dark, and darker where it is light. */
const edgeOf = (face: string): string => {
  const lightness = lightnessOf(face) ?? 0.5
  return movedLightness(face, Math.min(0.1, Math.max(-0.08, (0.6 - lightness) * 1000))) ?? face
}

/** A prism's face, faded toward the page under `outlined`, washed under `subtle`, through its material. */
const prismPaint = (face: string, treatment: Treatment, theme: Theme): Paint => {
  const through = throughOf(theme, treatment.material)
  const outlined = treatment.emphasis === 'outlined'
  const edged = outlined || treatment.emphasis === 'subtle'
  const fill = outlined ? mix(face, 60, colorOf(theme, 'color-background')) : face
  const area = treatment.emphasis === 'subtle' ? 0.2 : 1
  return {
    fill: mix(fill, area * through * 100, 'transparent'),
    stroke: mix(edged ? face : edgeOf(face), through * 100, 'transparent'),
  }
}

/** The three faces of a top color: the top, and the sides a step and two steps less light. */
const shadesOf = (top: string) => ({
  left: movedLightness(top, -SHADES.left) ?? top,
  right: movedLightness(top, -SHADES.right) ?? top,
  top,
})

/** The slab's faces: a step darker than an empty tile, so the empty days read as tiles let into it. */
const slabOf = (relief: Relief, theme: Theme) => {
  const base = relief.base
  if (base === undefined) {
    return []
  }
  const faces = shadesOf(
    mix(colorOf(theme, 'color-border'), 45, colorOf(theme, 'color-surface-sunken')),
  )
  const paint = (face: string) => ({ fill: face, stroke: edgeOf(face) })
  const [left, right, top] = [paint(faces.left), paint(faces.right), paint(faces.top)]
  return [
    {
      key: 'slab',
      left: base.left,
      leftFill: left.fill,
      leftStroke: left.stroke,
      right: base.right,
      rightFill: right.fill,
      rightStroke: right.stroke,
      top: base.top,
      topFill: top.fill,
      topStroke: top.stroke,
    },
  ]
}

/** What the prisms read beside the relief: the readings, their treatment, and the selection. */
export interface Asked {
  readonly drawn: readonly HeatmapReading[]
  readonly thresholds: unknown
  readonly tones: unknown
  readonly treatment: Treatment
  readonly chosen: (index: number) => boolean
}

/** Words a prop holds, or none. */
const wordsOf = (value: unknown): string => (typeof value === 'string' ? value : '')

/**
 * Each prism, back to front, its faces in its colors: the prism the reading
 * rests on with a thicker edge, and a selected one with a thicker dashed
 * edge, where they stand, as the web's are.
 */
const prismsOf = (relief: Relief, at: number, asked: Asked, theme: Theme) => {
  const bounds = writtenNumbers(wordsOf(asked.thresholds))
  const palette = writtenList(wordsOf(asked.tones))
  const tile = mix(colorOf(theme, 'color-surface'), 60, colorOf(theme, 'color-surface-sunken'))
  const thin = `${lengthOf(theme, 'border-thin', 1)}px`
  const thick = `${lengthOf(theme, 'border-thick', 2)}px`
  /* Worked out once a tone, since a strip of a year holds a handful of tones. */
  const painted = new Map<string, [Paint, Paint, Paint]>()
  const paintsOf = (tone: string | undefined): [Paint, Paint, Paint] => {
    const known = painted.get(tone ?? '')
    if (known !== undefined) {
      return known
    }
    const faces = shadesOf(toneColor(theme, tone, tile))
    const paints = [faces.left, faces.right, faces.top].map((face) =>
      prismPaint(face, asked.treatment, theme),
    ) as [Paint, Paint, Paint]
    painted.set(tone ?? '', paints)
    return paints
  }
  return relief.order.map((index) => {
    const prism = relief.prisms[index] as Prism
    const reading = asked.drawn[index] ?? { value: undefined }
    const [left, right, top] = paintsOf(heatmapTone(reading, bounds, palette))
    const selected = asked.chosen(index)
    const ringed = selected || index === at
    return {
      dash: selected && index !== at ? '3 2' : 'none',
      key: String(index),
      left: prism.left,
      leftFill: left.fill,
      leftStroke: left.stroke,
      right: prism.right,
      rightFill: right.fill,
      rightStroke: right.stroke,
      top: prism.top,
      topFill: top.fill,
      topStroke: top.stroke,
      width: ringed ? thick : thin,
    }
  })
}

/** The corners of path data written `Mx yLx y…Z`, as points. */
const cornersOf = (data: string): PagePoint[] =>
  [...data.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map((pair) => ({
    x: Number(pair[1]),
    y: Number(pair[2]),
  }))

/** The prism a point of the drawing is on, front first, or `-1`, as the web's pointer finds it. */
const prismUnder = (relief: Relief, at: PagePoint): number => {
  for (let place = relief.order.length - 1; place >= 0; place -= 1) {
    const index = relief.order[place] as number
    const prism = relief.prisms[index]
    const corners = prism ? [prism.left, prism.right, prism.top].flatMap(cornersOf) : []
    if (corners.length >= 3 && within(corners, at)) {
      return index
    }
  }
  return -1
}

/** A frame of the drawing in its own units: its left, top, width, and height. */
interface Frame {
  readonly height: number
  readonly width: number
  readonly x: number
  readonly y: number
}

/** The first and last labels' sizes, as each is laid out. */
const useLabelSizes = () => {
  const [sizes, setSizes] = useState<{ end?: LabelSize; start?: LabelSize }>({})
  /* **Both are told at once**, since each change draws every prism again: the
     first label's size waits for the second's, and a later change goes at once. */
  const heard = useRef<{ end?: LabelSize; start?: LabelSize }>({})
  const measure = useCallback(
    (key: 'end' | 'start') => (event: LayoutChangeEvent) => {
      const { height, width } = event.nativeEvent.layout
      const was = heard.current[key]
      if (was?.height === height && was.width === width) {
        return
      }
      heard.current = { ...heard.current, [key]: { height, width } }
      if (heard.current.end !== undefined && heard.current.start !== undefined) {
        setSizes(heard.current)
      }
    },
    [],
  )
  return { measure, sizes }
}

/**
 * Where the first and last labels stand from the footer's top left, in
 * points, and how tall the footer is to hold them: under their ends of the
 * front edge, clear of the drawing, as the web's measure places them. None
 * until both labels are measured.
 */
const labelsOf = (
  relief: Relief,
  frame: Frame,
  strip: { readonly height: number; readonly width: number },
  sizes: { end?: LabelSize; start?: LabelSize },
) => {
  const none = { endX: '', endY: '', footer: 0, startX: '', startY: '' }
  if (!relief.corners || !sizes.end || !sizes.start || !(frame.width > 0) || !(strip.width > 0)) {
    return none
  }
  const page = (point: PagePoint): PagePoint => ({
    x: ((point.x - frame.x) / frame.width) * strip.width,
    y: ((point.y - frame.y) / frame.height) * strip.height - strip.height,
  })
  const placed = labelPlaces(
    relief.outline.map(page),
    { end: page(relief.corners.end), start: page(relief.corners.start) },
    { end: sizes.end, start: sizes.start },
    strip.width,
    LABEL_GAP,
  )
  const [start, end] = [placed.start, placed.end]
  return {
    endX: `${Math.round(end.x)}px`,
    endY: `${Math.round(end.y)}px`,
    footer: Math.max(
      0,
      Math.round(start.y) + sizes.start.height,
      Math.round(end.y) + sizes.end.height,
    ),
    startX: `${Math.round(start.x)}px`,
    startY: `${Math.round(start.y)}px`,
  }
}

/** What the relief reads of the strip before its reading is known: the readings and the room. */
export interface Room {
  readonly all: readonly HeatmapReading[]
  readonly drawn: readonly HeatmapReading[]
  readonly flat: boolean
  readonly relief: number
  readonly rows: number
  readonly theme: Theme
  readonly width: number
}

/**
 * Hosts a relief: the camera and its frame, the strip's size, the prism under
 * a finger, and, once the reading is known, each prism, the slab, the
 * bubble's place, and the labels. Its hooks run for a flat heatmap too, which
 * leaves the rest unread.
 */
export const useRelief = (room: Room) => {
  const box = { height: 0, width: 0 }
  const view = useCamera(box, ISOMETRIC)
  const labels = useLabelSizes()
  const tallest = room.flat ? 0 : Math.max(0, room.relief || 0)
  const heights = heightsOf(
    room.drawn.map((point) => point.value),
    highestOf(room.all.map((point) => point.value)),
    tallest,
  )
  const relief = reliefOf(heights, room.rows, MIN_CELL / (MIN_CELL + GAP), view.camera)
  const frame: Frame = view.frameOf(relief.box, relief.middle)
  const count = room.drawn.length
  const span = Math.ceil(count / room.rows) + Math.min(room.rows, count)
  const cell = 1.25 * room.theme.spaceRem
  const width = Math.max(0, Math.min(span * 0.866 * cell, room.width || Number.POSITIVE_INFINITY))
  const height = frame.width > 0 ? (width * frame.height) / frame.width : 0
  box.width = width
  box.height = height
  const strip = { height, width }
  const share = (point: PagePoint) => ({
    x: frame.width > 0 ? ((point.x - frame.x) / frame.width) * width : 0,
    y: frame.height > 0 ? ((point.y - frame.y) / frame.height) * height : 0,
  })
  return {
    claim: view.claim,
    /** The prisms, the slab, the bubble's mark, and the labels, the reading resting on `at`. */
    drawing: (at: number, asked: Asked) => {
      const peak = relief.prisms[at]?.peak
      const mark = peak === undefined ? undefined : share(peak)
      const placed = labelsOf(relief, frame, strip, labels.sizes)
      /* **Nothing is drawn before the element's width is measured**, which says how
         many columns fit: a year drawn whole first and cut after cost a phone
         seconds of drawing it threw away. */
      const measured = room.width > 0
      return {
        base: measured ? slabOf(relief, room.theme) : [],
        cells: measured ? prismsOf(relief, at, asked, room.theme) : [],
        footer: placed.footer,
        labels: {
          endX: placed.endX,
          endY: placed.endY,
          startX: placed.startX,
          startY: placed.startY,
        },
        markX: mark === undefined ? '' : `${mark.x}px`,
        markY: mark === undefined ? '' : `${mark.y}px`,
        viewBox: `${frame.x} ${frame.y} ${frame.width} ${frame.height}`,
      }
    },
    measure: labels.measure,
    pick: (point: TrackPoint) =>
      prismUnder(relief, {
        x: frame.x + point.x * frame.width,
        y: frame.y + point.y * frame.height,
      }),
    strip,
    turn: view.turn,
  }
}

/**
 * A relief's prisms, its slab, and its labels where a flat strip draws its
 * cells: the prism the reading rests on stays where it stands, ringed, so
 * nothing is drawn again over the rest, and the bubble points at its top.
 */
export const reliefLook = (
  relief: ReturnType<typeof useRelief>,
  flat: {
    readonly states: Readonly<Record<string, string | boolean>>
    readonly tipCells: readonly object[]
  },
  at: number,
  asked: Asked,
) => {
  const drawing = relief.drawing(at, asked)
  return {
    lists: { actives: [], base: drawing.base, cells: drawing.cells },
    measured: {
      'heatmap-strip-height': relief.strip.height,
      'heatmap-strip-width': relief.strip.width,
      'spatial-heatmap-footer': drawing.footer,
    },
    parts: {
      end: { view: { onLayout: relief.measure('end') } },
      start: { view: { onLayout: relief.measure('start') } },
    },
    shown: {
      actives: [],
      states: { ...flat.states, markX: drawing.markX, markY: drawing.markY },
      tipCells: flat.tipCells,
    },
    states: { ...drawing.labels, viewBox: drawing.viewBox },
  }
}
