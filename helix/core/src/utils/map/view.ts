import { cameraOf, type MapView, worldOf } from './camera.js'
import type { MapBounds, MapPlace } from './driver.js'

/** Where a map looks before it is drawn: a place, a zoom, and the turn and tilt. */
export type MapAim = Omit<MapView, 'height' | 'width'>

/** How wide the world is at zoom 0, in pixels: MapLibre's tile size, as the camera's. */
const WORLD = 512

/** The deepest zoom a fit goes to, so one place is a street and not a doorstep. */
export const FIT_DEEPEST = 15

/** Where a map looks with nothing to frame: the whole world, flat. */
export const WORLD_AIM: MapAim = { bearing: 0, center: { lat: 20, lng: 0 }, pitch: 0, zoom: 1 }

/**
 * A view written as `lat,lng,zoom`, with the tilt and the turn after it where
 * they are given, as `view` writes one, or `undefined` where it is not one.
 */
export const aimOf = (written: string | undefined): MapAim | undefined => {
  const [lat, lng, zoom, pitch = 0, bearing = 0] = (written ?? '')
    .split(',')
    .map((one) => (one.trim() === '' ? Number.NaN : Number(one)))
  return [lat, lng, zoom, pitch, bearing].every(Number.isFinite)
    ? {
        bearing: bearing as number,
        center: { lat: lat as number, lng: lng as number },
        pitch: pitch as number,
        zoom: zoom as number,
      }
    : undefined
}

/** The corners of the stretch of the world every place lies in, or `undefined` where there are none. */
export const boundsOf = (places: readonly MapPlace[]): MapBounds | undefined => {
  const kept = places.filter((one) => Number.isFinite(one.lat) && Number.isFinite(one.lng))
  if (kept.length === 0) {
    return undefined
  }
  const lats = kept.map((one) => one.lat)
  const lngs = kept.map((one) => one.lng)
  return {
    northEast: { lat: Math.max(...lats), lng: Math.max(...lngs) },
    southWest: { lat: Math.min(...lats), lng: Math.min(...lngs) },
  }
}

/**
 * The view that frames `bounds` in a box `width` by `height`, `padding`
 * pixels in from each edge, flat and facing north: its middle, and the
 * deepest zoom that holds both corners, no deeper than `deepest`.
 */
export const fitted = (
  bounds: MapBounds,
  width: number,
  height: number,
  padding = 32,
  deepest = FIT_DEEPEST,
): MapAim => {
  const [west, north] = worldOf({ lat: bounds.northEast.lat, lng: bounds.southWest.lng }, WORLD)
  const [east, south] = worldOf({ lat: bounds.southWest.lat, lng: bounds.northEast.lng }, WORLD)
  const across = Math.max(east - west, 1e-9)
  const down = Math.max(south - north, 1e-9)
  const roomX = Math.max(width - padding * 2, 1)
  const roomY = Math.max(height - padding * 2, 1)
  const zoom = Math.min(deepest, Math.log2(Math.min(roomX / across, roomY / down)))
  const middle = ((west + east) / 2 / WORLD) * 360 - 180
  const y = Math.PI * (1 - (2 * (north + south)) / 2 / WORLD)
  const lat = (Math.atan(Math.sinh(y)) * 180) / Math.PI
  return { bearing: 0, center: { lat, lng: middle }, pitch: 0, zoom: Math.max(0, zoom) }
}

/**
 * The place a point on the screen falls on, in a view: what a pan by a share
 * of the box moves the middle to, and what a press on the still picture
 * lands on.
 */
export const placeAt = (view: MapView, x: number, y: number): MapPlace => {
  const camera = cameraOf(view)
  const [wx, wy] = camera.toWorld([x, y])
  const lng = (wx / camera.size) * 360 - 180
  const n = Math.PI * (1 - (2 * wy) / camera.size)
  return { lat: (Math.atan(Math.sinh(n)) * 180) / Math.PI, lng }
}

/** Where a place falls in a view, in pixels from the box's top left, or `undefined` behind the camera. */
export const screenOf = (view: MapView, place: MapPlace): [number, number] | undefined => {
  const camera = cameraOf(view)
  const at = camera.toScreen(worldOf(place, camera.size))
  return at === undefined ? undefined : [at[0], at[1]]
}

/** How many pixels a stretch of `meters` on the ground at `lat` is at `zoom`, in Web Mercator. */
export const metersAcross = (meters: number, lat: number, zoom: number): number =>
  (meters * WORLD * 2 ** zoom) / (40_075_016.686 * Math.cos((lat * Math.PI) / 180))
