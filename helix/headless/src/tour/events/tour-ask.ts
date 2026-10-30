import type { TourAskDetail } from './details.js'

/**
 * A stop asking the tour to move.
 *
 * Composed and bubbling, because a stop is slotted into the root and the root
 * has to hear it across that boundary.
 *
 * **A class rather than a hand-rolled `CustomEvent`.** A dispatch is matched as
 * `new HelixSomethingEvent(`, so a raw `CustomEvent` is not held to being
 * declared and nothing carries it into the manifest: consumers can hear it and
 * cannot find it.
 */
export class HelixTourAskEvent extends CustomEvent<TourAskDetail> {
  static readonly eventName = 'helix-tour-ask'

  constructor(detail: TourAskDetail) {
    super(HelixTourAskEvent.eventName, {
      bubbles: true,
      /* Not cancelable. The name says *ask*, so refusing it looks like it should
         hold the tour, and honoring it here could not work: the root registers
         its listener in `connectedCallback` and a consumer registers later, so on
         a bubbling event both are on the same target and the root's runs first,
         reading `defaultPrevented` before the consumer has had a chance to set
         it. `helix-shortcut` gets this right by reading the flag on the element
         that dispatched, where every listener has already run.

         **The veto exists and is elsewhere.** Moving between stops goes through
         `requestChange` and announces `helix-before-activate`; leaving early
         dispatches `helix-before-close` and reads the flag before writing
         `open`. This event is the stop telling the root a button was pressed,
         and the decision is taken one step later. */
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
