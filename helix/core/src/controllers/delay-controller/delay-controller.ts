import type { ReactiveController, ReactiveControllerHost } from 'lit'

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
 * holds a filter back until typing pauses. Each kept a timer, a flag and the
 * clean-up by hand; this keeps the three together, and clears the timer when
 * the element leaves the page.
 *
 * `elapsed` is what a template reads, and the host updates when it moves,
 * unless `renders` is false.
 * Leaving the page stops the wait without forgetting that it ran out, so a
 * loader moved to another place in the page does not wait again.
 */
export class DelayController implements ReactiveController {
  /** Whether the last wait started has run out. */
  elapsed = false

  private timer: ReturnType<typeof setTimeout> | undefined = undefined

  private done: (() => void) | undefined = undefined

  constructor(
    private readonly host: ReactiveControllerHost,
    private readonly options: DelayOptions = {},
  ) {
    host.addController(this)
  }

  /** Whether a wait is running. */
  get pending(): boolean {
    return this.timer !== undefined
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
    this.cancel()
    this.mark(false)
    if (ms === undefined) {
      return
    }
    this.done = done
    this.timer = setTimeout(() => this.finish(), ms)
  }

  /** Stops a running wait, leaving `elapsed` as it is. */
  cancel(): void {
    clearTimeout(this.timer)
    this.timer = undefined
    this.done = undefined
  }

  /** Ends a running wait now, as though it had run out. Nothing happens where none is running. */
  flush(): void {
    if (this.timer === undefined) {
      return
    }
    clearTimeout(this.timer)
    this.finish()
  }

  private finish(): void {
    const done = this.done
    this.timer = undefined
    this.done = undefined
    this.mark(true)
    done?.()
  }

  private mark(elapsed: boolean): void {
    if (elapsed === this.elapsed) {
      return
    }
    this.elapsed = elapsed
    if (this.options.renders !== false) {
      this.host.requestUpdate()
    }
  }
}
