import { describe, expect, test } from 'bun:test'
import { type Clock, subscribe, withClock } from './ticker.js'

/* One timer for the page, and the unsubscribe that keeps it that way.
 *
 * **A plain comment rather than a doc block**, because the block below it is
 * one: two in a row means the first documents the second rather than the file,
 * which is what `orphans` reports.
 *
 * **The leak is the fault worth testing.** A notification panel is the thing a
 * reader opens and closes repeatedly, and a subscription that outlives its
 * element holds a closure over that element for the life of the page: nothing
 * fails, nothing is visibly wrong, and the tab grows.
 *
 * **Driven by a clock rather than by the wall, and the reason is a failure.**
 * These tests used to subscribe at 1000ms and wait 1400 for real. One run took
 * 1,401.98ms on a loaded runner and failed a required check on a branch that did
 * not touch this file. A longer wait is the same bug at a lower rate, so the
 * assertions moved onto the mechanism: what gets scheduled, for how long, and
 * what runs when the time arrives.
 *
 * The wall-clock test at the bottom stays, because a fake clock proves the
 * arithmetic and proves nothing about `setTimeout`. */

/** A clock that runs only when told, holding one timer the way the ticker does. */
const stopped = () => {
  let now = 1_000_000
  let pending: { at: number; run: () => void } | undefined
  let next = 0
  const clock: Clock = {
    clearTimer: () => {
      pending = undefined
    },
    now: () => now,
    setTimer: (run, wait) => {
      pending = { at: now + wait, run }
      next += 1
      return next as unknown as ReturnType<typeof setTimeout>
    },
  }
  return {
    /**
     * Moves time forward, firing the timer if it comes due.
     *
     * **Bounded, because a spec that hangs is worse than one that fails**: CI
     * reports a job timeout with no failing assertion attached. This bound
     * covers a runaway *timer*, one that re-arms at the instant it fired. A
     * runaway *callback* is invisible from here, since the callbacks belong to
     * the test, and the zero-delay case below carries its own stop for that.
     */
    advance: (ms: number) => {
      const until = now + ms
      let passes = 0
      while (pending !== undefined && pending.at <= until) {
        passes += 1
        if (passes > 50) {
          throw new Error(
            'the ticker re-armed 50 times inside one advance, which is a busy loop rather than a schedule',
          )
        }
        const due = pending
        now = due.at
        pending = undefined
        due.run()
      }
      now = until
    },
    /** What the ticker asked to be woken in, or `undefined` for nothing armed. */
    armed: () => (pending === undefined ? undefined : pending.at - now),
    clock,
  }
}

