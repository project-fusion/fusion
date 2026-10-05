/**
 * A reader cleared the value: an input's clear button emptied the field, or a
 * clearable rating went back to unrated.
 *
 * Sent after the value is cleared, and after the `input` and `change` the
 * clear sends. Carries nothing, because the value is the cleared one.
 */
export class HelixClearEvent extends Event {
  static readonly eventName = 'helix-clear'

  constructor() {
    super(HelixClearEvent.eventName, { bubbles: true, cancelable: false, composed: true })
  }
}
