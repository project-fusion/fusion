import type { FacetDetail } from './details.js'

/**
 * The reader is about to change which values a field is filtered by.
 *
 * **Not `helix-before-filter`, which is a different thing already taken.** That one
 * says a list narrowed itself to a string, and `Data Table` and `Listbox` both
 * dispatch it with exactly that meaning. This one carries a structured filter:
 * a field, a comparison and a set of values, which is a shape neither of those
 * has and neither should grow.
 *
 * Cancelable, and refusing it is how a consumer takes the decision for one
 * interaction, the way `requestChange` documents for every stateful change here.
 *
 * @followedBy helix-facet
 */
export class HelixBeforeFacetEvent extends CustomEvent<FacetDetail> {
  static readonly eventName = 'helix-before-facet'

  constructor(detail: FacetDetail) {
    super(HelixBeforeFacetEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
}
