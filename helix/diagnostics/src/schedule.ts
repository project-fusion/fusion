/**
 * When `initDiagnostics()` runs: debounced, idle, and bounded by its own cost.
 *
 * - **After a change**, once changes stop for `quiet` milliseconds, or after
 *   `longest` milliseconds whatever keeps changing: a page that never stops,
 *   such as a carousel adding slides, would otherwise never be judged.
 * - **In an idle moment**, at most `idle` milliseconds later.
 * - **Never sooner than `gap` after the last run, nor sooner than `factor`
 *   times its duration**, so a slow page is judged less often.
 * - **Never in a hidden tab**: a change there waits for the tab to be shown.
 * - **Never when nothing changed** since the last run.
 *
 * The browser's hooks are passed in, so a spec drives it with small numbers
 * and a pretend tab.
 */

/** How long each wait is, in milliseconds. */
export interface Timing {
  /** How long changes must stop for before a run. */
  quiet: number
  /** The longest an idle callback may wait. */
  idle: number
  /** The least time between the end of one run and the start of the next. */
  gap: number
  /** The least time between runs, as a multiple of the last run's duration. */
  factor: number
  /** The longest a change waits for the page to go quiet. */
  longest: number
}

/** The shipped timing. */
export const TIMING: Timing = { factor: 20, gap: 2000, idle: 3000, longest: 10000, quiet: 1000 }

/** What the schedule asks of the browser. */
export interface Browser {
  /** Whether the tab is hidden now. */
  hidden(): boolean
  /** Calls `then` once in an idle moment, at most `timeout` later; returns a cancel. */
  idle(then: () => void, timeout: number): () => void
  /** The time now, in milliseconds. */
  now(): number
  /** Calls `then` when the tab is next shown; returns a removal. */
  shown(then: () => void): () => void
}

/** The browser's own hooks, with a timer where a browser has no idle callback. */
export const browser = (): Browser => ({
  hidden: () => globalThis.document?.visibilityState === 'hidden',
  idle: (then, timeout) => {
    if (typeof globalThis.requestIdleCallback === 'function') {
      const id = globalThis.requestIdleCallback(then, { timeout })
      return () => globalThis.cancelIdleCallback(id)
    }
    /* Safari has no idle callback: the next task, which is what one is at
       worst. */
    const id = setTimeout(then, 1)
    return () => clearTimeout(id)
  },
  now: () => globalThis.performance?.now() ?? Date.now(),
  shown: (then) => {
    const listener = (): void => {
      if (globalThis.document?.visibilityState !== 'hidden') {
        globalThis.document?.removeEventListener('visibilitychange', listener)
        then()
      }
    }
    globalThis.document?.addEventListener('visibilitychange', listener)
    return () => globalThis.document?.removeEventListener('visibilitychange', listener)
  },
})

/** A schedule: told of changes, it decides when `run` runs. */
export interface Schedule {
  /** Something changed: a run follows, as the schedule allows. */
  poke(): void
  /** Ends it: nothing more runs. */
  stop(): void
}

/**
 * A schedule for `run`, which returns how long it took in milliseconds.
 *
 * One run at a time, and a change during a run is a change after it: the run
 * that follows sees it.
 */
export const schedule = (
  run: () => number,
  timing: Timing = TIMING,
  on: Browser = browser(),
): Schedule => {
  let dirty = false
  /* When the first change not yet run for came. */
  let since = Number.POSITIVE_INFINITY
  let live = true
  let ended = Number.NEGATIVE_INFINITY
  let last = 0
  let cancel: (() => void) | undefined
  let quiet: ReturnType<typeof setTimeout> | undefined
  let wait: ReturnType<typeof setTimeout> | undefined

  const go = (): void => {
    cancel = undefined
    if (!live || !dirty) {
      return
    }
    if (on.hidden()) {
      cancel = on.shown(settle)
      return
    }
    /* The gap, measured from the end of the last run. */
    const rest = Math.max(timing.gap, timing.factor * last) - (on.now() - ended)
    if (rest > 0) {
      wait = setTimeout(go, rest)
      return
    }
    cancel = on.idle(() => {
      cancel = undefined
      if (!live || !dirty) {
        return
      }
      dirty = false
      since = Number.POSITIVE_INFINITY
      last = run()
      ended = on.now()
      /* A change made during the run left `dirty` set again. */
      if (dirty) {
        settle()
      }
    }, timing.idle)
  }

  /* Waits for changes to stop, starting again on each one. */
  const settle = (): void => {
    if (!live) {
      return
    }
    clearTimeout(quiet)
    clearTimeout(wait)
    cancel?.()
    cancel = undefined
    quiet = setTimeout(go, Math.min(timing.quiet, Math.max(0, since + timing.longest - on.now())))
  }

  return {
    poke: () => {
      dirty = true
      since = Math.min(since, on.now())
      settle()
    },
    stop: () => {
      live = false
      clearTimeout(quiet)
      clearTimeout(wait)
      cancel?.()
    },
  }
}
