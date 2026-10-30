import type { TerminalInputDetail } from './details.js'

/**
 * What a reader typed or pasted into a terminal, encoded the way the program
 * running in it reads input, for the page to write to the process.
 *
 * **Not cancelable, because nothing in the library acts on it.** The frame
 * never writes input anywhere: the page owns the process, so the page is the
 * only listener that does anything. A frame that is `readonly`, or whose
 * process has exited, sends none.
 */
export class HelixTerminalInputEvent extends CustomEvent<TerminalInputDetail> {
  static readonly eventName = 'helix-terminal-input'

  constructor(detail: TerminalInputDetail) {
    super(HelixTerminalInputEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
