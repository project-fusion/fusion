/**
 * Where a point on the drawn screen lands on the device, with the picture
 * turned by `rotation`.
 *
 * **The device's units are its own way up.** A source that sends frames in the
 * device's natural orientation, a phone's portrait, keeps sending them that
 * way while the device is turned, and the frame turns the picture to show it.
 * A tap on the turned picture still has to reach the device at the point it
 * names in its own orientation, so every point is turned back before it is
 * sent, and every point drawn from the device is turned forward.
 *
 * Points here are fractions of a box, from `0` at the left and top to `1` at
 * the right and bottom, so the arithmetic needs no sizes.
 */

/** A point as a fraction of a box, across and down. */
export interface Fraction {
  /** Across, from `0` at the left edge to `1` at the right. */
  u: number
  /** Down, from `0` at the top edge to `1` at the bottom. */
  v: number
}

/**
 * How many quarter turns clockwise a rotation in degrees is, from `0` to `3`.
 * A rotation between quarters goes to the nearest one, and a negative one
 * turns the other way.
 */
export const quarterTurns = (degrees: number): 0 | 1 | 2 | 3 => {
  if (!Number.isFinite(degrees)) {
    return 0
  }
  return (((Math.round(degrees / 90) % 4) + 4) % 4) as 0 | 1 | 2 | 3
}

/**
 * A point on the drawn picture, turned back to the device's own way up.
 * The picture is turned `turns` quarters clockwise from the device.
 */
export const unturn = ({ u, v }: Fraction, turns: number): Fraction => {
  switch (turns) {
    case 1:
      return { u: v, v: 1 - u }
    case 2:
      return { u: 1 - u, v: 1 - v }
    case 3:
      return { u: 1 - v, v: u }
    default:
      return { u, v }
  }
}

/** A point on the device, turned forward to where it is drawn. */
export const turn = ({ u, v }: Fraction, turns: number): Fraction => {
  switch (turns) {
    case 1:
      return { u: 1 - v, v: u }
    case 2:
      return { u: 1 - u, v: 1 - v }
    case 3:
      return { u: v, v: 1 - u }
    default:
      return { u, v }
  }
}

/**
 * A distance on the drawn picture, turned back to the device's own way up.
 * A distance turns as a point does and keeps no origin, so a scroll down a
 * picture turned a quarter clockwise is a scroll toward the device's right,
 * whose left edge is drawn along the top.
 */
export const unturnDistance = ({ u, v }: Fraction, turns: number): Fraction => {
  switch (turns) {
    case 1:
      return { u: v, v: -u }
    case 2:
      return { u: -u, v: -v }
    case 3:
      return { u: -v, v: u }
    default:
      return { u, v }
  }
}
