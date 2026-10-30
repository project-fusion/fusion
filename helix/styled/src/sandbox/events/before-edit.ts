import type { ChangeDetail } from '@fusion.dev/helix-core'

/**
 * Source is about to be edited, and can be refused.
 *
 * @followedBy helix-edit
 */
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
