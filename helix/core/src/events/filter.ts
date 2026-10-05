import type { FilterDetail } from './details.js'

/**
 * Fired when a component narrows what it is showing.
 *
 * Filtering hides rather than removes, so nothing about the value changes and
 * `helix-change` would be a lie. What a consumer wants to know is that the list
 * in front of the reader is no longer the whole list.
 */
export class HelixFilterEvent extends CustomEvent<FilterDetail> {
  static readonly eventName = 'helix-filter'

  constructor(detail: FilterDetail) {
    super(HelixFilterEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
}
