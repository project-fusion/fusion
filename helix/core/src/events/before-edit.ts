import type { ChangeDetail } from './details.js'

/** Source is about to be edited, and can be refused. */
export class HelixBeforeEditEvent extends CustomEvent<ChangeDetail> {
  static readonly eventName = 'helix-before-edit'

  constructor(detail: ChangeDetail) {
    super(HelixBeforeEditEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
}
