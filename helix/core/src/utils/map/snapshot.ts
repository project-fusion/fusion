/*
 * A still map from vector tiles: which of the tiles' layers it draws and in
 * what, which tiles a view needs, and each feature as a path on the screen
 * through MapLibre's camera. The web's `mapSnapshot` draws a page's first
 * paint from these, and a phone's still picture draws its map from them
 * where MapLibre Native is not in the app.
 */

import { cameraOf, type MapCamera, type MapView, type ScreenPoint } from './camera.js'

/** The token a snapshot layer's color is the land moved toward. */
export type SnapshotToward = 'foreground' | 'info' | 'primary' | 'success'

/**
 * One layer of a snapshot: which of the tiles' layers it draws, which of its
 * features, and in what. **The same as `mapLibreStyle`'s layer of the same
 * `id`**, its color the land moved toward a token by the same amount and its
 * width the same at every zoom, which the snapshot's spec holds it to, so the
 * picture a page paints first is the map the renderer then draws.
 */
export interface SnapshotLayer {
  /** Only features of these classes. */
  classes?: readonly string[]
  /** How far the land is moved toward `toward`, from 0 to 1. */
  amount: number
  /** The feature classes left out. */
  except?: readonly string[]
  id: string
  kind: 'fill' | 'line'
  /** The zoom it starts at, as the style's layer does. */
  minzoom?: number
  /** Whether a feature in a tunnel is left out, as the style leaves it. */
  overground?: boolean
  /**
   * The smallest a shape is drawn, as the area of the box around it on the
   * screen, in square pixels. A city's buildings are most of the weight of a
   * street map and the least of what a first paint needs, and the renderer
   * draws the small ones over it a moment later.
   */
  smallest?: number
  /** The tiles' layer it reads, in the OpenMapTiles schema. */
  source: string
  toward: SnapshotToward
  /** A line's width at two zooms, in pixels, widened between them as the style widens it. */
  width?: readonly [readonly [number, number], readonly [number, number]]
}

/**
 * What a snapshot draws, bottom to top: the ground, the water, the buildings
 * and the roads. The labels, the landmarks and the signs are left to the
 * renderer, which places them where they do not collide; a picture that drew
 * them would draw them where the renderer then would not.
 */
export const SNAPSHOT_LAYERS: readonly SnapshotLayer[] = [
  {
    amount: 0.096,
    classes: ['wood', 'grass', 'wetland'],
    id: 'landcover',
    kind: 'fill',
    source: 'landcover',
    toward: 'success',
  },
  {
    amount: 0.16,
    except: ['historic'],
    id: 'park',
    kind: 'fill',
    source: 'park',
    toward: 'success',
  },
  { amount: 0.3, id: 'water', kind: 'fill', overground: true, source: 'water', toward: 'info' },
  {
    amount: 0.3,
    id: 'waterway',
    kind: 'line',
    overground: true,
    source: 'waterway',
    toward: 'info',
    width: [
      [8, 0.5],
      [18, 6],
    ],
  },
  {
    amount: 0.07,
    id: 'building',
    kind: 'fill',
    minzoom: 13,
    smallest: 400,
    source: 'building',
    toward: 'foreground',
  },
  {
    amount: 0.1,
    classes: ['minor', 'service'],
    id: 'road-minor',
    kind: 'line',
    minzoom: 12,
    overground: true,
    source: 'transportation',
    toward: 'foreground',
    width: [
      [12, 0.5],
      [18, 10],
    ],
  },
  {
    amount: 0.16,
    classes: ['secondary', 'tertiary'],
    id: 'road-secondary',
    kind: 'line',
    minzoom: 10,
    overground: true,
    source: 'transportation',
    toward: 'foreground',
    width: [
      [10, 0.5],
      [18, 14],
    ],
  },
  {
    amount: 0.4,
    classes: ['primary', 'trunk'],
    id: 'road-major',
    kind: 'line',
    minzoom: 8,
    overground: true,
    source: 'transportation',
    toward: 'primary',
    width: [
      [8, 0.5],
      [18, 16],
    ],
  },
  {
    amount: 0.6,
    classes: ['motorway'],
    id: 'road-motorway',
    kind: 'line',
    minzoom: 5,
    overground: true,
    source: 'transportation',
    toward: 'primary',
    width: [
      [5, 0.5],
      [18, 18],
    ],
  },
]

