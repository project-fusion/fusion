import type { ReadDetail } from './details.js'

/**
 * Fired when something a user comes back to is marked read, or unread.
 *
 * **Read state is reported rather than owned.** Marking a notification read is
 * usually a round trip, and a component that flips the state itself and then
 * hears the request failed has already told the reader something untrue. So this
 * is cancelable, and refusing it leaves the item alone; the component applies
 * it once nobody has refused, which is the same contract every other axis in
 * the library uses.
 *
 * Bubbles and is composed, so a feed hears its own items: one handler on the
 * list serves every notification in it, which is what a consumer syncing to a
 * server actually wants.
 */
export class HelixReadEvent extends CustomEvent<ReadDetail> {
  static readonly eventName = 'helix-read'

  constructor(detail: ReadDetail) {
    super(HelixReadEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
}
