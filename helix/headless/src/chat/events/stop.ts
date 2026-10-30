/**
 * A reader asked for what is under way to stop: the stop control a chat
 * composer shows in place of its send button while a reply is on its way.
 *
 * Carries nothing, because what stops is the listener's to know. Not
 * cancelable: the reader has asked, and the composer changes nothing by
 * itself, so there is nothing for a listener to refuse.
 */
export class HelixStopEvent extends Event {
  static readonly eventName = 'helix-stop'

  constructor() {
    super(HelixStopEvent.eventName, { bubbles: true, cancelable: false, composed: true })
  }
}
