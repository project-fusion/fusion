import type { ReactiveController, ReactiveControllerHost } from 'lit'
import { installWebTimers } from '../../capabilities/timers/web.js'
import { type Delay, delay } from '../../machines/countdown.js'

/** What a `DelayController` is for. */
export interface DelayOptions {
  /**
   * Whether the host renders `elapsed`, and so updates when it moves.
   * Defaults to `true`; a wait that only runs `done`, a debounce, leaves its
   * host alone.
   */
  renders?: boolean
}

/**
 * A wait an element starts and restarts: whether it has run out, and what runs
 * when it does.
 *
 * Avatar's `fallback-delay`, Image's `placeholder-delay` and Loader's `delay`
 * each hold a region back until a wait is over, and Listbox's `filter-delay`
 * holds a filter back until typing pauses.
 *
 * **It is core's `delay` on the timers capability**, the wait a phone runs,
 * so a fake clock a conformance scenario sets moves it on the web too.
 *
 * `elapsed` is what a template reads, and the host updates when it moves,
 * unless `renders` is false.
 * Leaving the page stops the wait without forgetting that it ran out, so a
 * loader moved to another place in the page does not wait again.
 */
export class DelayController implements ReactiveController {
  private readonly wait: Delay

  constructor(host: ReactiveControllerHost, options: DelayOptions = {}) {
    this.wait = delay(() => {
      if (options.renders !== false) {
        host.requestUpdate()
      }
    })
    host.addController(this)
  }

  /** Whether the last wait started has run out. */
  get elapsed(): boolean {
    return this.wait.elapsed
  }

  /** Whether a wait is running. */
  get pending(): boolean {
    return this.wait.pending
  }

  hostConnected(): void {}

  hostDisconnected(): void {
    this.cancel()
  }

  /**
   * Starts the wait over: `elapsed` goes back to false, and after `ms`
   * milliseconds it turns true and `done` runs. No `ms` starts no wait, which
   * leaves `elapsed` false.
   */
  start(ms?: number, done?: () => void): void {
    installWebTimers()
    this.wait.start(ms, done)
  }

  /** Stops a running wait, leaving `elapsed` as it is. */
  cancel(): void {
    this.wait.cancel()
  }

  /** Ends a running wait now, as though it had run out. Nothing happens where none is running. */
  flush(): void {
    this.wait.flush()
  }
}
