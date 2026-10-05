/**
 * A reader asked for more items: a feed's or a table's `load-more` button, or
 * a list scrolled near its end. Append them, and set `loading` while they are
 * on their way.
 *
 * Carries nothing, because what comes next is the consumer's to know. Not
 * cancelable: nothing is loaded until the consumer loads it.
 */
export class HelixLoadMoreEvent extends Event {
  static readonly eventName = 'helix-load-more'

  constructor() {
    super(HelixLoadMoreEvent.eventName, { bubbles: true, cancelable: false, composed: true })
  }
}
