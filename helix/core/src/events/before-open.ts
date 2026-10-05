import type { OpenDetail } from './details.js'

/**
 * Fired when an element is about to open.
 *
 * Cancelable: `preventDefault()` refuses the change, and the element stays
 * closed. Paired with `helix-before-close` rather than being one event carrying a
 * boolean, so a listener that only cares about one direction says so by which
 * event it listens for.
 *
 * Neither bubbles nor composed. A dialog inside a drawer inside a popover is
 * three overlays, and an inner one opening must not read as the outer one
 * opening.
 */
export class HelixBeforeOpenEvent extends CustomEvent<OpenDetail> {
  static readonly eventName = 'helix-before-open'

  constructor() {
    super(HelixBeforeOpenEvent.eventName, {
      bubbles: false,
      cancelable: true,
      composed: false,
      detail: { open: true },
    })
  }
}
