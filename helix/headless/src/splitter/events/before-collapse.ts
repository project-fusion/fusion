import type { ChangeDetail } from '@fusion.dev/helix-core'

/**
 * A pane is about to collapse or reopen, and can be refused.
 *
 * @followedBy helix-collapse
 */
export class HelixBeforeCollapseEvent extends CustomEvent<ChangeDetail> {
  static readonly eventName = 'helix-before-collapse'

  constructor(detail: ChangeDetail) {
    super(HelixBeforeCollapseEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
}
