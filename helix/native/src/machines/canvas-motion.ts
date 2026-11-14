/**
 * How a phone's board moves: the box measured and the board fitted into it,
 * a tap read on the plane, the zoom controls and the pan pad, the view a
 * page hears once the board stands, and the minimap's press.
 *
 * **The fit is automatic until a reader moves the board**, as the web's is:
 * it lands as the box is first measured, and again at a new size while the
 * zoom is still the one it landed on.
 */

import type { CanvasNode } from '@fusion.dev/helix-core/canvas'
import { extent } from '@fusion.dev/helix-core/canvas'
import { formatMessage } from '@fusion.dev/helix-core/words'
import type { Zoom } from '@fusion.dev/helix-core/zoom'
import { useRef, useState } from 'react'
import type { LayoutChangeEvent } from 'react-native'
import type { Zooming } from '../drivers/zoom'
import { cardAt, type Line, lineAt } from './canvas-board'
import {
  type Cluster,
  fitZoom,
  type Plane,
  panTo,
  type Size,
  useBoardZoom,
  viewOf,
} from './canvas-view'
import { wordsIn } from './date-picker-read'

/** By how much a zoom control zooms in, and out again: a quarter, as the web's do. */
const STEP = 1.25

/** How far past a line a finger still takes it, in points on screen. */
const REACH = 12

/** A way the pan pad moves the board. */
export type Way = 'down' | 'end' | 'start' | 'up'

/** What a board's motion reads. */
export interface MotionSetup {
  readonly cluster: Cluster
  readonly lang: string
  readonly lines: readonly Line[]
  readonly nodes: readonly CanvasNode[]
  readonly panStep: number
  readonly plane: Plane
  readonly read: (name: string) => unknown
  /** Selects what a tap lands on, or nothing. */
  readonly select: (keys: readonly string[]) => void
  /** Says words in the live region. */
  readonly say: (words: string) => void
  /** Tells the page an event the board's binding names, where it names one. */
  readonly tell: (name: string, detail: Readonly<Record<string, unknown>>) => void
}

/** What a board's motion gives its parts. */
export interface Motion {
  readonly box: Size
  readonly bring: (point: { x: number; y: number }) => void
  readonly measure: (event: LayoutChangeEvent) => void
  readonly panWay: (to: Way) => void
  readonly settled: Zoom
  readonly zoom: Zooming
  readonly zoomBy: (by: number) => void
}

/** The card or the connection a tap at `at`, from the middle of the box, lands on. */
const tappedKey = (setup: MotionSetup, zoom: Zoom, at: { x: number; y: number }) => {
  const { lines, nodes, plane } = setup
  const point = {
    x: (at.x - zoom.pan.x) / zoom.scale + plane.box.width / 2,
    y: (at.y - zoom.pan.y) / zoom.scale + plane.box.height / 2,
  }
  const card = cardAt(nodes, plane.origin, point)
  const onCard = card !== undefined && card.type !== 'group'
  return onCard ? card.id : (lineAt(lines, point, REACH / zoom.scale)?.key ?? card?.id)
}

/** Hosts a board's motion. */
export const useBoardMotion = (setup: MotionSetup): Motion => {
  const [box, setBox] = useState<Size>({ height: 0, width: 0 })
  const [settled, setSettled] = useState<Zoom>({ pan: { x: 0, y: 0 }, scale: 1 })
  /* The zoom the last fit landed on, which a reader has not moved while the zoom is still it. */
  const landed = useRef<Zoom | undefined>(undefined)
  const latest = useRef(setup)
  latest.current = setup
  const changed = (next: Zoom) => {
    setSettled(next)
    if (box.width > 0) {
      latest.current.tell('onCanvasView', viewOf(box, latest.current.plane, next))
    }
  }
  const tapped = (at: { x: number; y: number }) => {
    const key = tappedKey(latest.current, zoom.zoom(), at)
    latest.current.select(key === undefined ? [] : [key])
  }
  const zoom = useBoardZoom(setup.plane.box, setup.nodes.length > 0, changed, tapped)
  const fit = (to: Size) => {
    const start = fitZoom(to, setup.plane.box, setup.cluster)
    if (start !== undefined) {
      zoom.place(start)
      landed.current = zoom.zoom()
    }
  }
  const measure = (event: LayoutChangeEvent) => {
    zoom.measure(event)
    const { height, width } = event.nativeEvent.layout
    if (width === box.width && height === box.height) {
      return
    }
    setBox({ height, width })
    const now = zoom.zoom()
    const was = landed.current
    const untouched =
      was === undefined ||
      (was.scale === now.scale && was.pan.x === now.pan.x && was.pan.y === now.pan.y)
    if (untouched) {
      fit({ height, width })
    }
  }
  const zoomBy = (by: number) => {
    zoom.zoomTo(zoom.zoom().scale * (by > 0 ? STEP : 1 / STEP))
    const percent = new Intl.NumberFormat(setup.lang || undefined, { style: 'percent' })
    const words = wordsIn(setup.read('zoomed-label'))
    setup.say(formatMessage(words, { zoom: percent.format(zoom.zoom().scale) }, setup.lang))
    setup.tell('onCanvasZoom', { by })
  }
  const panWay = (to: Way) => {
    const step = (box.width || extent([...setup.nodes]).width) * setup.panStep
    const by = {
      down: { x: 0, y: -step },
      end: { x: -step, y: 0 },
      start: { x: step, y: 0 },
      up: { x: 0, y: step },
    }[to]
    zoom.panBy(by)
    setup.tell('onCanvasPan', { by: setup.panStep, to })
  }
  const bring = (point: { x: number; y: number }) => {
    const now = zoom.zoom()
    const target = panTo(setup.plane, point, now.scale)
    zoom.panBy({ x: target.x - now.pan.x, y: target.y - now.pan.y })
  }
  return { box, bring, measure, panWay, settled, zoom, zoomBy }
}
