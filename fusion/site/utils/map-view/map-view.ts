/**
 * Framing a map around its places, shared by the Maps page and the theme
 * builder's Map layout, which put a panel over a map the same way and would
 * otherwise each have to learn the same two things about it.
 */
import { type MapColors, mapColorsFrom } from '@fusion.dev/helix-map'

/** A place as a map is framed around it. */
export interface Placed {
  lat: number
  lng: number
}

/** Camera padding, in pixels from each edge of the map. */
export interface Clearance {
  bottom: number
  left: number
  right: number
  top: number
}

/** The places' corners, west-south then east-north, as MapLibre takes a bounds. */
export const boundsOf = (places: readonly Placed[]): [[number, number], [number, number]] => [
  [Math.min(...places.map((one) => one.lng)), Math.min(...places.map((one) => one.lat))],
  [Math.max(...places.map((one) => one.lng)), Math.max(...places.map((one) => one.lat))],
]

/**
 * The part of the map a reader can see, as camera padding: where the panel
 * lies over it, the camera frames the places beside the panel rather than
 * under it, where a marker could take focus with nobody able to see it. The
 * top is deeper for the frame's own controls: they sit in its top corner, and
 * a band over them costs a phone much less of the map than a column beside
 * them would.
 *
 * **Measured on the map's own box**, not on `helix-map`, whose host is
 * `display: contents` and answers zero by zero.
 */
export const clearOf = (map: Element, panel: Element | null): Clearance => {
  const edge = 48
  const room = map.getBoundingClientRect()
  const over = panel?.getBoundingClientRect()
  const covers =
    over !== undefined &&
    over.left < room.right &&
    over.right > room.left &&
    over.top < room.bottom &&
    over.bottom > room.top
  return {
    bottom: edge,
    left: covers ? over.right - room.left + edge : edge,
    right: edge,
    top: edge * 3,
  }
}

/** The same five colors, which is when a restyle would draw nothing new. */
export const sameColors = (a: MapColors | undefined, b: MapColors): boolean =>
  a !== undefined &&
  a.foreground === b.foreground &&
  a.info === b.info &&
  a.primary === b.primary &&
  a.success === b.success &&
  a.surface === b.surface

/**
 * The page's colors where they can be read, or `null` while they cannot.
 *
 * **Not yet rather than never.** A stylesheet being swapped, which
 * development does on every edit and a page can do on its own, takes the
 * tokens away for a moment, and a restyle that landed in that moment threw
 * out of an animation frame with nobody to catch it. A caller waits a frame
 * and asks again; one that has waited long enough calls `mapColorsFrom`,
 * whose error says what is missing.
 */
export const colorsNow = (element: Element): MapColors | null => {
  try {
    return mapColorsFrom(element)
  } catch {
    return null
  }
}

/** How many frames to wait for the tokens before saying they are missing: a few seconds. */
export const PATIENCE = 180
