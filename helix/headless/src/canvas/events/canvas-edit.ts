/**
 * A reader asked to edit a card: a double-click, or Enter or F2 on it.
 *
 * **A request, because what a card holds is the page's.** Text, a picture, a
 * chart: the board cannot know what editing any of those means, so it says
 * which card and the page opens its own editor, in place, in a dialog, or in a
 * panel beside the board.
 */
export class HelixCanvasEditEvent extends CustomEvent<{ name: string }> {
  static readonly eventName = 'helix-canvas-edit'

  constructor(detail: { name: string }) {
    super(HelixCanvasEditEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
