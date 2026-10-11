/**
 * The program in a terminal rang the bell, the BEL character, which shells
 * send when a completion has no match and which long-running commands send
 * when they finish.
 *
 * Sent from the frame, which also flashes once. Not cancelable: the bell has
 * rung, and a page that wants its own signal, a badge on a tab, adds it beside
 * the flash.
 */
export class HelixTerminalBellEvent extends Event {
  static readonly eventName = 'helix-terminal-bell'

  constructor() {
    super(HelixTerminalBellEvent.eventName, { bubbles: true, cancelable: false, composed: true })
  }
}
