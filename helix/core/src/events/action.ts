/**
 * A reader acted on a row: Enter on a list row, or a press in a list that
 * selects nothing. Sent from the row, so `target` is the row acted on.
 *
 * Carries nothing, because the row is the whole of the answer. Not cancelable:
 * a row with a link follows it and sends nothing, so there is no default left
 * to refuse.
 */
export class HelixActionEvent extends Event {
  static readonly eventName = 'helix-action'

  constructor() {
    super(HelixActionEvent.eventName, { bubbles: true, cancelable: false, composed: true })
  }
}
