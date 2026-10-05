import type { ChangeDetail } from './details.js'

/**
 * A value is about to change, and the change can be refused.
 *
 * **The request half of every value control.** It announces the value being
 * *proposed*, before anything moves, so a listener calling `preventDefault()`
 * refuses it and the control stays where it was. That is how a consumer takes
 * one decision without declaring a mode, which is what 294 settled: the element
 * always owns and applies its state, and refusing is the way to take it over.
 *
 * **The notification is native and separate.** Once this has gone out and the
 * value has moved, the control announces it again under the platform's own
 * name, `input` while a reader is editing and `change` when they are done, so
 * `onChange` in React and `onchange=` in HTML both reach it and
 * `currentTarget.value` is correct by the time a handler reads it. This event
 * carries the detail because at the moment it fires the value is not on the
 * element yet.
 *
 * **`announcesInput` picks which native notification fires, not which name this
 * carries.** Granularity is the platform's own distinction, `input` against
 * `change`; the request is always this one event.
 */
export class HelixBeforeChangeEvent extends CustomEvent<ChangeDetail> {
  static readonly eventName = 'helix-before-change'

  constructor(detail: ChangeDetail) {
    super(HelixBeforeChangeEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
}
