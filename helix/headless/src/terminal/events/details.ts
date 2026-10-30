/*
 * What the terminal events carry: the shape of each one's `detail`.
 *
 * Types only, so this module is empty at runtime.
 */

/** Detail carried by `helix-terminal-input`. */
export interface TerminalInputDetail {
  /**
   * Whether `data` holds one byte per character, which some mouse reports
   * do, where the rest of input is text. Write it to the process as those
   * bytes, such as with `Uint8Array.from(data, (character) => character.charCodeAt(0))`.
   */
  binary: boolean

  /** What to write to the process, encoded as the program reads keys and pastes. */
  data: string
}

/** Detail carried by `helix-terminal-link`. */
export interface TerminalLinkDetail {
  /** The address, as the program wrote it. */
  href: string
}

/** Detail carried by `helix-terminal-resize`. */
export interface TerminalResizeDetail {
  /** How many character cells fit across the grid. */
  columns: number

  /** How tall the grid is, in CSS pixels, which a pseudo-terminal's size also takes. */
  height: number

  /** How many lines of cells fit down the grid. */
  rows: number

  /** How wide the grid is, in CSS pixels. */
  width: number
}

/** Detail carried by `helix-terminal-title`. */
export interface TerminalTitleDetail {
  /** The title, as the program set it. Empty where it cleared its title. */
  title: string
}
