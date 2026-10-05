/** The eyedropper closing, whether or not a color was taken. */
export class HelixSampleEndEvent extends Event {
  static readonly eventName = 'helix-sample-end'

  constructor() {
    super(HelixSampleEndEvent.eventName, { bubbles: true, cancelable: false, composed: true })
  }
}
