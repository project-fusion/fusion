import type { ViewChangeDetail } from './details.js'

/**
 * The table's view changed.
 *
 * The notification after `helix-before-view-change`, sent when nobody refused
 * it, with the view now in force. Not cancelable: the decision was the
 * request's.
 */
export class HelixViewChangeEvent extends CustomEvent<ViewChangeDetail> {
  static readonly eventName = 'helix-view-change'

  constructor(detail: ViewChangeDetail) {
    super(HelixViewChangeEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
