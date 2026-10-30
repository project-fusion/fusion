/*
 * What the chat events carry: the shape of each one's `detail`.
 *
 * Types only, so this module is empty at runtime.
 */

/** Detail carried by `helix-send`. */
export interface SendDetail {
  /** What the reader wrote, as they left it. */
  value: string
}

/** Detail carried by `helix-typing`. */
export interface TypingDetail {
  /** Whether the user is writing now, as a boolean and not a word that reads like one. */
  typing: boolean
}
