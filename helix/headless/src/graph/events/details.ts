/*
 * What the graph events carry: the shape of each one's `detail`.
 *
 * Types only, so this module is empty at runtime.
 */

/** Where each note was laid out, by its `id`, in the renderer's own units. */
export interface GraphLayoutDetail {
  positions: Record<string, { x: number; y: number; z?: number | undefined }>
}

/** What changed on a graph frame that the renderer has to hear. */
export interface GraphPartChangeDetail {
  /**
   * `data` for the notes or the links, which are drawn again; `focus` for the
   * selected note or the depth, which change what is emphasized and shown;
   * `gestures` for which gestures the renderer takes.
   */
  kind: 'data' | 'focus' | 'gestures'
}

/** One signal between two notes, as the frame's `signal()` sends it. */
export interface GraphSignalDetail {
  /** The note the signal leaves, by its `id`. */
  from: string
  /**
   * What the signal means, which colors it. Where none is given, the signal
   * turns from the first note's color to the second's as it crosses.
   */
  tone?: 'accent' | 'danger' | 'info' | 'neutral' | 'primary' | 'success' | 'warning' | undefined
  /** The note the signal reaches, by its `id`. */
  to: string
}

/** Detail carried by `helix-before-graph-filter` and `helix-graph-filter`. */
export interface GraphFilterDetail {
  /** The groups the graph would hide, by name: every group the reader has turned off, after this press. */
  hidden: readonly string[]
}
