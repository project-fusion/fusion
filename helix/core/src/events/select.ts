import type { SelectDetail } from './details.js'

/**
 * A set holds a different selection.
 *
 * The notification after a `helix-before-select` that asked to change what is
 * selected, sent once the selection has moved, with the selection now in
 * force. Not cancelable: the decision was the request's.
 */
export class HelixSelectEvent extends CustomEvent<SelectDetail> {
  static readonly eventName = 'helix-select'

  constructor(detail: SelectDetail) {
    super(HelixSelectEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
