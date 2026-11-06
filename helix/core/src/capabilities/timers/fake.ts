import type { Timers } from './contract.generated.js'

/** A timeout the fake holds until the clock reaches `at`. */
interface Waiting {
  readonly at: number
  readonly done: () => void
}

/** A frame the fake holds until a spec runs one. */
interface Frame {
  readonly done: (time: number) => void
}

/** A listener for the page coming to the front or leaving it. */
interface Observer {
  readonly changed: (visible: boolean) => void
}

/** What the fake is holding: asked for, and neither run nor stopped. */
export interface Pending {
  readonly frames: number
  readonly observers: number
  readonly timeouts: number
}

/** A timers capability on a clock that moves only when a spec moves it. */
export interface FakeTimers extends Timers {
  /** The wait each timeout was asked for, in milliseconds, in the order asked. */
  readonly asked: readonly number[]
  /**
   * Moves the clock `ms` milliseconds forward and runs each timeout that comes
   * due, soonest first, with the clock at the time it came due. A timeout
   * started on the way runs too, where it comes due before the end.
   */
  readonly advance: (ms: number) => void
  /** How many timeouts, frames, and observers are waiting. */
  readonly pending: () => Pending
  /**
   * Runs each frame waiting, with `time` as the frame's time, or the clock's
   * time where none is given. A frame asked for while they run waits for the
   * next call.
   */
  readonly runFrame: (time?: number) => void
  /** Brings the page to the front or sends it away, and tells each observer where that is a change. */
  readonly setVisible: (visible: boolean) => void
  /**
   * Sets the time of day, as a reader who changes their system clock does.
   * The clock `now` reads does not move.
   */
  readonly setWall: (wall: number) => void
}

/**
 * The time of day a fake starts at: 9:00 on January 5, 2026, in UTC, a
 * Monday, so a spec that formats it reads the same on any machine.
 */
export const FAKE_WALL_START = Date.UTC(2026, 0, 5, 9)

/**
 * The most timeouts one `advance` runs before it throws.
 *
 * **A spec that hangs is worse than one that fails**: a runner reports a job
 * timeout with no failing assertion attached. A timeout that starts itself
 * again with no wait would otherwise run forever inside one `advance`.
 */
const LIMIT = 10_000

/** The timeout due soonest, no later than `until`, the first asked where two are due together. */
const soonest = (timeouts: ReadonlySet<Waiting>, until: number): Waiting | undefined => {
  let found: Waiting | undefined
  for (const one of timeouts) {
    if (one.at <= until && (found === undefined || one.at < found.at)) {
      found = one
    }
  }
  return found
}

/**
 * A fake on a virtual clock that starts at zero. `now()` reads the clock,
 * `advance` moves it, `runFrame` draws a frame, and `setVisible` moves the page
 * to the front or away. A stopped timeout or frame never runs.
 *
 * **The time of day moves with the clock**, from `wall`, which defaults to
 * `FAKE_WALL_START`, and `setWall` sets it as a system clock is set.
 */
export const fakeTimers = (wall = FAKE_WALL_START): FakeTimers => {
  let now = 0
  /* The time of day less the clock, so it moves as the clock does. */
  let offset = wall
  let visible = true
  const asked: number[] = []
  const timeouts = new Set<Waiting>()
  const frames = new Set<Frame>()
  const observers = new Set<Observer>()
  return {
    advance: (ms) => {
      /* The clock only moves forward, so a step below zero is no step. */
      const until = now + Math.max(ms, 0)
      let runs = 0
      for (let due = soonest(timeouts, until); due; due = soonest(timeouts, until)) {
        runs += 1
        if (runs > LIMIT) {
          throw new Error(
            `advance ran ${LIMIT} timeouts: a timeout that starts itself again with no wait runs forever`,
          )
        }
        timeouts.delete(due)
        now = due.at
        due.done()
      }
      now = until
    },
    asked,
    frame: (done) => {
      const entry: Frame = { done }
      frames.add(entry)
      return () => {
        frames.delete(entry)
      }
    },
    now: () => now,
    observeVisible: (changed) => {
      const entry: Observer = { changed }
      observers.add(entry)
      return () => {
        observers.delete(entry)
      }
    },
    pending: () => ({
      frames: frames.size,
      observers: observers.size,
      timeouts: timeouts.size,
    }),
    runFrame: (time = now) => {
      /* The frames waiting as the run starts, each taken out as it runs. One
         stopped by an earlier one is already out, and one asked for during
         the run is not in the list. */
      for (const one of [...frames]) {
        if (frames.delete(one)) {
          one.done(time)
        }
      }
    },
    setVisible: (next) => {
      if (next === visible) {
        return
      }
      visible = next
      for (const one of [...observers]) {
        if (observers.has(one)) {
          one.changed(next)
        }
      }
    },
    setWall: (next) => {
      offset = next - now
    },
    timeout: (ms, done) => {
      asked.push(ms)
      /* As `setTimeout` does, a wait below zero, or one that is not a number,
         is no wait at all. */
      const entry: Waiting = { at: now + Math.max(ms, 0), done }
      timeouts.add(entry)
      return () => {
        timeouts.delete(entry)
      }
    },
    visible: () => visible,
    wall: () => offset + now,
  }
}
