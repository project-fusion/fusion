import type { SkipDetail } from './details.js'

/**
 * Fired when the reader asks for the next thing in a set.
 *
 * Paired with `helix-previous` rather than being one event carrying a
 * direction, which is the reason `helix-before-open` gives for its own pair: a
 * listener that only cares about one direction says so by which event it
 * listens for. The detail carries the direction anyway, so a consumer who does
 * want one handler can have one.
 *
 * Bubbles and is composed, because the thing that answers this is usually not
 * the thing that asked. A video has no notion of a set: it plays one resource,
 * and what comes next is a playlist's business or the consumer's, so the event
 * has to reach a wrapper.
 *
 * Not cancelable. There is no default action to refuse: the component that
 * fires this does nothing on its own, and an event whose `preventDefault` means
 * nothing is an event that lies about what it offers.
 */
export class HelixNextEvent extends CustomEvent<SkipDetail> {
  static readonly eventName = 'helix-next'

  constructor() {
    super(HelixNextEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail: { to: 'next' },
    })
  }
}
