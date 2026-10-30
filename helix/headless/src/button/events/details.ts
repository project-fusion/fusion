/*
 * What the button events carry: the shape of each one's `detail`.
 *
 * Types only, so this module is empty at runtime.
 */

import type { PressPointerType } from '@fusion.dev/helix-core'

/** Detail carried by `helix-press`. */
export interface PressDetail {
  /** What the press came from. */
  pointerType: PressPointerType
}
