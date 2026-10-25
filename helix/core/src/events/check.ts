import type { CheckDetail } from './details.js'

/**
 * A checked state changed after `helix-before-check` let it: a map layer shown
 * or hidden from the layers menu, or a code block's lines wrapped. Sent from
 * what changed, with the state it now holds.
 *
 * **For a checked state that is not a form control's.** A form control sends
 * the native `change` instead, which `onChange` already reads. The native
 * `toggle` is a `ToggleEvent` saying a popover or a `<details>` opened or
 * closed, and a layer shown on a map is neither.
 */
export class HelixCheckEvent extends CustomEvent<CheckDetail> {
  static readonly eventName = 'helix-check'

  constructor(detail: CheckDetail) {
    super(HelixCheckEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
