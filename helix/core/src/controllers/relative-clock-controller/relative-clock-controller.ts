import type { ReactiveController, ReactiveControllerHost } from 'lit'
import { subscribe } from '../../utils/ticker/ticker.js'

/** What the clock reads from its host. */
export interface RelativeClockOptions {
  /**
   * When the reading drawn at `now` stops being true, as `relativeTime` and
   * `elapsedTime` say in `next`, in milliseconds from `now`; or `undefined`
   * where the host shows no reading, which reads nothing and schedules
   * nothing.
   */
  expires: (now: Date) => number | undefined
}

/**
 * The time a relative reading is drawn against, moved on when the reading
 * would change: "3 minutes ago" becoming "4 minutes ago".
 *
 * **One wakeup when the words go stale, and none in between.** The reading
 * says how long it holds, so the clock asks core's shared ticker for exactly
 * that moment: a reading a minute old wakes once a minute, an hour old once an
 * hour, and a date never. Every reading on the page shares the ticker's one
 * timer. Chat Message and Format Date draw against it.
 *
 * **Only on a page.** A server has nobody to update a reading for, and a
 * subscription there holds the element after its markup is sent, so off the
 * page `tick()` reads the time and schedules nothing.
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
   * Reads the clock again, asks the host to draw against it, and schedules
   * the next reading.
   *
   * The host calls it when what it reads changes, the instant or the locale,
   * and the ticker calls it when the words go stale. A host with no reading
   * is left as it is.
   */
  tick(): void {
    this.stop?.()
    this.stop = undefined
    const now = Date.now()
    const next = this.options.expires(new Date(now))
    if (next === undefined) {
      return
    }
    this.now = now
    this.host.requestUpdate()
    if (Number.isFinite(next) && this.host.isConnected) {
      this.stop = subscribe(next, () => this.tick())
    }
  }
}
