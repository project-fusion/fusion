import type { MapPlace } from '../connect-map/index.js'

/**
 * Where a map is looking and how big it is drawn: what MapLibre is given as
 * `center`, `zoom`, `pitch` and `bearing`, and the box it draws in.
 */
export interface MapView {
  /** Degrees clockwise from north the map is turned. 0 by default. */
  bearing?: number | undefined
  center: MapPlace
  /** The box's height in CSS pixels. */
  height: number
  /** Degrees the map is tilted back from looking straight down. 0 by default. */
  pitch?: number | undefined
  /** The box's width in CSS pixels. */
  width: number
  zoom: number
}

/** A point on the screen, in CSS pixels from the box's top left. */
export type ScreenPoint = [number, number]

/** How wide the world is at zoom 0, in pixels: MapLibre's tile size. */
const WORLD = 512

/** MapLibre's field of view, which sets how far the camera stands from what it looks at. */
const FIELD_OF_VIEW = 0.6435011087932844

/** Where a place falls on the world at a width of `size` pixels, in Web Mercator. */
export const worldOf = (place: MapPlace, size: number): ScreenPoint => {
  const sine = Math.sin((place.lat * Math.PI) / 180)
  return [
    ((place.lng + 180) / 360) * size,
    (0.5 - Math.log((1 + sine) / (1 - sine)) / (4 * Math.PI)) * size,
  ]
}

/** A camera for a view: the world to the screen, the screen back to the ground, and the world's width. */
export interface MapCamera {
  /** A point on the world at `size` pixels wide, on the screen, or `undefined` where it is behind the camera. */
  toScreen(world: ScreenPoint): ScreenPoint | undefined
  /** A point on the screen, where it meets the ground, on the world at `size` pixels wide. */
  toWorld(screen: ScreenPoint): ScreenPoint
  /** How wide the world is at the view's zoom, in pixels. */
  size: number
}

/**
 * **MapLibre's camera, for drawing what it would draw.** The world is turned
 * by the bearing about the view's center and tilted back by the pitch, then
 * seen in perspective from where MapLibre stands its camera: half the box's
 * height over the tangent of half the field of view. A tilted map is taller
 * at its foot than at its head, and parallel streets lean toward the
 * horizon, as they do in the renderer, so what is drawn from this lines up
 * with what the renderer draws once it has loaded.
 *
 * The camera is centered, so a page that gives MapLibre `padding` moves the
 * center it gives here to match.
 */
export const cameraOf = (view: MapView): MapCamera => {
  const size = WORLD * 2 ** view.zoom
  const [cx, cy] = worldOf(view.center, size)
  const turn = ((view.bearing ?? 0) * Math.PI) / 180
  const tilt = ((view.pitch ?? 0) * Math.PI) / 180
  const distance = (0.5 * view.height) / Math.tan(FIELD_OF_VIEW / 2)
  return {
    size,
    toScreen: ([wx, wy]) => {
      const across = (wx - cx) * Math.cos(turn) + (wy - cy) * Math.sin(turn)
      const toward = -(wx - cx) * Math.sin(turn) + (wy - cy) * Math.cos(turn)
      const depth = distance - toward * Math.sin(tilt)
      /* Behind the camera, or so near the horizon it would be drawn at infinity. */
      if (depth < distance * 0.05) {
        return undefined
      }
      return [
        view.width / 2 + (distance * across) / depth,
        view.height / 2 + (distance * toward * Math.cos(tilt)) / depth,
      ]
    },
    toWorld: ([sx, sy]) => {
      const x = sx - view.width / 2
      /* **Held just short of the horizon.** Past about 71.6 degrees of tilt a
         box's top corners look above it, where the ground is behind the
         camera: a corner at 75 degrees landed 3,000 pixels behind the view,
         and the tiles asked for were the wrong ones. */
      const horizon = tilt > 0 ? -distance / Math.tan(tilt) : -Infinity
      const y = Math.max(sy - view.height / 2, horizon * 0.95)
      const toward = (y * distance) / (distance * Math.cos(tilt) + y * Math.sin(tilt))
      const across = (x * (distance - toward * Math.sin(tilt))) / distance
      return [
        cx + across * Math.cos(turn) - toward * Math.sin(turn),
        cy + across * Math.sin(turn) + toward * Math.cos(turn),
      ]
    },
  }
}
