import type { ReadDetail } from './details.js'

/**
 * Something a user comes back to is about to be marked read, or unread.
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
 *
 * @followedBy helix-read
 */
export class HelixBeforeReadEvent extends CustomEvent<ReadDetail> {
  static readonly eventName = 'helix-before-read'

  constructor(detail: ReadDetail) {
    super(HelixBeforeReadEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
}
