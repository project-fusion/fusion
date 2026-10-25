import type { SelectDetail } from './details.js'

/**
 * The reader chose an item in a set, and the choice can be refused.
 *
 * Bubbles and is composed, because this is how a set coordinates: a tree, a
 * tab list and a toggle group all learn which of their children was chosen by
 * hearing it arrive. Cancelable: refusing it leaves the set as it was.
 *
 * **What follows is the set's own notification.** A set that holds a
 * selection, such as Data Table or Log, sends `helix-select` once it has
 * moved. A set that makes the chosen child current sends `helix-activate`, and
 * a set holding a value sends `change`.
 *
 * @followedBy helix-select helix-activate change
 */
export class HelixBeforeSelectEvent extends CustomEvent<SelectDetail> {
  static readonly eventName = 'helix-before-select'

  constructor(detail: SelectDetail) {
    super(HelixBeforeSelectEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
}
