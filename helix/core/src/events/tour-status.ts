import type { TourStatusDetail } from './details.js'

/**
 * A tour's progress changed in a way no stop says: it is waiting at a stop
 * for its target, or it was skipped, or it was completed. Zag's
 * `onStatusChange`.
 *
 * `index` is the stop it happened at. Not cancelable: `helix-before-close`
 * is the refusable half of ending a tour, and this reports what happened.
 * Bubbles and is composed.
 */
export class HelixTourStatusEvent extends CustomEvent<TourStatusDetail> {
  static readonly eventName = 'helix-tour-status'

  constructor(detail: TourStatusDetail) {
    super(HelixTourStatusEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
