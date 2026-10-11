import type { TerminalTitleDetail } from './details.js'

/**
 * The program in a terminal set its title, with the escape codes a shell
 * writes to name its window, such as the folder it is in.
 *
 * The frame keeps its own `label`. Show the title where it belongs on your
 * page, such as on the tab the terminal sits under. Not cancelable.
 */
export class HelixTerminalTitleEvent extends CustomEvent<TerminalTitleDetail> {
  static readonly eventName = 'helix-terminal-title'

  constructor(detail: TerminalTitleDetail) {
    super(HelixTerminalTitleEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
