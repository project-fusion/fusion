import type { Timers } from './contract.generated.js'
import { setTimers, timers } from './index.js'
import { serverTimers } from './server.js'

/** Whether the page is in front: drawn in a tab or a window that is showing. */
const shown = (): boolean => document.visibilityState === 'visible'

/**
 * Time in a browser: `performance.now()` for the clock, `Date.now()` for the
 * time of day, `setTimeout` for a timeout, `requestAnimationFrame` for a frame, and the document's
 * `visibilityState` for whether the page is in front.
 *
 * **`performance.now()` is the clock because it only moves forward.**
 * `Date.now()` follows the system clock, which the system can set back.
 *
 * Each timeout is its own `setTimeout`. `utils/ticker` shares one timeout
 * between many waits and floors each wait at a second, which suits a clock
 * that shows minutes and does not suit a timeout of a given length.
 */
export const webTimers: Timers = {
  frame: (done) => {
    const handle = requestAnimationFrame(done)
    return () => {
      cancelAnimationFrame(handle)
    }
  },
  now: () => performance.now(),
  observeVisible: (changed) => {
    const heard = (): void => {
      changed(shown())
    }
    document.addEventListener('visibilitychange', heard)
    return () => {
      document.removeEventListener('visibilitychange', heard)
    }
  },
  timeout: (ms, done) => {
    const handle = setTimeout(done, ms)
    return () => {
      clearTimeout(handle)
    }
  },
  visible: shown,
  wall: () => Date.now(),
}

/**
 * Sets the browser's timers as the capability where nothing has set one yet,
 * and leaves a fake or an app's own in place.
 *
 * **A web controller calls it as it starts a clock**, so a delay, a countdown
 * and a wall clock run on the page's time, and a conformance scenario that
 * sets a fake clock first moves them with it. Off a page, the server's stay.
 */
export const installWebTimers = (): void => {
  if (
    timers() === serverTimers &&
    typeof document !== 'undefined' &&
    typeof window !== 'undefined'
  ) {
    setTimers(webTimers)
  }
}
