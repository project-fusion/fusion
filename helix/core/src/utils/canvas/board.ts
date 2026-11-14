/*
 * A board's numbers, which the web's board and a phone's both read: the room
 * the plane keeps around the cards, how far the board zooms, the zoom the
 * ruling is drawn at, the arrowheads a connection carries, where a card sits
 * on the plane, and the view a fit lands on.
 */

import { type CanvasEdge, type CanvasNode, extent } from './document.js'

/**
 * The breathing room the plane keeps around the document's own extent.
 *
 * **A board drawn exactly to its extent clips what sits outside it**, and two
 * things do: a group's name, which is drawn above the box it names, and a
 * connector, whose curve bows past the cards it joins. The margin is the same on
 * every side and in the document's own units, so it scales with the zoom like
 * everything else.
 */
export const MARGIN = 32

/**
 * How far out and how far in the board zooms.
 *
 * **A tenth to eight times.** A quarter was too near to see a large board
 * whole, and four times too far to read what a small card holds, a chart or a
 * picture, at the size it was worth drawing.
 */
export const ZOOM_MIN = 0.1
export const ZOOM_MAX = 8

/**
 * The least the automatic fit zooms out to: a card's 13 pixel text draws at
 * about 10 pixels and a 12 pixel name at 9. Fitted whole, a five-card board in
 * a 280 pixel column landed at 0.36 and drew its text at 4.7 pixels, and the
 * minimap example's board at 0.11 and 1.4. **0.75, a step up from 0.6**, which
 * drew the preview's names at 7.2 pixels at 390 wide, measured November 3,
 * 2026, and read as a picture of a board more than as one. The reader can
 * still zoom out to `ZOOM_MIN`.
 */
export const FIT_MIN = 0.75

/**
 * The zoom the ruling is drawn at, which steps by doubling as the board zooms
 * out so the lines stay far enough apart to be lines.
 *
 * At a tenth, a ruling every 32 units is a line every three pixels, which reads
 * as a gray wash rather than a grid. Doubling the spacing each time it would
 * fall below half keeps every line the coarser ruling draws on one the finer
 * ruling drew, so a card on a line stays on a line.
 */
export const ruling = (zoom: number): number =>
  zoom >= 0.5 ? zoom : zoom * 2 ** Math.ceil(Math.log2(0.5 / zoom))

/** Which ends of a connection carry an arrowhead: the end it arrives at unless it says not. */
export const heads = (edge: CanvasEdge): { start: boolean; end: boolean } => ({
  end: (edge.toEnd ?? 'arrow') === 'arrow',
  start: edge.fromEnd === 'arrow',
})

/** A connection's own key: its name, or the two cards it joins where it has none. */
export const edgeKeyBase = (edge: CanvasEdge): string =>
  `edge:${edge.id || `${edge.fromNode}->${edge.toNode}`}`

/** A card moved onto the plane, whose corner is `origin` in the document's units. */
export const onPlane = (node: CanvasNode, origin: { x: number; y: number }): CanvasNode => ({
  ...node,
  x: node.x - origin.x,
  y: node.y - origin.y,
})

/** The plane the cards are drawn on: its corner in the document's units, and its size. */
export const planeOf = (
  nodes: CanvasNode[],
): { origin: { x: number; y: number }; box: { width: number; height: number } } => {
  const drawn = extent(nodes)
  return {
    box: { height: drawn.height + MARGIN * 2, width: drawn.width + MARGIN * 2 },
    origin: { x: drawn.x - MARGIN, y: drawn.y - MARGIN },
  }
}

/**
 * The view that fits a plane `whole` into the room `free`: never zoomed in
 * past its own size, never out past `FIT_MIN`, centered along each side it
 * fits, and from its start along a side it does not, so the first cards are
 * the ones in view. `x` and `y` are where the plane's corner lands in the box.
 */
export const fitted = (
  whole: { width: number; height: number },
  free: { x: number; y: number; width: number; height: number },
): { x: number; y: number; zoom: number } => {
  const zoom = Math.max(Math.min(1, free.width / whole.width, free.height / whole.height), FIT_MIN)
  const along = (room: number, length: number, from: number): number =>
    length * zoom > room ? from : from + (room - length * zoom) / 2
  return {
    x: along(free.width, whole.width, free.x),
    y: along(free.height, whole.height, free.y),
    zoom,
  }
}
