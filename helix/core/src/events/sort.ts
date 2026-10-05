import type { SortDetail } from './details.js'

/**
 * Fired when the reader asks for a different order.
 *
 * Cancelable, and refusing it leaves the order alone, which is what makes a
 * server-side sort expressible: the consumer refuses the local reorder, fetches,
 * and hands back a new set. This is the element reporting that a heading was
 * clicked, before it acts on it.
 *
 * Not `helix-change`: nothing about the data changed, only the order it is read
 * in, and a consumer listening for changes to a value should not hear a sort.
 * That is the same distinction `helix-filter` is drawn on.
 */
export class HelixSortEvent extends CustomEvent<SortDetail> {
  static readonly eventName = 'helix-sort'

  constructor(detail: SortDetail) {
    super(HelixSortEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
}
