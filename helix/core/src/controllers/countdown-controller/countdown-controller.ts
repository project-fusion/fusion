import type { ReactiveController, ReactiveControllerHost } from 'lit'
import { installWebTimers } from '../../capabilities/timers/web.js'
import { type Countdown, countdown } from '../../machines/countdown.js'

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
 * **It is core's `countdown` on the timers capability**, the clock a phone
 * runs, so a fake clock a conformance scenario sets moves it on the web too.
 * Holds are counted, not flagged: hover and focus stop the same clock, and
 * only the last one out starts it again.
 *
 * **Leaving the page pauses it**, keeping the time already spent, and drops
 * the holds, since a pointer or focus on a detached element never leaves it.
 * Coming back does not resume on its own: the host says whether it should.
 *
 * **A hidden page holds it too, where the host asks** with `holdWhileHidden`,
 * and only while the host is on the page.
 */
export class CountdownController implements ReactiveController {
  /** The clock, built as it is first used and again as the host arrives or leaves. */
  private clock: Countdown | undefined

  /** Whether the host is on the page, so a hidden page is watched. */
  private connected = false

  constructor(
    host: ReactiveControllerHost,
    private readonly options: CountdownOptions,
  ) {
    host.addController(this)
  }

  /** Whether the clock is running now. */
  get running(): boolean {
    return this.clock?.running ?? false
  }

  hostConnected(): void {
    this.connected = true
    if (this.options.holdWhileHidden) {
      this.rebuild()
    }
  }

  hostDisconnected(): void {
    this.connected = false
    this.rebuild()
  }

  /** Starts the clock at `ms`. Nothing, zero or less starts nothing. */
  start(ms: number | undefined): void {
    this.current().start(ms)
  }

  /** Stops the clock and keeps the time that is left. */
  pause(): void {
    this.clock?.pause()
  }

  /** Runs the clock again from where it stopped. */
  resume(): void {
    this.clock?.resume()
  }

  /**
   * Stops the clock for good, as a dismissal does: nothing is left to resume
   * until the next `start`, so a hold and a release after it run nothing.
   */
  cancel(): void {
    this.clock?.cancel()
  }

  /** One more reason to hold the clock, such as a pointer arriving. */
  hold(): void {
    this.current().hold()
  }

  /** One reason fewer, and the clock runs again once none is left. */
  release(): void {
    this.clock?.release()
  }

  private current(): Countdown {
    if (this.clock === undefined) {
      installWebTimers()
      this.clock = countdown(this.build())
    }
    return this.clock
  }

  /** What a new clock is built from: the time the last one left, stopped. */
  private build(left?: number): Parameters<typeof countdown>[0] {
    const { done, paused } = this.options
    return {
      done,
      holdWhileHidden: this.options.holdWhileHidden === true && this.connected,
      ...(left === undefined ? {} : { left }),
      ...(paused === undefined ? {} : { paused }),
    }
  }

  /** Stops the clock, drops its holds and its watch, and carries its time into a new one. */
  private rebuild(): void {
    const was = this.clock
    if (was === undefined) {
      return
    }
    was.dispose()
    installWebTimers()
    this.clock = countdown(this.build(was.left))
  }
}
