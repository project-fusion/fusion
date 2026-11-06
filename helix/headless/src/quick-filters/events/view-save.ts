import type { ViewSaveDetail } from './details.js'

/**
 * The table's view was saved.
 *
 * The notification after `helix-before-view-save`, sent when nobody refused
 * it. Not cancelable: the decision was the request's.
 */
export class HelixViewSaveEvent extends CustomEvent<ViewSaveDetail> {
  static readonly eventName = 'helix-view-save'

  constructor(detail: ViewSaveDetail) {
    super(HelixViewSaveEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
