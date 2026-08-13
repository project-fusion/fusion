/**
 * Event classes, one per event a Helix component dispatches.
 *
 * A named class rather than `dispatchEvent(new CustomEvent(name, …))` for three
 * reasons, all of them about the type reaching a consumer:
 *
 * 1. `@event {HelixOpenChangeEvent} helix-open-change` puts the class name in
 *    the manifest, which is what lets the React generator emit a typed callback
 *    instead of `(detail: unknown)`.
 * 2. The augmentation of `HTMLElementEventMap` below types `addEventListener`
 *    for consumers writing plain HTML, who never see the React wrappers.
 * 3. The event name lives on the class as `eventName`, so a listener and a
 *    dispatch cannot disagree about the string.
 */

/**
 * Every event name is prefixed `helix-`.
 *
 * Events dispatched inside a shadow root are retargeted to look like they came
 * from the host, so an unprefixed name is indistinguishable from a native event
 * escaping a component's internals: a `<helix-input>` wrapping an `<input>`
 * would emit an `input` event that is not ours. The prefix also keeps React
 * from binding its own synthetic handler, which it does for any `on*` prop
 * whose name it recognizes.
 *
 * The React prop keeps the prefix for the same reason: `onInput` would attach
 * React's listener, `onHelixInput` cannot.
 */

/** Detail carried by `helix-open-change`. */
export interface OpenChangeDetail {
  /** The state the element is moving to. */
  open: boolean
}

/** Fired when an element's open state changes, in either mode. */
export class HelixOpenChangeEvent extends CustomEvent<OpenChangeDetail> {
  static readonly eventName = 'helix-open-change'

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
    'helix-open-change': HelixOpenChangeEvent
  }
}
