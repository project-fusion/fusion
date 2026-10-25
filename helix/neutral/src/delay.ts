/**
 * How an element holds something back until a wait is over. Read as syntax,
 * as `tree.ts` says.
 */

/**
 * A wait the element starts as it is drawn, and a state that holds while it
 * runs, as a loader waits out its `delay` so quick work never flashes one.
 *
 * **It is core's `delay`**, on the timers capability, which the web's
 * `DelayController` and a phone's runtime both run, so a fake clock moves
 * both. A wait of zero or less, or none, starts nothing.
 */
export interface Delay {
  /** The prop that holds the wait, in milliseconds. */
  readonly after: string
  /**
   * A prop whose change starts the wait again, as an image's `src`: a new
   * picture waits again before its placeholder shows.
   */
  readonly again?: string
  /**
   * A prop that, while it holds, stops the state from holding, and that
   * starts the wait again as it stops holding, as a loader's `idle`.
   */
  readonly restarts?: string
  /**
   * The state that holds while the wait runs, which `when()`, `bind()` and
   * a rule's `state` read, as a loader is `waiting`. The source declares it
   * in `states`.
   */
  readonly waiting: string
}

/** A wait an element starts as it is drawn. */
export const delay = (fields: Delay): Delay => fields
