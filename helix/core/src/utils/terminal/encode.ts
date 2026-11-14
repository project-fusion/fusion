/**
 * A key press as the bytes a program in a terminal reads, as xterm.js writes
 * them on the web. A phone has no xterm.js keyboard handling, so its frame
 * encodes the keys it hears itself.
 */

/** A press, by the web's key name and the modifiers held. */
export interface TerminalKeyPress {
  readonly alt: boolean
  readonly control: boolean
  /** The key's value, as the web's `KeyboardEvent.key` names it. */
  readonly key: string
  readonly meta: boolean
  readonly shift: boolean
}

/** The keys a cursor key mode changes, by the letter that ends their sequence. */
const CURSOR: Readonly<Record<string, string>> = {
  ArrowDown: 'B',
  ArrowLeft: 'D',
  ArrowRight: 'C',
  ArrowUp: 'A',
  End: 'F',
  Home: 'H',
}

/** The keys sent as `CSI n ~`, by their number. */
const TILDE: Readonly<Record<string, number>> = {
  Delete: 3,
  F5: 15,
  F6: 17,
  F7: 18,
  F8: 19,
  F9: 20,
  F10: 21,
  F11: 23,
  F12: 24,
  Insert: 2,
  PageDown: 6,
  PageUp: 5,
}

/** F1 to F4, sent as `SS3` and a letter. */
const FUNCTION: Readonly<Record<string, string>> = { F1: 'P', F2: 'Q', F3: 'R', F4: 'S' }

/** The control bytes for the punctuation that has one, by the key. */
const CONTROL: Readonly<Record<string, string>> = {
  ' ': '\x00',
  _: '\x1f',
  '[': '\x1b',
  ']': '\x1d',
  '@': '\x00',
  '\\': '\x1c',
  '^': '\x1e',
  '2': '\x00',
}

/** The xterm modifier parameter: 1, plus 1 for Shift, 2 for Alt, and 4 for Control. */
const modifier = (press: TerminalKeyPress): number =>
  1 + (press.shift ? 1 : 0) + (press.alt ? 2 : 0) + (press.control ? 4 : 0)

/** A named key's sequence, or `undefined` for a key that is no named one. */
const named = (press: TerminalKeyPress, applicationCursor: boolean): string | undefined => {
  const held = modifier(press)
  const letter = CURSOR[press.key]
  if (letter !== undefined) {
    if (held > 1) {
      return `\x1b[1;${held}${letter}`
    }
    return applicationCursor ? `\x1bO${letter}` : `\x1b[${letter}`
  }
  const number = TILDE[press.key]
  if (number !== undefined) {
    return held > 1 ? `\x1b[${number};${held}~` : `\x1b[${number}~`
  }
  const fn = FUNCTION[press.key]
  if (fn !== undefined) {
    return held > 1 ? `\x1b[1;${held}${fn}` : `\x1bO${fn}`
  }
  switch (press.key) {
    case 'Backspace':
      return press.control ? '\b' : press.alt ? '\x1b\x7f' : '\x7f'
    case 'Enter':
      return press.alt ? '\x1b\r' : '\r'
    case 'Escape':
      return press.alt ? '\x1b\x1b' : '\x1b'
    case 'Tab':
      return press.shift ? '\x1b[Z' : '\t'
    default:
      return undefined
  }
}

/**
 * The bytes a press sends a program, or `undefined` for a press that sends
 * none: one with Command, a modifier alone, or a key the frame does not know.
 * `applicationCursor` is the program's cursor key mode, which writes the
 * arrows, Home and End as `SS3` rather than `CSI`.
 */
export const encodeKey = (
  press: TerminalKeyPress,
  applicationCursor = false,
): string | undefined => {
  if (press.meta) {
    return undefined
  }
  const sequence = named(press, applicationCursor)
  if (sequence !== undefined) {
    return sequence
  }
  if ([...press.key].length !== 1) {
    return undefined
  }
  let typed = press.key
  if (press.control) {
    const lower = typed.toLowerCase()
    if (lower >= 'a' && lower <= 'z') {
      typed = String.fromCharCode(lower.charCodeAt(0) - 96)
    } else {
      const byte = CONTROL[typed]
      if (byte === undefined) {
        return undefined
      }
      typed = byte
    }
  }
  return press.alt ? `\x1b${typed}` : typed
}

/** Text as a program reads a paste: wrapped in the bracketed paste marks where the program asked for them. */
export const pasted = (text: string, bracketed: boolean): string => {
  const lines = text.replace(/\r?\n/g, '\r')
  return bracketed ? `\x1b[200~${lines}\x1b[201~` : lines
}
