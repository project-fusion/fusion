import type { ReactiveController, ReactiveControllerHost } from 'lit'
import { timers } from '../../capabilities/timers/index.js'
import { installWebTimers } from '../../capabilities/timers/web.js'
import type { Stop } from '../../capabilities/types.generated.js'
import { wallClock } from '../../machines/wall-clock.js'

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
 * says how long it holds, and the clock wakes at exactly that moment: a
 * reading a minute old wakes once a minute, an hour old once an hour, and a
 * date never. Chat Message, Timeline and Format Date draw against it.
 *
 * **It is core's `wallClock` on the timers capability**, the clock a phone
 * runs, so a fake clock a conformance scenario sets moves it on the web too.
 * It stops while the page is hidden and reads the time again as it shows.
 *
 * **Only on a page.** A server has nobody to update a reading for, so off the
 * page `tick()` reads the time and schedules nothing.
 */
export class RelativeClockController implements ReactiveController {
  /** The time the host last drew against, in milliseconds. */
  now = Date.now()

  private stop: Stop | undefined = undefined

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
   * and the clock calls it when the words go stale. A host with no reading
   * is left as it is.
   */
  tick(): void {
    this.stop?.()
    this.stop = undefined
    if (!this.host.isConnected) {
      const now = timers().wall()
      if (this.options.expires(new Date(now)) !== undefined) {
        this.now = now
        this.host.requestUpdate()
      }
      return
    }
    installWebTimers()
    this.stop = wallClock({
      expires: (now) => this.options.expires(new Date(now)),
      tick: (now) => {
        this.now = now
        this.host.requestUpdate()
      },
    })
  }
}
