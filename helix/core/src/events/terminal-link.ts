import type { TerminalLinkDetail } from './details.js'

/**
 * A link in a terminal's output was activated: an address the program wrote
 * as a hyperlink, or one the renderer found in the text.
 *
 * **Cancelable, and the frame reads the answer.** Left alone, the frame opens
 * an `http` or `https` address in a new tab, with no reference back to the
 * page, and opens nothing else: a program can write any address, including a
 * `javascript:` one. Cancel it to open the address yourself, as a desktop
 * app does through the system's browser.
 */
export class HelixTerminalLinkEvent extends CustomEvent<TerminalLinkDetail> {
  static readonly eventName = 'helix-terminal-link'

  constructor(detail: TerminalLinkDetail) {
    super(HelixTerminalLinkEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
}