/** A width between two zooms as MapLibre interpolates it: exponentially, by 1.5 a zoom. */
export const widthAt = (
  [[z0, w0], [z1, w1]]: readonly [readonly [number, number], readonly [number, number]],
  zoom: number,
): number => {
  if (zoom <= z0) {
    return w0
  }
  if (zoom >= z1) {
    return w1
  }
  const t = (1.5 ** (zoom - z0) - 1) / (1.5 ** (z1 - z0) - 1)
  return w0 + t * (w1 - w0)
}

/** A snapshot layer's line width at a zoom, 1 where it has none. */
export const snapshotWidth = (layer: SnapshotLayer, zoom: number): number =>
  layer.width ? widthAt(layer.width, zoom) : 1

/** How near a point is kept to the line it was simplified onto, in pixels. */
const TOLERANCE = 0.8

/**
 * The shortest line drawn, in pixels from end to end: the service roads and
 * driveways a street map is thick with, which weigh as much as its streets
 * and read as texture a moment before the renderer draws them anyway.
 */
const SHORTEST = 12

/** How far a feature's box may lie outside the view and still be drawn, in pixels. */
const MARGIN = 16

/**
 * Douglas-Peucker on screen points: the fewest that stay within `TOLERANCE`
 * of the line. **A ring that closes on its start** measures from that one
 * point, since a line from a point to itself has no length to measure from,
 * and a closed shape measured that way lost every corner it had.
 */
export const simplified = (points: ScreenPoint[]): ScreenPoint[] => {
  if (points.length < 3) {
    return points
  }
  const kept = new Uint8Array(points.length)
  kept[0] = 1
  kept[points.length - 1] = 1
  const stack: [number, number][] = [[0, points.length - 1]]
  while (stack.length > 0) {
    const [from, to] = stack.pop() as [number, number]
    const [ax, ay] = points[from] as ScreenPoint
    const [bx, by] = points[to] as ScreenPoint
    const length = Math.hypot(bx - ax, by - ay)
    let farthest = -1
    let at = -1
    for (let index = from + 1; index < to; index++) {
      const [px, py] = points[index] as ScreenPoint
      const away =
        length === 0
          ? Math.hypot(px - ax, py - ay)
          : Math.abs((bx - ax) * (ay - py) - (ax - px) * (by - ay)) / length
      if (away > farthest) {
        farthest = away
        at = index
      }
    }
    if (farthest > TOLERANCE) {
      kept[at] = 1
      stack.push([from, at], [at, to])
    }
  }
  return points.filter((_, index) => kept[index] === 1)
}

/** The tiles a view is drawn from: the zoom they are asked at, and each by its column and row. */
export interface SnapshotTiles {
  readonly camera: MapCamera
  /** The zoom the tiles are asked at. */
  readonly depth: number
  /** How wide a tile is drawn at the view's zoom, in pixels. */
  readonly span: number
  /**
   * Each tile, by where it is drawn: a view across the antimeridian wants
   * the tiles past the world's edge drawn there, and `tileAddress` wraps one
   * only as it is asked for.
   */
  readonly wanted: readonly [number, number][]
}

/**
 * The tiles a view needs: **at the view's zoom, as deep as the tiles go**, and
 * shallower where a steep tilt reaches so far toward the horizon that the
 * view would ask for more than `most`.
 */
