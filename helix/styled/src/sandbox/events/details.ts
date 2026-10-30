/*
 * What the sandbox events carry: the shape of each one's `detail`.
 *
 * Types only, so this module is empty at runtime.
 */

/** Detail carried by `helix-console`. */
export interface ConsoleDetail {
  /** How the message was logged. */
  level: 'log' | 'info' | 'warn' | 'error'

  /** The message, already flattened to text. */
  text: string
}

/** Detail carried by `helix-caret`. */
export interface CaretDetail {
  /** One-based column, counted in characters from the start of the line. */
  column: number

  /** One-based line. */
  line: number
}
