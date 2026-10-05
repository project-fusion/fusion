import type { CaretDetail } from './details.js'

/**
 * Fired when the cursor moves in a text editor.
 *
 * Not cancelable, unlike everything else here. The others announce something
 * about to happen and a listener can refuse it; this one reports where the
 * caret already is, and there is nothing left to refuse.
 *
 * It fires on every keystroke and every arrow press, which is why the status
 * bar reads it from the DOM rather than through a framework's state: routing a
 * caret position through React would re-render the workbench on every cursor
 * move.
 */
export class HelixCaretEvent extends CustomEvent<CaretDetail> {
  static readonly eventName = 'helix-caret'

  constructor(detail: CaretDetail) {
    super(HelixCaretEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
