import type { SortDetail } from './details.js'

/**
 * The reader asked for a different order, and the order can be refused.
 *
 * Cancelable, and refusing it leaves the order alone, which is what makes a
 * server-side sort expressible: the consumer refuses the local reorder, fetches,
 * and hands back a new set. This is the element reporting that a heading was
 * clicked, before it acts on it.
 *
 * Not `helix-before-change`: nothing about the data changed, only the order it
 * is read in, and a consumer listening for changes to a value should not hear a
 * sort. That is the same distinction `helix-before-filter` is drawn on.
 *
 * @followedBy helix-sort
 */
export class HelixBeforeSortEvent extends CustomEvent<SortDetail> {
  static readonly eventName = 'helix-before-sort'

  constructor(detail: SortDetail) {
    super(HelixBeforeSortEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
}
