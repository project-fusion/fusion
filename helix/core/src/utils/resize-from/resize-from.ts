import { reducedMotion } from '../page-motion/page-motion.js'

/** How `resizeFrom` times the move. */
export interface ResizeFromOptions {
  /**
   * The move in flight on the element, if any. It ends before the new height
   * is measured, so a move started during another measures where the element
   * comes to rest and starts from where it is drawn.
   */
  previous?: Animation | undefined

  /**
   * The move's duration and curve, read once the new height is known. The
   * duration is in milliseconds, or a CSS time such as `320ms` or `0.32s`. A
   * duration under a millisecond, or one that does not read as a time, moves
   * nothing.
   */
  timing: () => { duration: number | string; easing: string }
}

/** Reads a duration as milliseconds. Anything that does not read as one is 0. */
const milliseconds = (value: number | string): number => {
  if (typeof value === 'number') {
    return value
  }
  const amount = Number.parseFloat(value)
  if (!Number.isFinite(amount)) {
    return 0
  }
  return value.trim().endsWith('ms') ? amount : amount * 1000
}

/**
 * Moves an element's height from `from`, in pixels, to the height it lays out
 * at next. Resolves with the move, or with `undefined` where nothing moves:
 * the two heights are within a pixel, the duration is under a millisecond, or
 * the reader asked for reduced motion.
 *
 * **A height is often a keyword**, such as `auto` or `fit-content`, which no
 * transition can follow. So the move runs on the two measured heights, as a
 * `block-size` animation, and the keyword is in place again once it ends.
 *
 * **Measured once the change has laid out.** Content that arrives in updates
 * of its own lays out a frame after the change that asked for it, so a height
 * read at once is short of where the element comes to rest. A new
 * `ResizeObserver` reports once, after layout and before that frame is
 * painted, and the move starts there, so no frame shows the new height first.
 */
export const resizeFrom = (
  element: HTMLElement,
  from: number,
  options: ResizeFromOptions,
): Promise<Animation | undefined> => {
  if (
    typeof element.animate !== 'function' ||
    typeof ResizeObserver === 'undefined' ||
    reducedMotion()
  ) {
    options.previous?.cancel()
    return Promise.resolve(undefined)
  }
  return new Promise((resolve) => {
    const watcher = new ResizeObserver(() => {
      watcher.disconnect()
      options.previous?.cancel()
      const to = element.getBoundingClientRect().height
      const { duration, easing } = options.timing()
      const length = milliseconds(duration)
      if (Math.abs(to - from) < 1 || !(length >= 1)) {
        resolve(undefined)
        return
      }
      resolve(
        element.animate([{ blockSize: `${from}px` }, { blockSize: `${to}px` }], {
          duration: length,
          easing: easing.trim() || 'ease-out',
        }),
      )
    })
    watcher.observe(element)
  })
}
