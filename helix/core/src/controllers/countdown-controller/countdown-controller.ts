import type { ReactiveController, ReactiveControllerHost } from 'lit'

/** What a `CountdownController` does when its time runs out, and when it stops and starts. */
export interface CountdownOptions {
  /** Runs once the time is spent. */
  done: () => void
  /**
   * Whether a hidden page holds the clock, as a pointer on the message does,
   * so a timed message is not spent in a background tab. Counted as one hold
   * however often the page hides, and a clock started while the page is
   * hidden waits for it to show. Defaults to `false`.
   */
  holdWhileHidden?: boolean
  /** Runs with `true` when the clock stops partway and `false` when it runs again. */
  paused?: (paused: boolean) => void
}

/**
 * A lifetime that pauses: a message that dismisses itself after a time, and
 * holds that time while a reader is on it.
 *
 * Toast's items and Announcement each dismiss themselves after `duration`,
 * and each stops the clock while the pointer or focus is on the message, so a
 * reader partway through is not cut off. Resuming continues from what was
 * left rather than starting over.
 *
 * **Holds are counted, not flagged.** Hover and focus stop the same clock and
 * are independent: a pointer can leave while focus stays. Uncounted, a reader
 * who tabs into a message and then moves the pointer off it has the clock
 * restarted underneath them. Only the last one out starts it again.
 *
 * **Leaving the page pauses it**, keeping the time already spent, and drops
 * the holds, since a pointer or focus on a detached element never leaves it.
 * Coming back does not resume on its own: the host says whether it should,
 * such as only while it is still showing.
 *
 * **A hidden page holds it too, where the host asks** with `holdWhileHidden`:
 * RAC's toast queue stops its timers while the window is in the background. `DelayController` is the other wait
 * in core, for a wait that starts over and forgets itself on leaving.
 */
export class CountdownController implements ReactiveController {
  /** When the current run began, or nothing while the clock is stopped. */
  private startedAt: number | undefined

  /** What is left of the time, so resuming continues rather than restarts. */
  private remaining: number | undefined

  private timer: ReturnType<typeof setTimeout> | undefined

  /** How many reasons there are to hold the clock. */
  private holds = 0

  /** Whether a hidden page is one of the holds, with `holdWhileHidden`. */
  private hidden = false

  /** Holds the clock as the page hides, and lets it go as the page shows. */
  private readonly handleVisibility = (): void => {
    if (document.hidden === this.hidden) {
      return
    }
    this.hidden = document.hidden
    if (this.hidden) {
      this.hold()
    } else {
      this.release()
    }
  }

  constructor(
    host: ReactiveControllerHost,
    private readonly options: CountdownOptions,
  ) {
    host.addController(this)
  }

  /** Whether the clock is running now. */
  get running(): boolean {
    return this.timer !== undefined
  }

  hostConnected(): void {
    if (this.options.holdWhileHidden && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibility)
      this.handleVisibility()
    }
  }

  hostDisconnected(): void {
    this.pause()
    this.holds = 0
    this.hidden = false
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibility)
    }
  }

  /** Starts the clock at `ms`. Nothing, zero or less starts nothing. */
  start(ms: number | undefined): void {
    if (ms === undefined || !(ms > 0)) {
      return
    }
    this.remaining = ms
    this.resume()
  }

  /** Stops the clock and keeps the time that is left. */
  pause(): void {
    if (this.timer === undefined || this.startedAt === undefined) {
      return
    }
    clearTimeout(this.timer)
    this.timer = undefined
    this.remaining = Math.max((this.remaining ?? 0) - (Date.now() - this.startedAt), 0)
    this.startedAt = undefined
    this.options.paused?.(true)
  }

  /** Runs the clock again from where it stopped. */
  resume(): void {
    if (
      this.hidden ||
      this.timer !== undefined ||
      this.remaining === undefined ||
      this.remaining <= 0
    ) {
      return
    }
    this.startedAt = Date.now()
    this.options.paused?.(false)
    this.timer = setTimeout(() => {
      /* Spent, so nothing is left to resume: a page that refused the
         dismissal heard it again one duration after every hover. */
      this.cancel()
      this.options.done()
    }, this.remaining)
  }

  /**
   * Stops the clock for good, as a dismissal does: nothing is left to resume
   * until the next `start`, so a hold and a release after it run nothing.
   */
  cancel(): void {
    clearTimeout(this.timer)
    this.timer = undefined
    this.remaining = undefined
    this.startedAt = undefined
  }

  /** One more reason to hold the clock, such as a pointer arriving. */
  hold(): void {
    this.holds += 1
    this.pause()
  }

  /** One reason fewer, and the clock runs again once none is left. */
  release(): void {
    this.holds = Math.max(this.holds - 1, 0)
    if (this.holds === 0) {
      this.resume()
    }
  }
}
