/*
 * What the meter events carry: the shape of each one's `detail`.
 *
 * Types only, so this module is empty at runtime.
 */

/** Detail carried by `helix-band`. */
export interface BandDetail {
  /** The band the reading is in now, or `''` where it is in none. */
  band: '' | 'fair' | 'good' | 'poor'
}
