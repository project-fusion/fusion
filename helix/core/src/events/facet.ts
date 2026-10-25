import type { FacetDetail } from './details.js'

/**
 * A field is filtered by different values.
 *
 * The notification after `helix-before-facet`, sent once the filter has moved,
 * with the field's values now in force. Not cancelable: the decision was the
 * request's.
 */
export class HelixFacetEvent extends CustomEvent<FacetDetail> {
  static readonly eventName = 'helix-facet'

  constructor(detail: FacetDetail) {
    super(HelixFacetEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
