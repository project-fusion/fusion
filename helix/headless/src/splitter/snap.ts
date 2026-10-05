/**
 * Where a dragged divider lands: on the nearest snap point within `threshold`,
 * or where the pointer is.
 *
 * Every number is a percentage of the splitter's box, so the caller turns a
 * point written as a length, and the threshold, into one first. Ties go to the
 * point written first.
 */
export const snapTo = (position: number, points: readonly number[], threshold: number): number => {
  let best: number | undefined
  let distance = Number.POSITIVE_INFINITY
  for (const point of points) {
    const away = Math.abs(point - position)
    if (away <= threshold && away < distance) {
      best = point
      distance = away
    }
  }
  return best ?? position
}
