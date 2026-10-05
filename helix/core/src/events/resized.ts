import type { ChangeDetail } from './details.js'

/**
 * A divider settled somewhere new.
 *
 * The notification half of `helix-before-resize`, sent once `position` has
 * moved, with the new position. Not cancelable: the decision was the
 * request's.
 *
 * **Past tense, because `helix-resize` was already taken** by a measurement,
 * the height a sandboxed preview reports for what it drew, and one name cannot
 * carry both.
 */
export class HelixResizedEvent extends CustomEvent<ChangeDetail> {
  static readonly eventName = 'helix-resized'

  constructor(detail: ChangeDetail) {
    super(HelixResizedEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
