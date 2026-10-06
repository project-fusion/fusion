/** A distance from the middle of the viewer, or a point measured from it, in pixels. */
export interface Offset {
  x: number
  y: number
}

const clamp = (value: number, low: number, high: number): number =>
  Math.min(Math.max(value, low), high) || 0

/** A scale held between 1, the item at its own size, and `max`. */
export const clampScale = (scale: number, max: number): number => clamp(scale, 1, Math.max(max, 1))

/**
 * How far a zoomed item may move, kept so its edges never come inside the
 * viewer's: at a scale of 2 in a box 400 wide, 200 either way.
 */
export const clampPan = (pan: Offset, scale: number, width: number, height: number): Offset => {
  const x = ((scale - 1) * width) / 2
  const y = ((scale - 1) * height) / 2
  return { x: clamp(pan.x, -x, x), y: clamp(pan.y, -y, y) }
}

/**
 * Where the item moves to as its scale goes from `from` to `to`, so the point
 * under `at` stays under it. Both are measured from the middle of the viewer,
 * which is where the item scales from.
 */
export const zoomAt = (at: Offset, from: number, to: number, pan: Offset): Offset => ({
  x: at.x - ((at.x - pan.x) * to) / from,
  y: at.y - ((at.y - pan.y) * to) / from,
})

/** The distance between two fingers. */
export const spread = (a: Offset, b: Offset): number => Math.hypot(a.x - b.x, a.y - b.y)

/** The point halfway between two fingers. */
export const between = (a: Offset, b: Offset): Offset => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
})

/** A scale as a whole percent, which is how a reader hears it: 1.5 is 150. */
export const percentOf = (scale: number): number => Math.round(scale * 100)
