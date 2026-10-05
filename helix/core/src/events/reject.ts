import type { RejectDetail } from './details.js'

/**
 * Files arrived at a file field and some were refused: by `accept`, by
 * `max-file-size`, by `max-files`, or by the field's own `validate`.
 *
 * A notification and not a request, because the files are already left out;
 * the event is how a page tells the reader why. Bubbles and is composed, so a
 * form around the field hears it.
 */
export class HelixRejectEvent extends CustomEvent<RejectDetail> {
  static readonly eventName = 'helix-reject'

  constructor(detail: RejectDetail) {
    super(HelixRejectEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
