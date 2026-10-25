/**
 * How an element keeps the time of day. Read as syntax, as `tree.ts` says.
 */

/**
 * A tick on the time of day, as a relative time moves from "4 minutes ago"
 * to "5 minutes ago" as its words go stale.
 *
 * **It is core's `wallClock`**, on the timers capability, which the web's
 * `RelativeClockController` and a phone's runtime both run, so a fake clock
 * moves both. Each derivation of the element is given the time of the last
 * tick as `now`, in milliseconds. It stops while the page or the app is
 * away, and catches up as it comes back.
 */
export interface Clock {
  /**
   * The derivation in `@fusion.dev/helix-core/derivations` that says, from
   * the props and `now`, how many milliseconds what is drawn holds, as
   * `format-date-expires` does: `undefined` keeps no clock, and a wait that
   * is not finite draws once and never ticks again.
   */
  readonly expires: string
  /**
   * The props whose change starts the clock again, reading the time of day
   * afresh, as a date's `date` and `relative` do. A change of any other prop
   * draws again from the last tick, as the web does. None names every prop.
   */
  readonly restarts?: readonly string[]
}

/** A tick on the time of day. */
export const clock = (fields: Clock): Clock => fields
