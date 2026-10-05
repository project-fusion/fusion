import type { MoveDetail } from './details.js'

/**
 * Cards are about to move, and can be refused.
 *
 * **This is the controlled half, the way `helix-before-open` is for a
 * dialog.** A board moves its own cards by default, writing `x` and `y` onto
 * each one the way an input writes its own value. A consumer who keeps the
 * positions in their own state calls `preventDefault()` here, writes what the
 * detail says into that state, and renders the cards where it puts them.
 *
 * Sent for every step of a drag, so a controlled board follows the pointer
 * rather than jumping on the drop.
 */
export class HelixBeforeMoveEvent extends CustomEvent<MoveDetail> {
  static readonly eventName = 'helix-before-move'

  constructor(detail: MoveDetail) {
    super(HelixBeforeMoveEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
}
