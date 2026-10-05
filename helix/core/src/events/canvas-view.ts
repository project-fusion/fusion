import type { CanvasView } from './details.js'

/**
 * The board's view changed, however it changed: a drag, the wheel, a press on
 * a control, a card brought into view, or the board fitting itself.
 *
 * **One event for all of them**, because what a consumer keeping a minimap or a
 * saved position in step needs is where the board is now, not which of six
 * gestures put it there; `helix-canvas-pan` and `helix-canvas-zoom` still say
 * which control was pressed. Sent for every step of a drag, the way `input` is.
 */
export class HelixCanvasViewEvent extends CustomEvent<CanvasView> {
  static readonly eventName = 'helix-canvas-view'

  constructor(detail: CanvasView) {
    super(HelixCanvasViewEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
