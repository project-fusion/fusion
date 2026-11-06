/**
 * A tick on the time of day that stops while the app is away and catches up
 * as it comes back, on the timers capability, so a fake clock drives it on
 * every platform.
 */
import { timers } from '../capabilities/timers/index.js'
import type { Stop } from '../capabilities/types.generated.js'

/** What a wall clock reads and tells. */
export interface WallClockOptions {
  /**
   * How long from `now`, the time of day in milliseconds, until what is drawn
   * from it changes, such as the next minute of "5 minutes ago". `undefined`
   * stops the clock, and so does a wait that is not finite.
   */
  readonly expires: (now: number) => number | undefined
  /** Runs with the time of day at each tick, the first as the clock starts. */
  readonly tick: (now: number) => void
}

/**
 * Ticks on the time of day, as the web's `RelativeClockController` does for
 * a relative time: at once, then each time `expires` says what is drawn
 * changes.
 *
 * **It stops while the app is in the background, and catches up as it comes
 * back**: a tick at once with the time of day then, which is also how a
 * system clock set while away is heard. Returns the stop of the clock.
 */
export const wallClock = (options: WallClockOptions): Stop => {
  const clock = timers()
  let stop: Stop | undefined
  let stopped = false
  const tick = (): void => {
    stop?.()
    stop = undefined
    if (stopped) {
      return
    }
    const now = clock.wall()
    const next = options.expires(now)
    if (next === undefined) {
      return
    }
    options.tick(now)
    if (Number.isFinite(next) && clock.visible()) {
      /* Floored at a second, as the web's ticker floors it: a wait of zero
         would tick again inside the tick that set it. */
      stop = clock.timeout(Math.max(next, 1000), tick)
    }
  }
  const stopWatching = clock.observeVisible((visible) => {
    if (visible) {
      tick()
    } else {
      stop?.()
      stop = undefined
    }
  })
  tick()
  return () => {
    stopped = true
    stop?.()
    stop = undefined
    stopWatching()
  }
}
