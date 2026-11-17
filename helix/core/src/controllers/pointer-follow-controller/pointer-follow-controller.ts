import type { ReactiveController, ReactiveControllerHost } from 'lit'
import { reducedMotion } from '../../utils/page-motion/page-motion.js'

/** What a `PointerFollowController` tells its host. */
export interface PointerFollowOptions {
  /**
   * Where the pointer is over the host, once a frame while it moves: `x` from
   * -1 at the inline start edge to 1 at the inline end, and `y` from -1 at the
   * top to 1 at the bottom, so the middle is 0 and 0. Mirrored on a
   * right-to-left page.
   */
  moved: (x: number, y: number) => void

  /** The pointer has left the host, or stopped being followed. */
  left: () => void
}

/**
 * Follows a mouse or pen across its host, for a component that leans or
 * drifts toward the pointer, such as `Tilt` and `Magnetic`.
 *
 * **A touch is not followed.** A finger is on the element only while it
 * presses, so a lean toward it reads as the element dodging the press. Nor is
 * a pointer followed where the reader asked for less movement, read when the
 * pointer arrives, so the host never moves at all there.
 *
 * Positions are read once a frame at most, from the host's box, and handed
 * over as shares of its half-width and half-height.
 */
export class PointerFollowController implements ReactiveController {
  private readonly host: ReactiveControllerHost & HTMLElement

  private readonly options: PointerFollowOptions

  /** The last position heard and not yet handed over. */
  private pending: { x: number; y: number } | undefined

  /** The frame that hands `pending` over. */
  private frame = 0

  /** Whether the host has been told of a position since it was last told the pointer left. */
  private following = false

  constructor(host: ReactiveControllerHost & HTMLElement, options: PointerFollowOptions) {
    this.host = host
    this.options = options
    host.addController(this)
  }

  hostConnected(): void {
    this.host.addEventListener('pointermove', this.move)
    this.host.addEventListener('pointerleave', this.leave)
    this.host.addEventListener('pointercancel', this.leave)
  }

  hostDisconnected(): void {
    this.host.removeEventListener('pointermove', this.move)
    this.host.removeEventListener('pointerleave', this.leave)
    this.host.removeEventListener('pointercancel', this.leave)
    this.leave()
  }

  private readonly move = (event: PointerEvent): void => {
    if (event.pointerType === 'touch' || reducedMotion()) {
      return
    }
    this.pending = { x: event.clientX, y: event.clientY }
    if (!this.frame) {
      this.frame = requestAnimationFrame(this.hand)
    }
  }

  private readonly hand = (): void => {
    this.frame = 0
    const at = this.pending
    this.pending = undefined
    if (!at) {
      return
    }
    const box = this.host.getBoundingClientRect()
    if (box.width <= 0 || box.height <= 0) {
      return
    }
    const across = ((at.x - box.left) / box.width) * 2 - 1
    const down = ((at.y - box.top) / box.height) * 2 - 1
    const clamp = (value: number): number => Math.max(-1, Math.min(1, value))
    const rtl = getComputedStyle(this.host).direction === 'rtl'
    this.following = true
    this.options.moved(clamp(rtl ? -across : across), clamp(down))
  }

  private readonly leave = (): void => {
    if (this.frame) {
      cancelAnimationFrame(this.frame)
      this.frame = 0
    }
    this.pending = undefined
    if (this.following) {
      this.following = false
      this.options.left()
    }
  }
}
