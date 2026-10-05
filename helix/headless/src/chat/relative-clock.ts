import { relativeTime, subscribe } from '@fusion.dev/helix-core'
import type { ReactiveController, ReactiveControllerHost } from 'lit'

/** What the clock reads from its host. */
export interface RelativeClockOptions {
  /** The locale the reading is written in. Empty is the runtime's own. */
  locale: () => string
  /** The instant being read, or nothing where there is none. */
  moment: () => Date | undefined
}

/**
 * The time a relative reading is drawn against, moved on when the reading
 * would change.
 *
 * **One wakeup when the words go stale, and none in between.** `relativeTime`
 * says how long its answer holds, so the clock asks core's shared ticker for
 * exactly that moment: a turn a minute old wakes once a minute, an hour old
 * once an hour. Every turn on the page shares the ticker's one timer.
 *
 * `Format Date` keeps the same arrangement inline, and the two belong in one
 * core controller.
 */
export class RelativeClockController implements ReactiveController {
  /** The time the host last drew against, in milliseconds. */
  now = Date.now()

  private stop: (() => void) | undefined = undefined

  constructor(
    private readonly host: ReactiveControllerHost & HTMLElement,
    private readonly options: RelativeClockOptions,
  ) {
    host.addController(this)
  }

  hostConnected(): void {
    this.tick()
  }

  hostDisconnected(): void {
    this.stop?.()
    this.stop = undefined
  }

  /**
   * Reads the clock again and schedules the next reading.
   *
   * The host calls it when the instant or the locale changes, and the ticker
   * calls it when the words go stale. **Only on a page**: a server has nobody
   * to update a reading for, and a subscription there holds the element after
   * its markup is sent.
   */
  tick(): void {
    this.stop?.()
    this.stop = undefined
    this.now = Date.now()
    this.host.requestUpdate()
    const moment = this.options.moment()
    if (!moment || !this.host.isConnected) {
      return
    }
    const { next } = relativeTime(this.options.locale())(moment, new Date(this.now))
    if (Number.isFinite(next)) {
      this.stop = subscribe(next, () => this.tick())
    }
  }
}
