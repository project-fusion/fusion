/**
 * One timer for the page, not one per element that shows a time.
 *
 * **Fifty items with fifty intervals is fifty wakeups where one will do**, and
 * the cost is not theoretical: a notification panel is exactly the thing a
 * reader leaves open in a background tab, where every wakeup is a wakeup the
 * browser cannot coalesce away and a laptop pays for.
 *
 * Each subscriber says when it next needs looking at, and this holds a single
 * timeout for the soonest of them. A subscriber that wakes early is harmless,
 * because it recomputes its own reading and re-subscribes with a fresh answer;
 * a subscriber that wakes late is a stale timestamp, which is the fault the
 * whole arrangement exists to avoid, so the timer is always set to the minimum
 * rather than to an average.
 *
 * **`globalThis` and not module scope.** The spec bundler emits one bundle per
 * family and the runner loads them all into one page, so a module-level `Set`
 * has the reach of one bundle while the timer it schedules has the reach of the
 * document. Two families each holding "the" ticker is two timers, and the second
 * one to load quietly gets its own. See `.claude/rules/helix.md`.
 */
interface Waiting {
  at: number
  run: () => void
}

/**
 * The three platform calls this makes, taken as values so a test can drive them.
 *
 * **Not a configuration point.** It exists because the alternative is asserting
 * on the machine: a spec that subscribes at 1000ms and waits 1400 is measuring
 * how loaded the runner is, and a loaded runner eats 400ms. One did, on a green
 * branch, and blocked a merge that had nothing wrong with it. A bigger margin is
 * the same bug at a lower rate.
 *
 * Bun 1.1.43 is what this workspace pins, and it has `jest.useFakeTimers()`
 * without `jest.advanceTimersByTime`, so there is nothing to advance a faked
 * timer with. Measured rather than assumed: a spec asserting that function
 * exists throws.
 */
export interface Clock {
  clearTimer: (timer: ReturnType<typeof setTimeout>) => void
  now: () => number
  setTimer: (run: () => void, wait: number) => ReturnType<typeof setTimeout>
}

const REAL: Clock = {
  clearTimer: (timer) => {
    clearTimeout(timer)
  },
  now: () => Date.now(),
  setTimer: (run, wait) => setTimeout(run, wait),
}

interface Ticker {
  clock: Clock
  timer: ReturnType<typeof setTimeout> | undefined
  waiting: Set<Waiting>
}

const KEY = Symbol.for('helix.ticker')

const ticker = (): Ticker => {
  const global = globalThis as unknown as Record<symbol, Ticker | undefined>
  let found = global[KEY]
  if (!found) {
    found = { clock: REAL, timer: undefined, waiting: new Set() }
    global[KEY] = found
  }
  return found
}

/**
 * Replaces the ticker with an empty one on the given clock, and hands back the
 * way to put the real one back.
 *
 * **On `globalThis` with the rest of it, deliberately.** The spec bundler emits
 * one bundle per family and the runner loads them all into one page, so a
 * module-level clock would have the reach of one bundle while the timer it
 * schedules has the reach of the document. That is the fault the arrangement
 * above exists to avoid, and this must not reintroduce it.
 */
export const withClock = (clock: Clock): (() => void) => {
  const global = globalThis as unknown as Record<symbol, Ticker | undefined>
  const before = global[KEY]
  global[KEY] = { clock, timer: undefined, waiting: new Set() }
  return () => {
    global[KEY] = before
  }
}

/** Sets the one timeout, for the soonest thing anybody is waiting on. */
const schedule = (): void => {
  const held = ticker()
  if (held.timer !== undefined) {
    held.clock.clearTimer(held.timer)
    held.timer = undefined
  }
  if (held.waiting.size === 0) {
    return
  }
  const soonest = Math.min(...[...held.waiting].map((one) => one.at))
  /* Floored at a second: a subscriber handed a zero would be re-armed inside the
     callback that fired it, which is a busy loop wearing a timer's clothes. */
  const wait = Math.max(1000, soonest - held.clock.now())
  held.timer = held.clock.setTimer(() => {
    held.timer = undefined
    const now = held.clock.now()
    /* Copied before iterating, because every callback re-subscribes and would
       otherwise be walked again inside the same pass. */
    for (const one of [...held.waiting]) {
      if (one.at <= now) {
        held.waiting.delete(one)
        one.run()
      }
    }
    schedule()
  }, wait)
}

/**
 * Asks to be run in `delay` milliseconds, and returns the way to stop asking.
 *
 * The returned function is the whole of the contract: an element that forgets to
 * call it on disconnect leaks a closure over itself for the life of the page,
 * and a panel that opens and closes leaks one per open.
 */
export const subscribe = (delay: number, run: () => void): (() => void) => {
  const held = ticker()
  const entry: Waiting = { at: held.clock.now() + delay, run }
  held.waiting.add(entry)
  schedule()
  return () => {
    held.waiting.delete(entry)
    schedule()
  }
}
