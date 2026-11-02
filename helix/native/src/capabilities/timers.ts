import type { Timers } from '@fusion.dev/helix-core/capabilities/timers'
import { AppState } from 'react-native'

/**
 * The `performance` React Native installs on every app's global object, from
 * `src/private/setup/setUpPerformance.js`. Its types declare `setTimeout` and
 * `requestAnimationFrame`, and leave `performance` out.
 */
declare const performance: { readonly now: () => number }

/**
 * Whether the app is in front.
 *
 * **Only `background` is away.** iOS reports `inactive` while Control Center
 * or the app switcher covers an app that is still drawn, and a state that is
 * `unknown` or missing counts as in front, as the server's timers count a
 * page.
 */
const shown = (): boolean => AppState.currentState !== 'background'

/**
 * Time in a React Native app: `performance.now()` for the clock, `Date.now()`
 * for the time of day, `setTimeout` for a timeout, `requestAnimationFrame` for a frame, and `AppState` for
 * whether the app is in front.
 *
 * **`performance.now()` is the clock because it only moves forward.** React
 * Native reads it from a steady native clock, and `Date.now()` follows the
 * system clock, which the system can set back.
 *
 * `observeVisible` hears `AppState`'s change and calls `changed` only where
 * the app has come to the front or left it, so a move between `active` and
 * `inactive` calls nothing.
 */
export const nativeTimers: Timers = {
  frame: (done) => {
    const handle = requestAnimationFrame(done)
    return () => {
      cancelAnimationFrame(handle)
    }
  },
  now: () => performance.now(),
  observeVisible: (changed) => {
    let last = shown()
    const subscription = AppState.addEventListener('change', () => {
      const now = shown()
      if (now !== last) {
        last = now
        changed(now)
      }
    })
    return () => {
      subscription.remove()
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
