import type { CompleteDetail } from './details.js'

/**
 * Fired when a control that fills up has filled.
 *
 * The moment a code entry exists for: a six-character field is worth submitting
 * the instant the sixth character lands, and a consumer watching `helix-change`
 * has to know the length and compare it on every keystroke to find that moment
 * themselves.
 *
 * Separate from `helix-change` rather than a flag on it, because they are
 * answered by different code: one keeps a value in step and the other decides
 * whether to send a form. A listener that only cares about the second says so by
 * which event it listens for.
 *
 * `complete` is free as a verb. React's synthetic system claims `change`,
 * `input`, `submit`, `reset`, `copy`, `paste`, `scroll`, `drag`, `focus` and
 * `blur`, measured, and this is none of them.
 *
 * Not cancelable. It reports that something already happened, which is the same
 * reason `helix-caret` is not: there is nothing left to refuse once the last
 * character is in the box.
 */
export class HelixCompleteEvent extends CustomEvent<CompleteDetail> {
  static readonly eventName = 'helix-complete'

  constructor(detail: CompleteDetail) {
    super(HelixCompleteEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
