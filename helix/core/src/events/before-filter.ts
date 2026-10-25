import type { FilterDetail } from './details.js'

/**
 * A component is about to narrow what it is showing, and the narrowing can be
 * refused.
 *
 * Filtering hides rather than removes, so nothing about the value changes and
 * `helix-before-change` would be a lie. What a consumer wants to know is that
 * the list in front of the reader is about to stop being the whole list.
 * Cancelable: refusing it leaves the list as it was, so a page can filter on a
 * server instead.
 *
 * @followedBy helix-filter
 */
export class HelixBeforeFilterEvent extends CustomEvent<FilterDetail> {
  static readonly eventName = 'helix-before-filter'

  constructor(detail: FilterDetail) {
    super(HelixBeforeFilterEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
}
