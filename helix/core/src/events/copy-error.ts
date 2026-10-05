/**
 * A press put nothing on the clipboard: the browser did not allow the write,
 * such as on a page without the clipboard permission, or there was nothing to
 * copy.
 */
export class HelixCopyErrorEvent extends Event {
  static readonly eventName = 'helix-copy-error'

  constructor() {
    super(HelixCopyErrorEvent.eventName, { bubbles: true, cancelable: false, composed: true })
  }
}
