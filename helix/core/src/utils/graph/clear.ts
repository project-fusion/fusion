/** A name's box on screen, in pixels. */
export interface Box {
  bottom: number
  left: number
  right: number
  top: number
}

/** Whether a box overlaps none of `others`. */
export const clearOf = (box: Box, others: readonly Box[]): boolean =>
  others.every(
    (other) =>
      box.right < other.left ||
      box.left > other.right ||
      box.bottom < other.top ||
      box.top > other.bottom,
  )
