import type { ViewChangeDetail } from './details.js'

/**
 * The table's view is about to change: the search, a filter, the sort, the
 * columns or the page size.
 *
 * Sent before the event for the one part that changes, such as
 * `helix-before-sort`, and for a call to `requestView`. Cancelable: cancel it
 * to keep the view as it is, fetch the rows for `detail.view` from a server,
 * and set `view`, `rows` and `total` yourself.
 *
 * @followedBy helix-view-change
 */
export class HelixBeforeViewChangeEvent extends CustomEvent<ViewChangeDetail> {
  static readonly eventName = 'helix-before-view-change'

  constructor(detail: ViewChangeDetail) {
    super(HelixBeforeViewChangeEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
}
