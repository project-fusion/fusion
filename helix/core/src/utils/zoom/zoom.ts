/**
 * Zooming into an item a viewer shows, and moving about it once zoomed: the
 * scale held to its range, the pan held so the item's edges never come inside
 * the viewer, and the point under a pinch or a press kept under it. Every
 * length is in pixels, or in a phone's points, measured from the middle of
 * the viewer, which is where the item scales from.
 *
 * **One set of numbers on both platforms.** The web's `ZoomController` and a
 * phone's pan and pinch driver both call these, so a pinch, a double press,
 * and a drag land where they land on the other.
 *
 * **Each function is a worklet**, marked so a phone's Reanimated runs it on
 * the UI thread under the finger, where nothing it calls may come from
 * elsewhere: the clamp is written out here for that reason. On the web the
 * mark is a string that does nothing.
 */

/** A distance from the middle of the viewer, or a point measured from it, in pixels. */
export interface Offset {
  x: number
  y: number
}

/** A scale and how far the item is moved from the middle of the viewer. */
export interface Zoom {
  readonly pan: Offset
  readonly scale: number
}

/** What a gesture under way started from: where its fingers met, and the zoom then. */
export interface ZoomStart {
  /** The point between the fingers, or under the one finger. */
  readonly at: Offset
  readonly pan: Offset
  readonly scale: number
  /** How far apart two fingers were, or 0 for one. */
  readonly spread: number
}

/* Held between `low` and `high`, with no `NaN` and no `-0`: a pan or a scale
   is written into a transform, which reads either as nothing. */
const held = (value: number, low: number, high: number): number => {
  'worklet'
  return Math.min(Math.max(value, low), high) || 0
}

/** A scale held between 1, the item at its own size, and `max`. */
export const clampScale = (scale: number, max: number): number => {
  'worklet'
  return held(scale, 1, Math.max(max, 1))
}

/**
 * How far a zoomed item may move, kept so its edges never come inside the
 * viewer's: at a scale of 2 in a box 400 wide, 200 either way.
 */
export const clampPan = (pan: Offset, scale: number, width: number, height: number): Offset => {
  'worklet'
  const x = ((scale - 1) * width) / 2
  const y = ((scale - 1) * height) / 2
  return { x: held(pan.x, -x, x), y: held(pan.y, -y, y) }
}

/**
 * Where the item moves to as its scale goes from `from` to `to`, so the point
 * under `at` stays under it. Both are measured from the middle of the viewer,
 * which is where the item scales from.
 */
export const zoomAt = (at: Offset, from: number, to: number, pan: Offset): Offset => {
  'worklet'
  return {
    x: at.x - ((at.x - pan.x) * to) / from,
    y: at.y - ((at.y - pan.y) * to) / from,
  }
}

/** The distance between two fingers. */
export const spread = (a: Offset, b: Offset): number => {
  'worklet'
  return Math.hypot(a.x - b.x, a.y - b.y)
}

/** The point halfway between two fingers. */
export const between = (a: Offset, b: Offset): Offset => {
  'worklet'
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

/**
 * The zoom two fingers give, `apart` from each other with `at` between them,
 * from where the pinch started: the scale grown as the fingers spread, held to
 * `max`, about the point they started at, and moved with them. The pan is not
 * yet held to the viewer.
 */
export const pinched = (from: ZoomStart, apart: number, at: Offset, max: number): Zoom => {
  'worklet'
  const scale = clampScale((from.scale * apart) / from.spread, max)
  const about = zoomAt(from.at, from.scale, scale, from.pan)
  return { pan: { x: about.x + at.x - from.at.x, y: about.y + at.y - from.at.y }, scale }
}

/** The pan one finger gives, at `at`, from where its drag started. Not yet held to the viewer. */
export const dragged = (from: ZoomStart, at: Offset): Offset => {
  'worklet'
  return { x: from.pan.x + at.x - from.at.x, y: from.pan.y + at.y - from.at.y }
}

/**
 * What a double press gives: all the way in to `max` about the point pressed,
 * or back to the item's own size where it was zoomed.
 */
export const doublePressed = (zoom: Zoom, at: Offset, max: number): Zoom => {
  'worklet'
  if (zoom.scale > 1) {
    return { pan: { x: 0, y: 0 }, scale: 1 }
  }
  const scale = clampScale(max, max)
  return { pan: zoomAt(at, zoom.scale, scale, zoom.pan), scale }
}

/** A point measured from a box's top left corner, measured from its middle instead. */
export const fromMiddle = (x: number, y: number, width: number, height: number): Offset => {
  'worklet'
  return { x: x - width / 2, y: y - height / 2 }
}

/** A scale as a whole percent, which is how a reader hears it: 1.5 is 150. */
export const percentOf = (scale: number): number => Math.round(scale * 100)
