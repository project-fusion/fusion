import type { ChangeDetail } from './details.js'

/** A message is about to be pinned or unpinned, and can be refused. */
export class HelixBeforePinEvent extends CustomEvent<ChangeDetail> {
  static readonly eventName = 'helix-before-pin'

  constructor(detail: ChangeDetail) {
    super(HelixBeforePinEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
}
