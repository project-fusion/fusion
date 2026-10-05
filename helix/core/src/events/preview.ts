import type { ChangeDetail } from './details.js'

/**
 * A control is showing what a press would choose, before anything is chosen:
 * a rating lighting the marks under the pointer. Zag's `onHoverChange`.
 *
 * `value` is the value being previewed, and `''` once the preview ends and
 * the control shows its own value again. Sent each time the preview changes,
 * not on every pointer move. Not cancelable, since a preview changes nothing.
 * Bubbles and is composed.
 */
export class HelixPreviewEvent extends CustomEvent<ChangeDetail> {
  static readonly eventName = 'helix-preview'

  constructor(detail: ChangeDetail) {
    super(HelixPreviewEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
