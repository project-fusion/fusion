/**
 * A lazy branch opened and asks for its children: a tree item with `lazy`.
 * Sent from the item, so `target` is the branch to fill.
 *
 * Carries nothing, because the children are the consumer's to fetch. Not
 * cancelable: the branch is already open, and says it is busy until children
 * arrive.
 */
export class HelixLoadEvent extends Event {
  static readonly eventName = 'helix-load'

  constructor() {
    super(HelixLoadEvent.eventName, { bubbles: true, cancelable: false, composed: true })
  }
}
