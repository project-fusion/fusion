import type { ToggleDetail } from './details.js'

/**
 * A checked state changed after `helix-before-toggle` let it: a map layer
 * shown or hidden from the layers menu. Sent from what changed, with the state
 * it now holds.
 *
 * **Not the native `toggle`.** That one is a `ToggleEvent` saying a popover or
 * a `<details>` opened or closed, with `newState` of `open` or `closed`, and a
 * layer shown on a map is neither: it is the request's own verb without
 * `before`, carrying the same `checked` the request did.
 */
export class HelixToggleEvent extends CustomEvent<ToggleDetail> {
  static readonly eventName = 'helix-toggle'

  constructor(detail: ToggleDetail) {
    super(HelixToggleEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
