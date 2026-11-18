import { PointerFollowController } from '../../controllers/pointer-follow-controller/pointer-follow-controller.js'
import { runOn } from '../plain-host/plain-host.js'

/** What `followPointer` tells the page, beside the two properties it writes. */
export interface FollowPointerOptions {
  /** Where the pointer is, once a frame while it moves: `x` and `y` from -1 to 1, the middle 0 and 0. */
  moved?: ((x: number, y: number) => void) | undefined
  /** The pointer left the element, or stopped being followed. */
  left?: (() => void) | undefined
}

/**
 * Follows a mouse or pen across any element, as `Tilt` and `Magnetic` do, and
 * writes where it is onto the element, so a stylesheet can lean or drift it
 * toward the pointer. Returns the function that stops it.
 *
 * ```js
 * import { followPointer } from '@fusion.dev/helix-core'
 *
 * followPointer(document.querySelector('.card'))
 * ```
 *
 * ```css
 * .card {
 *   rotate: x calc(var(--pointer-y, 0) * -6deg);
 *   transition: rotate var(--helix-duration-normal) var(--helix-easing-standard);
 * }
 * ```
 *
 * **`--pointer-x` and `--pointer-y` run from -1 to 1**, from the inline start
 * edge to the end and from the top to the bottom, so the middle is 0. They are
 * mirrored on a right-to-left page, and taken off when the pointer leaves,
 * which a stylesheet with `0` as the fallback reads as the middle.
 * `data-following` is on the element while they are written.
 *
 * **A touch is not followed**, since a finger is there only while it presses,
 * and nothing is followed for a reader who asked for less motion.
 */
export const followPointer = (
  element: HTMLElement,
  options: FollowPointerOptions = {},
): (() => void) => {
  const running = runOn(
    element,
    (host) =>
      new PointerFollowController(host, {
        left: () => {
          element.style.removeProperty('--pointer-x')
          element.style.removeProperty('--pointer-y')
          element.removeAttribute('data-following')
          options.left?.()
        },
        moved: (x, y) => {
          element.style.setProperty('--pointer-x', x.toFixed(3))
          element.style.setProperty('--pointer-y', y.toFixed(3))
          element.toggleAttribute('data-following', true)
          options.moved?.(x, y)
        },
      }),
  )
  return running.release
}
