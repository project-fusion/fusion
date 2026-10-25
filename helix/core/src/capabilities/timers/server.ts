import type { Stop } from '../types.generated.js'
import type { Timers } from './contract.generated.js'

/** Stops nothing, since nothing was started. */
const stopNothing: Stop = () => undefined

/**
 * Time on a server: the clock stands at zero, and nothing started calls back,
 * since a server renders once and draws no frame.
 *
 * **The page counts as in front**, as a page is when the browser first draws
 * it, so a machine starts in the same state on the server and in the browser's
 * first render.
 */
export const serverTimers: Timers = {
  frame: () => stopNothing,
  now: () => 0,
  observeVisible: () => stopNothing,
  timeout: () => stopNothing,
  visible: () => true,
  wall: () => Date.now(),
}
