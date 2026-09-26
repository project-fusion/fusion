/**
 * Framing a map around its places, shared by the Maps page and the theme
 * builder's Map layout, which put a panel over a map the same way and would
 * otherwise each have to learn the same two things about it.
 */

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
