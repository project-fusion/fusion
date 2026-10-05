/**
 * The graph has been drawn whole, laid out and settled, sent once each time it
 * is connected, from the frame, which then matches `:state(ready)`.
 */
export class HelixGraphReadyEvent extends Event {
  static readonly eventName = 'helix-graph-ready'

  constructor() {
    super(HelixGraphReadyEvent.eventName, { bubbles: true, cancelable: false, composed: true })
  }
}
