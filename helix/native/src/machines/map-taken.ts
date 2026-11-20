/**
 * What a phone's still map keeps its place names clear of, as boxes in the
 * map's box: **each count and dot a points layer draws in view**, each
 * marker, and the frame's controls and credit where they stand over the
 * map. A name across a count hides its figures, one across a dot or a
 * marker hides the place, and one under the controls is cut off by them.
 */
import {
  clusterRadiusOf,
  type MapDrawnPoint,
  type MapLayerSpec,
  type MapPlace,
  type MapView,
  type PlaceNameBox,
  pointsDrawn,
  type ScreenPoint,
  screenOf,
} from '@fusion.dev/helix-core/map'
import { useMemo, useState } from 'react'
import type { LayoutChangeEvent, LayoutRectangle } from 'react-native'

/** Where one place or count falls in view, or `undefined` where it is out of it by more than `radius`. */
export const inViewOf = (
  view: MapView,
  one: MapDrawnPoint,
  radius: number,
): ScreenPoint | undefined => {
  const point = screenOf(view, one.place)
  return point === undefined ||
    point[0] < -radius ||
    point[1] < -radius ||
    point[0] > view.width + radius ||
    point[1] > view.height + radius
    ? undefined
    : point
}

/** How wide a place apart is drawn at a zoom, and its edge, as the points layer's `interpolate` widens them from 8 to 15. */
export const dotAt = (zoom: number): { edge: number; radius: number } => {
  const share = Math.min(Math.max(zoom - 8, 0), 7) / 7
  return { edge: 1 + 0.5 * share, radius: 3 + 3 * share }
}

/** A square round a point, `reach` from its middle to each side. */
const around = ([x, y]: ScreenPoint, reach: number): PlaceNameBox => [
  x - reach,
  y - reach,
  x + reach,
  y + reach,
]

/**
 * The box round each count and each dot the points layers draw in view:
 * a count with its halo, a dot with its edge.
 */
export const pointBoxes = (view: MapView, specs: readonly MapLayerSpec[]): PlaceNameBox[] => {
  const { edge, radius } = dotAt(view.zoom)
  const dot = radius + edge / 2
  return specs.flatMap((spec) =>
    spec.kind !== 'points'
      ? []
      : pointsDrawn(spec, view.zoom).flatMap((one): PlaceNameBox[] => {
          const reach = one.kind === 'cluster' ? clusterRadiusOf(one.count) + 6 : dot
          const at = inViewOf(view, one, reach)
          return at === undefined ? [] : [around(at, reach)]
        }),
  )
}

/**
 * Where a marker stands round its place: its box's offset from the point
 * its place falls on, and its size, as its host was laid out. The offset
 * holds at every view, so its box follows the view before the marker is
 * laid out again.
 */
export interface MarkerStand {
  readonly height: number
  readonly place: MapPlace
  readonly width: number
  /** How far its box's left edge is from the place's point. */
  readonly x: number
  /** How far its box's top edge is from the place's point. */
  readonly y: number
}

/** A marker's stand from its host's layout, laid out where its place fell at `at`. */
export const standOf = (
  place: MapPlace,
  at: ScreenPoint,
  { height, width, x, y }: LayoutRectangle,
): MarkerStand => ({ height, place, width, x: x - at[0], y: y - at[1] })

/** Whether two stands are the same to a tenth of a point, so a layout that moved nothing changes nothing. */
export const sameStand = (a: MarkerStand | undefined, b: MarkerStand | undefined): boolean =>
  a === b ||
  (a !== undefined &&
    b !== undefined &&
    a.place.lat === b.place.lat &&
    a.place.lng === b.place.lng &&
    [a.x - b.x, a.y - b.y, a.width - b.width, a.height - b.height].every(
      (apart) => Math.abs(apart) < 0.1,
    ))

/** The box of each marker at a view. */
export const standBoxes = (view: MapView, stands: Iterable<MarkerStand>): PlaceNameBox[] =>
  [...stands].flatMap((one) => {
    const at = screenOf(view, one.place)
    if (at === undefined) {
      return []
    }
    const left = at[0] + one.x
    const top = at[1] + one.y
    return [[left, top, left + one.width, top + one.height] as const]
  })

/** A box laid out, as left, top, right and bottom, moved by `by`. */
const boxOf = (
  { height, width, x, y }: LayoutRectangle,
  by: { readonly x: number; readonly y: number },
): PlaceNameBox => [x - by.x, y - by.y, x - by.x + width, y - by.y + height]

const sameBox = (a: PlaceNameBox | undefined, b: PlaceNameBox | undefined): boolean =>
  a === b ||
  (a !== undefined && b !== undefined && a.every((side, at) => Math.abs(side - (b[at] ?? 0)) < 0.1))

/** What the frame lays out over its map, by the part each box is. */
interface Laid {
  readonly attribution?: LayoutRectangle
  readonly controls?: LayoutRectangle
  readonly viewport?: LayoutRectangle
}

/**
 * **The frame's controls and its credit, as boxes in the map's box**, from
 * their layouts: the controls stand in the viewport, and the credit in the
 * region, under or over the viewport, which is moved by where the viewport
 * stands in the region. A credit in its strip under the map falls outside
 * the map's box and takes none of it.
 */
export const useChromeBoxes = () => {
  const [laid, setLaid] = useState<Laid>({})
  const layOut = (part: keyof Laid) => (event: LayoutChangeEvent) => {
    const now = event.nativeEvent.layout
    setLaid((was) => {
      const had = was[part]
      return had !== undefined && sameBox(boxOf(had, { x: 0, y: 0 }), boxOf(now, { x: 0, y: 0 }))
        ? was
        : { ...was, [part]: now }
    })
  }
  const boxes = useMemo(() => {
    const found: PlaceNameBox[] = []
    if (laid.controls !== undefined) {
      found.push(boxOf(laid.controls, { x: 0, y: 0 }))
    }
    if (laid.attribution !== undefined && laid.viewport !== undefined) {
      found.push(boxOf(laid.attribution, laid.viewport))
    }
    return found
  }, [laid])
  return {
    attribution: layOut('attribution'),
    boxes,
    controls: layOut('controls'),
    viewport: layOut('viewport'),
  }
}
