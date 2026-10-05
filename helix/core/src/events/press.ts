import type { PressDetail } from './details.js'

/**
 * A control was pressed and acted, whatever pressed it: a pointer, Enter or
 * Space, or a screen reader. React Aria's `onPress`.
 *
 * **One event for every way in, with the way in on it.** `click` arrives for
 * all of them and says which only in some engines: Chromium sends a keyboard
 * press and a script's `click()` alike, with no pointer kind and a count of
 * zero. `pointerType` here is worked out once, by `pressType`, for every
 * listener.
 *
 * Sent after the press has acted, and only when it has: a disabled or pending
 * control sends none. Not cancelable, since the action is done. Bubbles and is
 * composed, as `click` does.
 */
export class HelixPressEvent extends CustomEvent<PressDetail> {
  static readonly eventName = 'helix-press'

  constructor(detail: PressDetail) {
    super(HelixPressEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
