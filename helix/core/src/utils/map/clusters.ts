/*
 * A points layer's places gathered into counts where they would meet, as
 * MapLibre gathers a clustering GeoJSON source: the same radius, the same
 * deepest zoom, and the same greedy pass from the deepest zoom up, so a
 * phone's still picture and the places it reaches count what the web's
 * renderer counts.
 */

import type { MapLayerSpec, MapPlace } from './driver.js'

/** How near places may draw before they are one count, in pixels: the web's driver's `clusterRadius`. */
export const CLUSTER_RADIUS = 44

/** The deepest zoom that gathers places, past which each is drawn: the web's driver's `clusterMaxZoom`. */
export const CLUSTER_MAX_ZOOM = 14

/** How wide a tile is in pixels, which the radius is a share of. */
const TILE = 512

/** One place or one count, as a renderer draws it at a zoom. */
export type MapDrawnPoint =
  | {
      /** Where it is in the layer's list. */
      readonly index: number
      readonly kind: 'point'
      readonly place: MapPlace
    }
  | {
      /** How many places it counts. */
      readonly count: number
      /** Its key while the layer's places stay the same: `c:` and a number, as the web keys a count. */
      readonly key: string
      readonly kind: 'cluster'
      /** Where each place it counts is in the layer's list. */
      readonly members: readonly number[]
      /** Where it is drawn: the middle of its places. */
      readonly place: MapPlace
      /** The zoom it comes apart at, which a press on it zooms to. */
      readonly zoom: number
    }

/** A node of one zoom's pass: a place, or a count of the nodes of the zoom below it. */
interface Node {
  readonly count: number
  /**
   * The zoom it was made at, where it is a count, which it comes apart one
   * deeper than: a count is made of two nodes or more, so the zoom below
   * draws it as more than one, as MapLibre's `getClusterExpansionZoom`
   * answers for a source of two points or more a count.
   */
  readonly made: number
  readonly id: number
  readonly members: readonly number[]
  /** Where it is, on the world from 0 to 1, Web Mercator. */
  readonly x: number
  readonly y: number
}

/** The places as Web Mercator from 0 to 1, as the clusterer measures them. */
const projected = (place: MapPlace): [number, number] => {
  const sine = Math.sin((place.lat * Math.PI) / 180)
  const y = 0.5 - (0.25 * Math.log((1 + sine) / (1 - sine))) / Math.PI
  return [place.lng / 360 + 0.5, Math.min(Math.max(y, 0), 1)]
}

/** A place back from Web Mercator. */
const placeOf = (x: number, y: number): MapPlace => ({
  lat: (360 * Math.atan(Math.exp((180 - y * 360) * (Math.PI / 180)))) / Math.PI - 90,
  lng: (x - 0.5) * 360,
})

/**
 * One zoom's pass over the nodes of the zoom below it, **in their order**:
 * each node not yet taken takes every node within the radius not yet taken,
 * and two or more make a count at their weighted middle; a node with none
 * near stays as it is.
 */
const gathered = (nodes: readonly Node[], zoom: number, next: () => number): Node[] => {
  const reach = CLUSTER_RADIUS / (TILE * 2 ** zoom)
  const cells = new Map<string, number[]>()
  const cellOf = (x: number, y: number) => `${Math.floor(x / reach)}:${Math.floor(y / reach)}`
  nodes.forEach((node, at) => {
    const key = cellOf(node.x, node.y)
    const had = cells.get(key)
    if (had) {
      had.push(at)
    } else {
      cells.set(key, [at])
    }
  })
  const taken = new Uint8Array(nodes.length)
  const out: Node[] = []
  nodes.forEach((node, at) => {
    if (taken[at] === 1) {
      return
    }
    taken[at] = 1
    const cx = Math.floor(node.x / reach)
    const cy = Math.floor(node.y / reach)
    const near: number[] = []
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (const other of cells.get(`${cx + dx}:${cy + dy}`) ?? []) {
          const one = nodes[other] as Node
          if (
            taken[other] === 0 &&
            (one.x - node.x) ** 2 + (one.y - node.y) ** 2 <= reach * reach
          ) {
            near.push(other)
          }
        }
      }
    }
    if (near.length === 0) {
      out.push(node)
      return
    }
    near.sort((a, b) => a - b)
    let count = node.count
    let wx = node.x * node.count
    let wy = node.y * node.count
    const members = [...node.members]
    for (const other of near) {
      taken[other] = 1
      const one = nodes[other] as Node
      count += one.count
      wx += one.x * one.count
      wy += one.y * one.count
      members.push(...one.members)
    }
    out.push({
      count,
      id: next(),
      made: zoom,
      members,
      x: wx / count,
      y: wy / count,
    })
  })
  return out
}

/** Every zoom's nodes, from 0 to one past the deepest that gathers, read once for each list of places. */
const LEVELS = new WeakMap<readonly MapPlace[], Node[][]>()

const levelsOf = (points: readonly MapPlace[]): Node[][] => {
  const had = LEVELS.get(points)
  if (had) {
    return had
  }
  let id = 0
  const next = () => id++
  const deepest: Node[] = points.map((place, at) => {
    const [x, y] = projected(place)
    return { count: 1, id: -1, made: CLUSTER_MAX_ZOOM + 1, members: [at], x, y }
  })
  const levels: Node[][] = []
  levels[CLUSTER_MAX_ZOOM + 1] = deepest
  for (let zoom = CLUSTER_MAX_ZOOM; zoom >= 0; zoom--) {
    levels[zoom] = gathered(levels[zoom + 1] as Node[], zoom, next)
  }
  LEVELS.set(points, levels)
  return levels
}

/**
 * What a points layer draws at a zoom: **its counts and its places apart**
 * where it clusters, each place where it does not. The tiles a renderer
 * draws are asked at the zoom below the view's, so the counts are too.
 */
export const pointsDrawn = (
  spec: Pick<MapLayerSpec, 'cluster' | 'points'>,
  zoom: number,
): MapDrawnPoint[] => {
  if (spec.cluster !== true) {
    return spec.points.map((place, index) => ({ index, kind: 'point' as const, place }))
  }
  const levels = levelsOf(spec.points)
  const level = Math.max(0, Math.min(CLUSTER_MAX_ZOOM + 1, Math.floor(zoom)))
  return (levels[level] as Node[]).map((node): MapDrawnPoint => {
    const place = placeOf(node.x, node.y)
    return node.count === 1
      ? {
          index: node.members[0] as number,
          kind: 'point',
          place: spec.points[node.members[0] as number] ?? place,
        }
      : {
          count: node.count,
          key: `c:${node.id}`,
          kind: 'cluster',
          members: node.members,
          place,
          zoom: node.made + 1,
        }
  })
}

/**
 * How wide a count is drawn, in pixels from its middle to its edge: the
 * points layer's step by how many it counts, as `pointsLayers` writes it.
 */
export const clusterRadiusOf = (count: number): number =>
  count >= 1000 ? 26 : count >= 100 ? 21 : count >= 25 ? 17 : 14

/** A count's figures as MapLibre abbreviates them: `1.2k` past a thousand. */
export const countAbbreviated = (count: number): string =>
  count >= 10_000
    ? `${Math.round(count / 1000)}k`
    : count >= 1000
      ? `${(Math.round(count / 100) / 10).toString()}k`
      : String(count)
