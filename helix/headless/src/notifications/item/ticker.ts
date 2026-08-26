/**
 * One timer for the page, not one per notification.
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

interface Ticker {
  timer: ReturnType<typeof setTimeout> | undefined
  waiting: Set<Waiting>
}

const KEY = Symbol.for('helix.notifications.ticker')

const ticker = (): Ticker => {
  const global = globalThis as unknown as Record<symbol, Ticker | undefined>
  let found = global[KEY]
  if (!found) {
    found = { timer: undefined, waiting: new Set() }
    global[KEY] = found
  }
  return found
}

/** Sets the one timeout, for the soonest thing anybody is waiting on. */
const schedule = (): void => {
  const held = ticker()
  if (held.timer !== undefined) {
    clearTimeout(held.timer)
    held.timer = undefined
  }
  if (held.waiting.size === 0) {
    return
  }
  const soonest = Math.min(...[...held.waiting].map((one) => one.at))
  /* Floored at a second: a subscriber handed a zero would be re-armed inside the
     callback that fired it, which is a busy loop wearing a timer's clothes. */
  const wait = Math.max(1000, soonest - Date.now())
  held.timer = setTimeout(() => {
    held.timer = undefined
    const now = Date.now()
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
  const entry: Waiting = { at: Date.now() + delay, run }
  held.waiting.add(entry)
  schedule()
  return () => {
    held.waiting.delete(entry)
    schedule()
  }
}
