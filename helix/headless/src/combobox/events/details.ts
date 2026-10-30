/*
 * What the combobox events carry: the shape of each one's `detail`.
 *
 * Types only, so this module is empty at runtime.
 */

/** Detail carried by `helix-create`. */
export interface CreateDetail {
  /** What the reader typed, which is being offered as a new answer. */
  value: string
}
