/**
 * The eyedropper opening, and closing again.
 *
 * Two events rather than one carrying a flag, because what a consumer does with
 * them is not symmetrical: the surface holding the picker has to get out of the
 * way for the sample and come back afterwards, and those are two moments with
 * different work in each.
 *
 * **A class rather than a bare `Event`.** The check that holds an event to being
 * declared reads `new Event(` as well as `new HelixSomethingEvent(`, so a
 * hand-rolled one is public API a consumer can hear and cannot find.
 *
 * No detail, because there is nothing to say beyond that it happened.
 */
export class HelixSampleStartEvent extends Event {
  static readonly eventName = 'helix-sample-start'

  constructor() {
    super(HelixSampleStartEvent.eventName, { bubbles: true, cancelable: false, composed: true })
  }
}
