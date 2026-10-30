/**
 * Fired when a reader reaches the oldest turn a transcript holds, while there are
 * older ones to fetch.
 *
 * **A report of where the reader is, not a request to be granted**, so it is not
 * cancelable: there is nothing for the transcript to do if nobody refuses, and
 * nothing to stop if somebody does. The consumer answers by fetching, and says
 * so through the transcript's `history` while the older turns are on their way.
 *
 * No detail. The consumer holds the transcript and knows its oldest turn, which
 * is the one thing a fetch needs.
 */
export class HelixHistoryEvent extends CustomEvent<Record<string, never>> {
  static readonly eventName = 'helix-history'

  constructor() {
    super(HelixHistoryEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail: {},
    })
  }
}
