import type { SelectDetail } from './details.js'

/**
 * Fired when the reader selects an item in a set.
 *
 * Bubbles and is composed, because this is how a set coordinates: a tree, a
 * tab list and a toggle group all learn which of their children was chosen by
 * hearing it arrive.
 */
export class HelixSelectEvent extends CustomEvent<SelectDetail> {
  static readonly eventName = 'helix-select'

  constructor(detail: SelectDetail) {
    super(HelixSelectEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
}
