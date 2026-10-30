/*
 * What the tour events carry: the shape of each one's `detail`.
 *
 * Types only, so this module is empty at runtime.
 */

/** What a stop's own controls ask the tour to do. */
export interface TourAskDetail {
  /**
   * Which control was pressed.
   */
  what: 'back' | 'next' | 'skip'
}

/** Detail carried by `helix-tour-status`. */
export interface TourStatusDetail {
  /** The stop it happened at, counting from 0. */
  index: number
  /** Waiting at a `wait` stop for its target, skipped, or completed. */
  status: 'completed' | 'skipped' | 'waiting'
}
