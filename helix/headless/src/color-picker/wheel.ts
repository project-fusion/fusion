/** A box on the screen, as `getBoundingClientRect` gives one. */
export interface WheelBox {
  height: number
  left: number
  top: number
  width: number
}

/**
 * The hue at a point on a hue wheel: degrees clockwise from the top, 0 to
 * 359, the way React Aria's ColorWheel and every paint program lay hue out.
 *
 * Measured from the box's center, so a press anywhere in the wheel answers,
 * not only one on the ring: the ring is the target a reader aims at, and a
 * press a little inside it still means the hue in that direction. Clockwise
 * whatever the writing direction, since a circle has no line of text.
 */
export const hueAt = (x: number, y: number, box: WheelBox): number => {
  const across = x - (box.left + box.width / 2)
  const down = y - (box.top + box.height / 2)
  const degrees = Math.round((Math.atan2(across, -down) * 180) / Math.PI)
  return (degrees + 360) % 360
}
