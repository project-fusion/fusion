import type { MoveDetail } from './details.js'

/**
 * Cards moved, and the move is finished: a drag let go, or a key press.
 *
 * The `change` to `helix-before-move`'s `input`: what a consumer binds who
 * only wants to save a board once somebody has finished rearranging it.
 */
export class HelixMoveEvent extends CustomEvent<MoveDetail> {
  static readonly eventName = 'helix-move'

  constructor(detail: MoveDetail) {
    super(HelixMoveEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
