import type { ShortcutDetail } from './details.js'

/**
 * Fired when a shortcut's chord is pressed.
 *
 * Cancelable, and the key event is only consumed where this is not refused: a
 * consumer that decides the moment is wrong, a dialog is over the control or
 * the reader is mid-composition, calls `preventDefault()` and the keystroke
 * goes on to whatever would have had it.
 */
export class HelixShortcutEvent extends CustomEvent<ShortcutDetail> {
  static readonly eventName = 'helix-shortcut'

  constructor(detail: ShortcutDetail) {
    super(HelixShortcutEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
}
