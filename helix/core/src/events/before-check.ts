import type { CheckDetail } from './details.js'

/**
 * A checked state is about to change, and the change can be refused.
 *
 * **Its own event rather than a `helix-before-change` carrying a boolean.**
 * Through the value event the state arrives as `String(checked)`, so a consumer
 * receives the string `"false"`, which is truthy, and a test asserting the value
 * passes on that bug. A control whose state is a boolean wants an event with a
 * typed boolean in it.
 *
 * **Named for checking, because `toggle` is open and closed.** The platform's
 * `toggle` says a popover or a `<details>` opened or closed, and Helix relays
 * it for its overlays, so a checked state takes a verb of its own.
 *
 * The notification on a form control is native, as it is for a value: the
 * control relays `change` from the inner input and announces `input` beside
 * it, so `onChange` reads `currentTarget.checked` and gets a boolean from the
 * platform. A checked state that is not a form control's, such as a map layer
 * or a code block's wrapping, sends `helix-check` once it has moved.
 *
 * It also ends a collision: Checkbox Group listened for its boxes' change and
 * dispatched its own under the same name from the same host, so it needed
 * `stopImmediatePropagation` to keep a consumer from receiving one box's boolean
 * alongside the whole set. Two names, two facts.
 *
 * @followedBy change helix-check
 */
export class HelixBeforeCheckEvent extends CustomEvent<CheckDetail> {
  static readonly eventName = 'helix-before-check'

  constructor(detail: CheckDetail) {
    super(HelixBeforeCheckEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
}
