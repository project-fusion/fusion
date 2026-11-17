import type { ReactiveController, ReactiveControllerHost } from 'lit'
import { reducedMotion } from '../../utils/page-motion/page-motion.js'

/** What a `CountController` reads of its host. */
export interface CountOptions {
  /**
   * How long a count takes and its curve, as the host's family hooks hold
   * them, such as `--stat-count-duration` and `--stat-count-easing`. Read when
   * a count starts. A duration that is empty, or under a millisecond, counts
   * nothing.
   */
  timing: () => { duration: string; easing: string }
}

/** Reads a duration as milliseconds. Anything that does not read as one is 0. */
const milliseconds = (value: string): number => {
  const amount = Number.parseFloat(value)
  if (!Number.isFinite(amount)) {
    return 0
  }
  return value.trim().endsWith('ms') ? amount : amount * 1000
}

/** How many digits a number has after its point, as it is written. */
const decimals = (value: number): number => {
  const written = String(value)
  const point = written.indexOf('.')
  return point === -1 || written.includes('e') ? 0 : written.length - point - 1
}

/**
 * Counts a figure from the number it showed to a new one, once a frame, so a
 * figure that a dashboard refreshes reads as having moved. Serves `Stat` and
 * `Trend`.
 *
 * **The browser runs the curve.** An animation with no keyframes changes
 * nothing on screen, and its eased progress is the share of the way the figure
 * has come, so `linear()` and `cubic-bezier()` count exactly as a transition
 * with the same curve moves. Each figure is rounded to as many decimals as the
 * two numbers have, so a count to 1,284 shows no fractions.
 *
 * **The stylesheet decides whether anything counts**, through the timing the
 * host's family hooks hold, which the styled tier sets from the tokens. The
 * headless tier sets none, so a new figure shows at once there, and so it does
 * under reduced motion, whatever the hooks say.
 *
 * The host draws `counting` while it is a number, and asks for an update on
 * every frame through `requestUpdate`. A count interrupted by another starts
 * from the figure drawn.
 */
export class CountController implements ReactiveController {
  private readonly host: ReactiveControllerHost & HTMLElement

  private readonly options: CountOptions

  /** The figure to draw while a count runs, or `undefined` at rest. */
  counting: number | undefined

  /** The count in flight. */
  private clock: Animation | undefined

  constructor(host: ReactiveControllerHost & HTMLElement, options: CountOptions) {
    this.host = host
    this.options = options
    host.addController(this)
  }

  hostDisconnected(): void {
    this.stop()
  }

  /**
   * Counts from `from`, or from the figure drawn where a count is running, to
   * `to`. Does nothing where the two are the same, either is no number, or the
   * timing or the reader's setting says not to move.
   */
  start(from: number, to: number | undefined): void {
    const begin = this.counting ?? from
    this.stop()
    if (to === undefined || !Number.isFinite(to) || !Number.isFinite(begin) || begin === to) {
      return
    }
    const timing = this.options.timing()
    const duration = milliseconds(timing.duration)
    if (duration < 1 || reducedMotion() || typeof this.host.animate !== 'function') {
      return
    }
    const easing = timing.easing.trim() || 'ease'
    const places = 10 ** Math.max(decimals(begin), decimals(to))
    const clock = this.host.animate([], { duration, easing })
    this.clock = clock
    this.counting = begin
    const frame = (): void => {
      if (this.clock !== clock) {
        return
      }
      const progress = clock.effect?.getComputedTiming().progress
      if (clock.playState === 'finished' || typeof progress !== 'number') {
        this.clock = undefined
        this.counting = undefined
        this.host.requestUpdate()
        return
      }
      this.counting = Math.round((begin + (to - begin) * progress) * places) / places
      this.host.requestUpdate()
      requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  }

  /** Ends a count where it is, leaving the host to draw its own figure. */
  private stop(): void {
    this.clock?.cancel()
    this.clock = undefined
    this.counting = undefined
  }
}
