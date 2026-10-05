import type { ChangeDetail } from './details.js'

/**
 * A sandbox's panel is about to change height, and can be refused.
 *
 * The sibling of `helix-before-split`, and named for the divider rather than for
 * the axis because a reader binding one of the two is choosing which divider they
 * care about. `value` is pixels here and a percentage there, which is what each
 * property already publishes.
 */
export class HelixBeforePanelResizeEvent extends CustomEvent<ChangeDetail> {
  static readonly eventName = 'helix-before-panel-resize'

  constructor(detail: ChangeDetail) {
    super(HelixBeforePanelResizeEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
}
