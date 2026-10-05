import type { SelectDetail } from './details.js'

/**
 * A set holds a different selection.
 *
 * The notification after a `helix-select` that asked to change what is
 * selected, sent once the selection has moved, with the selection now in
 * force. Not cancelable, and past tense for the reason `helix-sorted` is.
 */
export class HelixSelectedEvent extends CustomEvent<SelectDetail> {
  static readonly eventName = 'helix-selected'

  constructor(detail: SelectDetail) {
    super(HelixSelectedEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
