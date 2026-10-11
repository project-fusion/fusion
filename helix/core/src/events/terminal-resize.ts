import type { TerminalResizeDetail } from './details.js'

/**
 * A terminal's grid changed size, in character cells and in pixels, for the
 * page to resize the process's pseudo-terminal to match.
 *
 * Sent once the grid has its first size and after every change. Not
 * cancelable: it reports the grid the renderer already drew, as `helix-resize`
 * reports a height already measured.
 */
export class HelixTerminalResizeEvent extends CustomEvent<TerminalResizeDetail> {
  static readonly eventName = 'helix-terminal-resize'

  constructor(detail: TerminalResizeDetail) {
    super(HelixTerminalResizeEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
