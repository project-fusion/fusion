import type { ChangeDetail } from './details.js'

/**
 * The divider between a sandbox's panes settled somewhere new.
 *
 * The notification half of `helix-before-split`, sent once `split` has moved,
 * with the lead pane's new share. Not cancelable: the decision was the
 * request's.
 */
export class HelixSplitEvent extends CustomEvent<ChangeDetail> {
  static readonly eventName = 'helix-split'

  constructor(detail: ChangeDetail) {
    super(HelixSplitEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
