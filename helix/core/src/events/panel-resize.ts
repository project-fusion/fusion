import type { ChangeDetail } from './details.js'

/**
 * A sandbox's panel settled at a new height.
 *
 * The notification half of `helix-before-panel-resize`, sent once `panelSize`
 * has moved, with the height in pixels. Not cancelable: the decision was the
 * request's.
 */
export class HelixPanelResizeEvent extends CustomEvent<ChangeDetail> {
  static readonly eventName = 'helix-panel-resize'

  constructor(detail: ChangeDetail) {
    super(HelixPanelResizeEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