describe('subscribe', () => {
  test('it runs the callback once the wait is up', () => {
    const time = stopped()
    const restore = withClock(time.clock)
    try {
      let ran = 0
      subscribe(1000, () => {
        ran += 1
      })
      time.advance(999)
      expect(ran).toBe(0)
      time.advance(1)
      expect(ran).toBe(1)
    } finally {
      restore()
    }
  })

  test('unsubscribing before the wait is up runs nothing, and disarms the timer', () => {
    const time = stopped()
    const restore = withClock(time.clock)
    try {
      let ran = 0
      const stop = subscribe(1000, () => {
        ran += 1
      })
      stop()
      expect(time.armed()).toBeUndefined()
      time.advance(60_000)
      expect(ran).toBe(0)
    } finally {
      restore()
    }
  })

  /**
   * The soonest wins, so a feed holding one fresh item and forty old ones still
   * updates the fresh one on time. Scheduled on anything but the minimum, the
   * item that needed the update is the one that does not get it.
   */
  test('the soonest subscriber decides when the timer fires', () => {
    const time = stopped()
    const restore = withClock(time.clock)
    try {
      const ran: string[] = []
      subscribe(60_000, () => ran.push('late'))
      expect(time.armed()).toBe(60_000)
      subscribe(1000, () => ran.push('soon'))
      expect(time.armed()).toBe(1000)
      time.advance(1000)
      expect(ran).toEqual(['soon'])
    } finally {
      restore()
    }
  })

  /**
   * A subscriber handed a zero would be re-armed inside the callback that fired
   * it, which is a busy loop wearing a timer's clothes. Asserted on the wait
   * asked for rather than on a run count, since a run count cannot tell a floor
   * from a coincidence.
   */
  test('a wait below a second is floored at one, rather than spinning', () => {
    const time = stopped()
    const restore = withClock(time.clock)
    try {
      subscribe(0, () => {})
      expect(time.armed()).toBe(1000)
    } finally {
      restore()
    }
  })

  test('a subscriber that re-subscribes from its own callback does not run twice', () => {
    const time = stopped()
    const restore = withClock(time.clock)
    try {
      let ran = 0
      const again = (): void => {
        ran += 1
        if (ran < 2) {
          subscribe(1000, again)
        }
      }
      subscribe(1000, again)
      time.advance(1000)
      expect(ran).toBe(1)
    } finally {
      restore()
    }
  })

  /**
   * **The copy in `schedule` is what this protects, and only a zero reaches it.**
   * A callback re-subscribing with a delay lands at a time in the future, so the
   * pass walking it again would not run it either way. A zero lands at exactly
   * `now`, which the pass reads as due: iterating the live set, the entry added
   * inside the callback is visited by the same loop that fired it and runs a
   * second time before any timer is involved.
   */
  test('a subscriber that re-subscribes with no delay still runs once per pass', () => {
    const time = stopped()
    const restore = withClock(time.clock)
    try {
      let ran = 0
      /* Bounded at twenty, because the fault this catches is unbounded
         recursion *inside* the callback rather than inside the clock: the entry
         added here is visited by the same `for` loop that fired it, which adds
         another. Without a stop the spec hangs, and a hang is reported as a
         job timeout with no failing assertion attached to it. */
      const again = (): void => {
        ran += 1
        if (ran < 20) {
          subscribe(0, again)
        }
      }
      subscribe(0, again)
      time.advance(1000)
      expect(ran).toBe(1)
    } finally {
      restore()
    }
  })

  test('a subscriber that re-subscribes runs again on the next pass', () => {
    const time = stopped()
    const restore = withClock(time.clock)
    try {
      let ran = 0
      const again = (): void => {
        ran += 1
        subscribe(1000, again)
      }
      subscribe(1000, again)
      time.advance(1000)
      expect(ran).toBe(1)
      time.advance(1000)
      expect(ran).toBe(2)
    } finally {
      restore()
    }
  })

  test('the last subscriber leaving disarms the timer rather than leaving it running', () => {
    const time = stopped()
    const restore = withClock(time.clock)
    try {
      const one = subscribe(1000, () => {})
      const two = subscribe(2000, () => {})
      one()
      expect(time.armed()).toBe(2000)
      two()
      expect(time.armed()).toBeUndefined()
    } finally {
      restore()
    }
  })

  test('unsubscribing twice is not an error, since an element may disconnect twice', () => {
    const time = stopped()
    const restore = withClock(time.clock)
    try {
      const stop = subscribe(1000, () => {})
      stop()
      expect(() => stop()).not.toThrow()
    } finally {
      restore()
    }
  })

  /**
   * The one test still on the wall, because everything above proves the
   * arithmetic and none of it proves that `setTimeout` is reached at all. A
   * fake clock that was never wired to the real one would pass every test above
   * and ship a ticker that never fires.
   *
   * Given four seconds for a one-second wait: this asserts that it happened,
   * not when, so no runner is loaded enough to fail it.
   */
  test('the real clock fires it', async () => {
    let ran = 0
    const stop = subscribe(1000, () => {
      ran += 1
    })
    const until = Date.now() + 4000
    while (ran === 0 && Date.now() < until) {
      await new Promise((done) => setTimeout(done, 50))
    }
    stop()
    expect(ran).toBe(1)
  })
})
