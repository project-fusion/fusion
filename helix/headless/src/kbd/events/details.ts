/*
 * What the kbd events carry: the shape of each one's `detail`.
 *
 * Types only, so this module is empty at runtime.
 */

/** What a shortcut reports when its chord is pressed. */
export interface ShortcutDetail {
  /**
   * The chord that matched, as it was written.
   *
   * Given back rather than left to be remembered, so one handler can serve
   * several keys and answer by comparing what it was told.
   */
  keys: string
}
