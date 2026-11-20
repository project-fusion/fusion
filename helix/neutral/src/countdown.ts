/**
 * How an element spends a time it is given and waits its turn. Read as
 * syntax, as `tree.ts` says.
 */

/**
 * A time the element spends once it is drawn, and the event it sends once
 * the time is spent, as an announcement dismisses itself after its
 * `duration`.
 *
 * **It is core's `countdown`**, on the timers capability, which the web's
 * `CountdownController` and a phone's runtime both run, so a fake clock
 * moves both. A touch, focus, and a page or an app away from the front each
 * hold the clock, and it runs on from what was left once none does.
 */
export interface Countdown {
  /** The prop that holds the time, in milliseconds, or as a CSS time such as `8s`. */
  readonly duration: string
  /** The event sent once the time is spent. */
  readonly onDone: string
  /** The state that holds while the clock is stopped partway. The source declares it in `states`. */
  readonly paused: string
  /**
   * A state that keeps the clock from starting while it holds, and starts it
   * as it stops holding, as a queued announcement's `waiting`.
   */
  readonly waitWhile?: string
}

/**
 * A turn the element waits for behind the elements of its kind before it,
 * while the prop that `prop` names holds on it and on them, as a queued announcement
 * waits for the one before it to be removed.
 */
export interface Queue {
  /** The prop that puts the element in the queue. */
  readonly prop: string
  /** The state that holds while a queued element before it is still there. */
  readonly queued: string
}
