/**
 * Event classes, one per event a Helix component dispatches.
 *
 * A named class rather than `dispatchEvent(new CustomEvent(name, …))` for three
 * reasons, all of them about the type reaching a consumer:
 *
 * 1. `@event {HelixOpenChangeEvent} OpenChange` puts the class name in the
 *    manifest, which is what lets the React generator emit a typed callback
 *    instead of `(detail: unknown)`.
 * 2. The augmentation of `HTMLElementEventMap` below types `addEventListener`
 *    for consumers writing plain HTML, who never see the React wrappers.
 * 3. The event name lives on the class as `eventName`, so a listener and a
 *    dispatch cannot disagree about the string.
 */

/**
 * Event names are PascalCase.
 *
 * Events dispatched inside a shadow root are retargeted to look like they came
 * from the host, so a name that could collide with a native event is
 * indistinguishable from one escaping a component's internals: a
 * `<helix-input>` wrapping an `<input>` emits an `input` event that is not ours.
 *
 * **Every native event name is lowercase**, so PascalCase cannot collide with
 * one. That is the same protection a `helix-` prefix gives, achieved by casing.
 *
 * It also decides the React prop, which is not a separate choice: React strips
 * `on` and uses the remainder verbatim, so `OpenChange` is `onOpenChange` and
 * `helix-open-change` would have been `onhelix-open-change`.
 *
 * Two rules follow:
 *
 * 1. **Never a bare native name.** `Change` would be reached by React's
 *    `onChange`, which its synthetic system has already claimed for the native
 *    `change` event, so ours would never fire.
 * 2. **Always compound.** `ValueChange`, `CheckedChange`, `OpenChange`. No
 *    React synthetic handler is named for any of them.
 */

/** Detail carried by `OpenChange`. */
export interface OpenChangeDetail {
  /** The state the element is moving to. */
  open: boolean
}

/** Fired when an element's open state changes, in either mode. */
export class HelixOpenChangeEvent extends CustomEvent<OpenChangeDetail> {
  static readonly eventName = 'OpenChange'

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
    OpenChange: HelixOpenChangeEvent
  }
}
