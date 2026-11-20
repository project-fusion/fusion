/**
 * Where a phone's board stands in its viewport: the plane drawn at the
 * document's own size in the middle of the box, the pan and pinch driver
 * moving and scaling it from a tenth to eight times, the fit it opens at,
 * the view a page hears, the part of the document on screen, and the
 * ruling that moves with it.
 *
 * **The driver's scale is the board's zoom**, since the plane is drawn at
 * one point a unit; its pan is how far the plane's middle is from the box's.
 * The fit is core's `fitted`, into the box less the controls, as the web's
 * keeps the first cards clear of them.
 *
 * **The ruling follows the plane under the finger**: it is drawn once the
 * board stands, three boxes wide around the box, and moved and scaled on
 * the UI thread by how far the plane has moved and scaled since, so a drag
 * or a pinch carries it, and it is drawn again when the board stands.
 */
import { FIT_MIN, fitted, ruling, ZOOM_MAX, ZOOM_MIN } from '@fusion.dev/helix-core/canvas'
import type { Zoom } from '@fusion.dev/helix-core/zoom'
import { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import Reanimated, { type SharedValue, useAnimatedStyle } from 'react-native-reanimated'
import { useZoom, type Zooming } from '../drivers/zoom'
import { svg } from '../render/vector'

/** A box's size, in points. */
export interface Size {
  readonly height: number
  readonly width: number
}

/** A rectangle in the document's own units. */
export interface Area {
  readonly height: number
  readonly width: number
  readonly x: number
  readonly y: number
}

/** The plane the cards are drawn on: its corner in the document's units, and its size. */
export interface Plane {
  readonly box: Size
  readonly origin: { readonly x: number; readonly y: number }
}

/** A control's side, and the space around the cluster, in points: a finger's target, and the small space. */
const TARGET = 44
const AROUND = 8
const BETWEEN = 4

/** Where the controls stand and how many rows and columns of them there are. */
export interface Cluster {
  readonly columns: number
  readonly placement: string
  readonly rows: number
}

/** The box less a band across the controls' edge, and less a column down their side, each where it leaves half the box. */
const cutsOf = (box: Size, cluster: Cluster): { band?: Area; column?: Area } => {
  const atTop = !cluster.placement.startsWith('bottom')
  const atLeft = cluster.placement.endsWith('start')
  const span = (count: number) => count * TARGET + Math.max(count - 1, 0) * BETWEEN + AROUND * 2
  const thick = span(cluster.rows)
  const wide = span(cluster.columns)
  return {
    ...(thick <= box.height / 2
      ? { band: { height: box.height - thick, width: box.width, x: 0, y: atTop ? thick : 0 } }
      : {}),
    ...(wide <= box.width / 2
      ? { column: { height: box.height, width: box.width - wide, x: atLeft ? wide : 0, y: 0 } }
      : {}),
  }
}

/**
 * What a fit may use: the box less a band across the controls' edge, or
 * less a column down their side, each where it leaves at least half the
 * box, as the web's frees are, the cut that keeps more of the box.
 */
export const freeOf = (box: Size, cluster: Cluster, whole: Size): Area => {
  const all = { ...box, x: 0, y: 0 }
  if (cluster.rows === 0) {
    return all
  }
  const { band, column } = cutsOf(box, cluster)
  if (band && column && whole.width * FIT_MIN > column.width) {
    return band
  }
  if (band && column && whole.height * FIT_MIN > band.height) {
    return column
  }
  if (band && (!column || band.height / box.height >= column.width / box.width)) {
    return band
  }
  return column ?? all
}

/** The driver's zoom that lands the plane's corner where a fit puts it. */
export const fitZoom = (box: Size, plane: Size, cluster: Cluster): Zoom | undefined => {
  if (box.width === 0 || box.height === 0 || plane.width === 0) {
    return undefined
  }
  const view = fitted(plane, freeOf(box, cluster, plane))
  return {
    pan: {
      x: view.x - (box.width / 2 - (plane.width * view.zoom) / 2),
      y: view.y - (box.height / 2 - (plane.height * view.zoom) / 2),
    },
    scale: view.zoom,
  }
}

/** The part of the document on screen, in its own units. */
export const onScreenOf = (box: Size, plane: Plane, zoom: Zoom): Area => ({
  height: box.height / zoom.scale,
  width: box.width / zoom.scale,
  x: plane.origin.x + plane.box.width / 2 - (box.width / 2 + zoom.pan.x) / zoom.scale,
  y: plane.origin.y + plane.box.height / 2 - (box.height / 2 + zoom.pan.y) / zoom.scale,
})

/** The view a page hears: the document's point in the middle of the box, and the zoom. */
export const viewOf = (box: Size, plane: Plane, zoom: Zoom) => {
  const screen = onScreenOf(box, plane, zoom)
  return { x: screen.x + screen.width / 2, y: screen.y + screen.height / 2, zoom: zoom.scale }
}

/** The pan that brings the document's `point` to the middle of the box at `scale`. */
export const panTo = (plane: Plane, point: { x: number; y: number }, scale: number) => ({
  x: -(point.x - plane.origin.x - plane.box.width / 2) * scale,
  y: -(point.y - plane.origin.y - plane.box.height / 2) * scale,
})

/** What the minimap shows: every card and what is on screen, with room around them. */
export const minimapAreaOf = (board: Area, screen: Area): Area => {
  const x = Math.min(board.x, screen.x)
  const y = Math.min(board.y, screen.y)
  const width = Math.max(board.x + board.width, screen.x + screen.width) - x
  const height = Math.max(board.y + board.height, screen.y + screen.height) - y
  const room = Math.max(width, height) * 0.05
  return { height: height + room * 2, width: width + room * 2, x: x - room, y: y - room }
}

/**
 * How far past its cards a board moves, as a share of the box: half, so the
 * last card can come to the middle, and a fit can leave room above the first
 * for the controls, where the web's board pans as far as a reader drags it.
 */
const SLACK = 0.5

/** A board's pan and pinch: a tenth to eight times over its plane, a double tap in by two. */
export const useBoardZoom = (
  plane: Size,
  enabled: boolean,
  changed: (zoom: Zoom) => void,
  tapped: (at: { x: number; y: number }) => void,
): Zooming =>
  useZoom({
    changed,
    doubleStep: 2,
    enabled,
    item: plane,
    max: ZOOM_MAX,
    min: ZOOM_MIN,
    slack: SLACK,
    tapped,
  })

/** What the ruling is drawn from: the board as it stood, and where the document's zero landed then. */
export interface Ruled {
  readonly box: Size
  readonly color: string
  readonly dots: boolean
  readonly plane: Plane
  readonly settled: Zoom
  readonly size: number
  readonly thin: number
  readonly x: SharedValue<number>
  readonly y: SharedValue<number>
  readonly scale: SharedValue<number>
}

/** The ruling: lines or dots every `size` units of the document, three boxes wide, carried by the plane until it is drawn again. */
export const Ruling = (props: Ruled) => {
  const { box, color, dots, plane, settled, size, thin, x, y, scale } = props
  const cell = size * ruling(settled.scale)
  /* Where the document's zero lands, in the drawing's own points. */
  const zero = {
    x:
      box.width +
      box.width / 2 +
      settled.pan.x -
      (plane.origin.x + plane.box.width / 2) * settled.scale,
    y:
      box.height +
      box.height / 2 +
      settled.pan.y -
      (plane.origin.y + plane.box.height / 2) * settled.scale,
  }
  const style = useAnimatedStyle(() => {
    const by = scale.value / settled.scale
    return {
      transform: [
        { translateX: x.value - by * settled.pan.x },
        { translateY: y.value - by * settled.pan.y },
        { scale: by },
      ],
    }
  })
  const drawing = useMemo(() => {
    const { Circle, Defs, Pattern, Rect, Svg } = svg()
    const offset = { x: ((zero.x % cell) + cell) % cell, y: ((zero.y % cell) + cell) % cell }
    return (
      <Svg height={box.height * 3} width={box.width * 3}>
        <Defs>
          <Pattern
            height={cell}
            id="canvas-ruling"
            patternUnits="userSpaceOnUse"
            width={cell}
            x={offset.x}
            y={offset.y}
          >
            {dots ? (
              <Circle cx={cell / 2} cy={cell / 2} fill={color} r={thin} />
            ) : (
              <>
                <Rect fill={color} height={cell} width={thin} x={0} y={0} />
                <Rect fill={color} height={thin} width={cell} x={0} y={0} />
              </>
            )}
          </Pattern>
        </Defs>
        <Rect fill="url(#canvas-ruling)" height={box.height * 3} width={box.width * 3} />
      </Svg>
    )
  }, [box.height, box.width, cell, color, dots, thin, zero.x, zero.y])
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Reanimated.View
        style={[
          {
            height: box.height * 3,
            left: -box.width,
            position: 'absolute',
            top: -box.height,
            width: box.width * 3,
          },
          style,
        ]}
      >
        {drawing}
      </Reanimated.View>
    </View>
  )
}
