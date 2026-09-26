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
 * The part of the map a reader can see, as camera padding: where a panel
 * lies over the map at its start, the camera frames the places beside it
 * rather than under it, where a marker could take focus with nobody able to
 * see it; where a bar lies over its foot, above it. The top is deeper for the
 * frame's own controls: they sit in its top corner, and a band over them
 * costs a phone much less of the map than a column beside them would.
 *
 * **Measured on the map's own box**, not on `helix-map`, whose host is
 * `display: contents` and answers zero by zero.
 */
export const clearOf = (map: Element, panel: Element | null, bar?: Element | null): Clearance => {
  const edge = 48
  const room = map.getBoundingClientRect()
  const over = (element: Element | null | undefined): DOMRect | undefined => {
    const box = element?.getBoundingClientRect()
    return box &&
      box.width > 0 &&
      box.left < room.right &&
      box.right > room.left &&
      box.top < room.bottom &&
      box.bottom > room.top
      ? box
      : undefined
  }
  const side = over(panel)
  const foot = over(bar)
  return {
    bottom: foot ? room.bottom - foot.top + edge / 2 : edge,
    left: side ? side.right - room.left + edge : edge,
    right: edge,
    top: edge * 3,
  }
}
