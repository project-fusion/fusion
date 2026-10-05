import type { ChangeDetail } from './details.js'

/**
 * Source was edited.
 *
 * The notification half of `helix-before-edit`, sent once the pane holds the
 * new source, with that source. Not cancelable: the decision was the
 * request's.
 */
export class HelixEditEvent extends CustomEvent<ChangeDetail> {
  static readonly eventName = 'helix-edit'

  constructor(detail: ChangeDetail) {
    super(HelixEditEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
