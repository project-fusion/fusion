/**
 * A reader pressed Restart in a terminal whose process has exited.
 *
 * The page answers it: it starts a new process, clears the frame's
 * `exit-code`, and writes the new output. Not cancelable, since the frame does
 * nothing on its own when it is sent.
 */
export class HelixTerminalRestartEvent extends Event {
  static readonly eventName = 'helix-terminal-restart'

  constructor() {
    super(HelixTerminalRestartEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
    })
  }
}
