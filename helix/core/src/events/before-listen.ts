/**
 * A field is about to start listening for dictation, and can be refused.
 *
 * @followedBy helix-listen
 */
export class HelixBeforeListenEvent extends Event {
  static readonly eventName = 'helix-before-listen'

  constructor() {
    super(HelixBeforeListenEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
    })
  }
}
