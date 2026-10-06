/**
 * Where a card lands on a board that snaps: the arithmetic of a ruling, kept
 * apart from the board that applies it.
 *
 * Every value is in the document's own units, and a step of nothing, zero or
 * less is no snapping at all, so a board without `snap` moves exactly as it
 * did before there was one.
 */

/** A box on the board, in the document's own units. */
export interface SnapBox {
  x: number
  y: number
  width: number
  height: number
}

/** Whether a step snaps anything. */
const snaps = (step: number | undefined): step is number =>
  step !== undefined && Number.isFinite(step) && step > 0

/**
 * A value at the nearest multiple of `step`, or the value as it is where there
 * is no step. A drag lets go wherever the hand is, and lands on the line
 * nearest it.
 */
export const snapTo = (value: number, step: number | undefined): number =>
  snaps(step) ? Math.round(value / step) * step : value

/**
 * The next multiple of `step` from `value`, the way a key points: `way` is `1`
 * or `-1`.
 *
 * **On to the next line, and never back onto the same one.** A card sitting
 * between two lines goes to the line ahead of it, and one on a line goes a
 * whole step, so every press moves the card and every press lands on a line.
 */
export const stepTo = (value: number, way: number, step: number): number => {
  if (way === 0) {
    return value
  }
  const at = value / step
  /* A hair off a line, as a sum of decimals leaves a value, is on it. */
  const near = Math.round(at)
  const on = Math.abs(at - near) < 1e-9 ? near : at
  return (way > 0 ? Math.floor(on) + 1 : Math.ceil(on) - 1) * step
}

/**
 * A box resized from a corner, with the edges that corner moves snapped, and
 * held to a least size.
 *
 * Only the moving edges: the corner opposite the one in hand stays where it
 * was, as it does without a ruling. Where the line nearest is inside the least
 * size, the box stays at the least size rather than turning inside out.
 */
export const snapBox = (
  box: SnapBox,
  start: SnapBox,
  corner: string,
  step: number | undefined,
  least: { width: number; height: number },
): SnapBox => {
  if (!snaps(step)) {
    return box
  }
  const left = corner.endsWith('left')
  const top = corner.startsWith('top')
  const right = start.x + start.width
  const bottom = start.y + start.height
  const width = left
    ? Math.max(least.width, right - snapTo(box.x, step))
    : Math.max(least.width, snapTo(box.x + box.width, step) - start.x)
  const height = top
    ? Math.max(least.height, bottom - snapTo(box.y, step))
    : Math.max(least.height, snapTo(box.y + box.height, step) - start.y)
  return {
    height,
    width,
    x: left ? right - width : start.x,
    y: top ? bottom - height : start.y,
  }
}
