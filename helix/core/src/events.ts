/**
 * Event classes, one per event a Helix component dispatches.
 *
 * A named class rather than `dispatchEvent(new CustomEvent(name, …))` for three
 * reasons, all of them about the type reaching a consumer:
 *
 * 1. `@event {HelixOpenChangeEvent} open-change` puts the class name in the
 *    manifest, which is what lets the React generator emit a typed callback
 *    instead of `(detail: unknown)`.
 * 2. The augmentation of `HTMLElementEventMap` below types `addEventListener`
 *    for consumers writing plain HTML, who never see the React wrappers.
 * 3. The event name lives on the class as `eventName`, so a listener and a
 *    dispatch cannot disagree about the string.
 */

/** Detail carried by `open-change`. */
export interface OpenChangeDetail {
  /** The state the element is moving to. */
  open: boolean
}

/** Fired when an element's open state changes, in either mode. */
export class HelixOpenChangeEvent extends CustomEvent<OpenChangeDetail> {
  static readonly eventName = 'open-change'

  constructor(detail: OpenChangeDetail) {
    super(HelixOpenChangeEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
}

declare global {
  interface HTMLElementEventMap {
    'open-change': HelixOpenChangeEvent
  }
}
