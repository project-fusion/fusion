/**
 * A light that travels a box's edge, for the families that draw one: the
 * Chat composer's focus and Border Beam's loop.
 *
 * The light is a soft spot in a gradient, cut to the edge by a mask, and its
 * place is two lengths the script moves. **The lengths are registered**, since
 * a gradient's position interpolates only once its properties are, and **the
 * lap is measured**, each side taking the share of the time its length is of
 * the edge, so the light moves at one speed all the way. A conic gradient
 * turned through a circle moves its light by angle, which on a box many times
 * wider than it is tall crawls along the long sides and races the corners.
 */

/** The names already registered, by any family. */
const registered = new Set<string>()

/**
 * Registers each name as a length, once, so the browser can animate it.
 *
 * **From script, because a sheet cannot.** An `@property` rule inside a shadow
 * root is ignored. A registration is the document's, so it reaches every
 * shadow root. Where the browser has no `registerProperty`, or on the server,
 * nothing is registered and the light does not travel.
 *
 * @param names The custom properties that carry the light's place.
 */
export function registerLengths(names: readonly string[]): void {
  if (typeof CSS === 'undefined' || !('registerProperty' in CSS)) {
    return
  }
  for (const name of names) {
    if (registered.has(name)) {
      continue
    }
    registered.add(name)
    try {
      CSS.registerProperty({ inherits: false, initialValue: '0px', name, syntax: '<length>' })
    } catch {
      // Registered already, by another copy of this module on the page.
    }
  }
}

/**
 * The keyframes of one lap of the light around a box `w` wide and `h` tall,
 * clockwise from its top-left corner, at one speed. None for a box with no
 * size.
 *
 * @param w The box's width, in pixels.
 * @param h The box's height, in pixels.
 * @param x The property that carries the light's place across.
 * @param y The property that carries the light's place down.
 * @param fade Whether the light comes up at the start of the lap and goes down
 *   at its end, for a lap that runs once. A light that loops keeps its strength.
 */
export function lapAround(w: number, h: number, x: string, y: string, fade: boolean): Keyframe[] {
  const edge = 2 * (w + h)
  if (edge === 0) {
    return []
  }
  const at = (left: number, top: number, offset: number): Keyframe => ({
    [x]: `${left}px`,
    [y]: `${top}px`,
    offset,
  })
  const corners = [
    at(0, 0, 0),
    at(w, 0, w / edge),
    at(w, h, (w + h) / edge),
    at(0, h, (2 * w + h) / edge),
    at(0, 0, 1),
  ]
  if (!fade) {
    return corners
  }
  const first = corners[0] as Keyframe
  const last = corners[4] as Keyframe
  return [
    { ...first, opacity: 0 },
    ...corners.slice(1, 4),
    { ...last, opacity: 0 },
    // Up quickly, and down over the last stretch, so the lap fades out where
    // it began rather than stopping there.
    { offset: 0.08, opacity: 1 },
    { offset: 0.82, opacity: 1 },
  ].sort((one, two) => (one.offset ?? 0) - (two.offset ?? 0))
}
