import type { CreateDetail } from './details.js'

/**
 * The reader asked for something the list does not hold.
 *
 * Cancelable, and announced before anything is applied, because the options are
 * the consumer's own light DOM and no component here writes into it. What the
 * control can do is say what was asked for and take the value; putting an
 * option in the list, or a row in a database, is the consumer's, and a consumer
 * who validates first refuses this and adds nothing.
 *
 * The detail carries the text as typed, not a slug of it. Trimming or lowering
 * it here would be this element deciding what a name means, and a consumer who
 * wants an identifier can make one from what they were given.
 */
export class HelixCreateEvent extends CustomEvent<CreateDetail> {
  static readonly eventName = 'helix-create'

  constructor(detail: CreateDetail) {
    super(HelixCreateEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
}
