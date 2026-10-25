/**
 * A wait that runs out once, and a lifetime that pauses, on the timers
 * capability, so a fake clock drives them on every platform.
 */
import { timers } from '../capabilities/timers/index.js'
import type { Stop } from '../capabilities/types.generated.js'

/** A wait that runs `done` once its time has passed. */
export interface Delay {
  /** Whether its time has passed since the last `start`. */
  readonly elapsed: boolean
  /** Whether it is waiting now. */
  readonly pending: boolean
  /** Stops the wait, and runs nothing. */
  readonly cancel: () => void
  /** Ends a wait at once, as though its time had passed. */
  readonly flush: () => void
  /**
   * Starts a wait of `ms`, stopping one already running, and runs `done` once
   * it has passed. With no `ms`, it stops the wait and starts nothing.
   */
  readonly start: (ms?: number, done?: () => void) => void
}

/**
 * A wait that starts over and forgets itself when it is stopped, as the web's
 * `DelayController` is: a loader shown only after a delay, or a tooltip opened
 * after a pause. `changed` runs as `elapsed` turns, for a host that draws it.
 */
export const delay = (changed?: (elapsed: boolean) => void): Delay => {
  let stop: Stop | undefined
  let done: (() => void) | undefined
  let elapsed = false
  const mark = (next: boolean): void => {
    if (next !== elapsed) {
      elapsed = next
      changed?.(next)
    }
  }
  const cancel = (): void => {
    stop?.()
    stop = undefined
    done = undefined
  }
  const finish = (): void => {
    const then = done
    stop = undefined
    done = undefined
    mark(true)
    then?.()
  }
  return {
    cancel,
    get elapsed() {
      return elapsed
    },
    flush: () => {
      if (stop !== undefined) {
        stop()
        finish()
      }
    },
    get pending() {
      return stop !== undefined
    },
    start: (ms, then) => {
      cancel()
      mark(false)
      if (ms === undefined) {
        return
      }
      done = then
      stop = timers().timeout(ms, finish)
    },
  }
}

/** What a countdown runs when its time is spent, and when it stops and starts. */
export interface CountdownOptions {
  /** Runs once the time is spent. */
  readonly done: () => void
  /**
   * Whether the page or the app away from the front holds the clock, as a
   * pointer on the message does. Counted as one hold however often it goes
   * away, and a clock started while it is away waits for it to come back.
   */
  readonly holdWhileHidden?: boolean
  /**
   * The time left of a clock this one carries on from, stopped until it is
   * resumed, as a web element that leaves the page and comes back keeps it.
   */
  readonly left?: number
  /** Runs with `true` when the clock stops partway and `false` when it runs again. */
  readonly paused?: (paused: boolean) => void
}

/** A lifetime that pauses, as the web's `CountdownController` is. */
export interface Countdown {
  /** The time left, as it stood when the clock last stopped, or nothing once it is spent or canceled. */
  readonly left: number | undefined
  /** Whether the clock is running now. */
  readonly running: boolean
  /** Stops the clock for good: nothing is left to resume until the next `start`. */
  readonly cancel: () => void
  /** Stops the clock and drops every hold, as a host that leaves the page does. */
  readonly dispose: () => void
  /** One more reason to hold the clock, such as a pointer arriving or focus. */
  readonly hold: () => void
  /** Stops the clock and keeps the time that is left. */
  readonly pause: () => void
  /** One reason fewer, and the clock runs again once none is left. */
  readonly release: () => void
  /** Runs the clock again from where it stopped, unless the app is away. */
  readonly resume: () => void
  /** Starts the clock at `ms`. Nothing, zero, or less starts nothing. */
  readonly start: (ms: number | undefined) => void
}

/**
 * A lifetime that pauses: a message that dismisses itself after a time, and
 * holds that time while you are on it.
 *
 * **Holds are counted.** Hover and focus stop the same clock independently,
 * and only the last one out starts it again. Resuming continues from what was
 * left. **The app in the background holds it too, where `holdWhileHidden`
 * asks**, as one hold, through the timers capability's `observeVisible`.
 */
export const countdown = (options: CountdownOptions): Countdown => {
  const clock = timers()
  let startedAt: number | undefined
  let remaining: number | undefined = options.left
  let stop: Stop | undefined
  let holds = 0
  let hidden = options.holdWhileHidden === true && !clock.visible()
  const pause = (): void => {
    if (stop === undefined || startedAt === undefined) {
      return
    }
    stop()
    stop = undefined
    remaining = Math.max((remaining ?? 0) - (clock.now() - startedAt), 0)
    startedAt = undefined
    options.paused?.(true)
  }
  const cancel = (): void => {
    stop?.()
    stop = undefined
    remaining = undefined
    startedAt = undefined
  }
  const resume = (): void => {
    if (hidden || stop !== undefined || remaining === undefined || remaining <= 0) {
      return
    }
    startedAt = clock.now()
    options.paused?.(false)
    stop = clock.timeout(remaining, () => {
      /* Spent, so nothing is left to resume. */
      cancel()
      options.done()
    })
  }
  const hold = (): void => {
    holds += 1
    pause()
  }
  const release = (): void => {
    holds = Math.max(holds - 1, 0)
    if (holds === 0) {
      resume()
    }
  }
  const stopWatching = options.holdWhileHidden
    ? clock.observeVisible((visible) => {
        if (visible === !hidden) {
          return
        }
        hidden = !visible
        if (hidden) {
          pause()
        } else if (holds === 0) {
          resume()
        }
      })
    : undefined
  return {
    cancel,
    dispose: () => {
      pause()
      holds = 0
      stopWatching?.()
    },
    hold,
    get left() {
      return remaining
    },
    pause,
    release,
    resume,
    get running() {
      return stop !== undefined
    },
    start: (ms) => {
      if (ms === undefined || !(ms > 0)) {
        return
      }
      remaining = ms
      resume()
    },
  }
}
