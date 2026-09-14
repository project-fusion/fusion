import type { ReactiveController, ReactiveControllerHost } from 'lit'

/**
 * How long the reader has been still, which decides when the bar goes.
 *
 * A wait rather than leaving with the pointer, or a reader moving across the
 * picture to reach a control watches the bar vanish under them. The wait is
 * only ever about *idling*: whether a paused video keeps its bar is the
 * element's decision, and this only says when the reader stopped.
 *
 * The delay is asked for on every restart rather than taken once, because it
 * is a property the consumer can change while the video plays.
 */
export class IdleController implements ReactiveController {
  private timer: ReturnType<typeof setTimeout> | undefined

  constructor(
    host: ReactiveControllerHost,
    private readonly delay: () => number,
    private readonly report: (idle: boolean) => void,
  ) {
    host.addController(this)
  }

  /**
   * Restarts the wait, on anything that counts as the reader being here.
   *
   * Pointer movement and focus both count, and both have to: a reader using the
   * keyboard never moves a pointer, and a bar that only answered the mouse
   * would leave them nothing to look at. Zero turns the wait off and the bar
   * goes immediately; a large number keeps it up for as long as anyone is
   * likely to look.
   */
  readonly stir = (): void => {
    this.report(false)
    clearTimeout(this.timer)
    const delay = this.delay()
    if (delay > 0) {
      this.timer = setTimeout(() => {
        this.report(true)
      }, delay)
    }
  }

  /**
   * Leaving is the one case that does not wait: the reader has gone somewhere
   * else, and there is nothing to reach for.
   */
  readonly leave = (): void => {
    clearTimeout(this.timer)
    this.report(true)
  }

  hostDisconnected(): void {
    clearTimeout(this.timer)
  }
}