export const snapshotTiles = (view: MapView, deepest = 14, most = 40): SnapshotTiles => {
  const camera = cameraOf(view)
  const corners: ScreenPoint[] = [
    [0, 0],
    [view.width, 0],
    [0, view.height],
    [view.width, view.height],
  ]
  const ground = corners.map((corner) => camera.toWorld(corner))
  let depth = Math.max(0, Math.min(deepest, Math.floor(view.zoom)))
  const covering = (at: number): [number, number][] => {
    const span = camera.size / 2 ** at
    const xs = ground.map(([x]) => Math.floor(x / span))
    const ys = ground.map(([, y]) => Math.floor(y / span))
    const count = 2 ** at
    const wanted: [number, number][] = []
    for (let x = Math.min(...xs); x <= Math.max(...xs); x++) {
      for (let y = Math.max(0, Math.min(...ys)); y <= Math.min(count - 1, Math.max(...ys)); y++) {
        wanted.push([x, y])
      }
    }
    return wanted
  }
  let wanted = covering(depth)
  while (wanted.length > most && depth > 0) {
    depth -= 1
    wanted = covering(depth)
  }
  return { camera, depth, span: camera.size / 2 ** depth, wanted }
}

/** A tile's address in a TileJSON template, its column wrapped round the world. */
export const tileAddress = (template: string, depth: number, [x, y]: [number, number]): string => {
  const count = 2 ** depth
  return template
    .replace('{z}', String(depth))
    .replace('{x}', String(((x % count) + count) % count))
    .replace('{y}', String(y))
}

/** Whether a snapshot layer draws a feature of the tiles: its kind, its class, and whether it is in a tunnel. */
export const snapshotDraws = (
  layer: SnapshotLayer,
  feature: { readonly properties: Readonly<Record<string, unknown>>; readonly type: number },
): boolean => {
  const kind = String(feature.properties.class ?? '')
  return !(
    feature.type !== (layer.kind === 'fill' ? 3 : 2) ||
    (layer.classes && !layer.classes.includes(kind)) ||
    layer.except?.includes(kind) ||
    (layer.overground && feature.properties.brunnel === 'tunnel')
  )
}

/**
 * One feature as relative path commands in whole pixels, or nothing where it
 * is off the view, smaller than `smallest`, or a line shorter than a few
 * pixels.
 */
export const snapshotPath = (
  tiles: SnapshotTiles,
  view: MapView,
  lines: readonly (readonly { readonly x: number; readonly y: number }[])[],
  [tx, ty]: readonly [number, number],
  extent: number,
  closed: boolean,
  smallest: number,
): string => {
  const { camera, span } = tiles
  let path = ''
  for (const ring of lines) {
    const points: ScreenPoint[] = []
    for (const point of ring) {
      const on = camera.toScreen([(tx + point.x / extent) * span, (ty + point.y / extent) * span])
      if (on) {
        points.push(on)
      }
    }
    if (points.length < 2) {
      continue
    }
    const xs = points.map(([x]) => x)
    const ys = points.map(([, y]) => y)
    if (
      Math.max(...xs) < -MARGIN ||
      Math.min(...xs) > view.width + MARGIN ||
      Math.max(...ys) < -MARGIN ||
      Math.min(...ys) > view.height + MARGIN ||
      (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys)) < smallest ||
      (!closed &&
        Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) < SHORTEST)
    ) {
      continue
    }
    /* Whole pixels, each from the last, which is most of what makes a
       street map small enough to send with the page. */
    let [lastX, lastY] = [0, 0]
    simplified(points).forEach(([x, y], index) => {
      const [px, py] = [Math.round(x), Math.round(y)]
      if (index === 0) {
        path += `M${px} ${py}`
      } else if (px !== lastX || py !== lastY) {
        path += `l${px - lastX} ${py - lastY}`
      }
      ;[lastX, lastY] = [px, py]
    })
    if (closed) {
      path += 'z'
    }
  }
  return path
}
