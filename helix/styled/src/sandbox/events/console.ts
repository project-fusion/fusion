import type { ConsoleDetail } from './details.js'

/**
 * Fired when something being previewed writes to the console.
 *
 * Carries text rather than the logged values. The preview is a separate
 * document, so what arrives has crossed `postMessage` and been through
 * structured clone: a DOM node or a function does not survive that, and half a
 * value is worse than a string of it.
 */
export class HelixConsoleEvent extends CustomEvent<ConsoleDetail> {
  static readonly eventName = 'helix-console'

  constructor(detail: ConsoleDetail) {
    super(HelixConsoleEvent.eventName, {
      bubbles: true,
      /* Not cancelable, for the reason `helix-resize` is not: a log line the
         frame already wrote is a fact being relayed rather than a proposal, and
         nothing reads the result. */
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
