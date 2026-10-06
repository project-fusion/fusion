/**
 * The words and glyphs a chord is drawn with, per platform.
 *
 * In core beside `ariaChord`, which says a chord to a reader as this draws it
 * for the eye: Kbd draws a chord with it, and Speed Dial draws an action's
 * shortcut with it where nothing is slotted, without importing Kbd.
 */

/**
 * How each name in a chord is drawn on an Apple keyboard.
 *
 * Apple keyboards label their modifiers with glyphs and print no separator
 * between them, so `⌘K` is the whole of it.
 */
const APPLE: Readonly<Record<string, string>> = {
  alt: '⌥',
  backspace: '⌫',
  cmd: '⌘',
  ctrl: '⌃',
  del: '⌦',
  down: '↓',
  enter: '↵',
  esc: 'Esc',
  left: '←',
  meta: '⌘',
  mod: '⌘',
  opt: '⌥',
  right: '→',
  shift: '⇧',
  space: 'Space',
  tab: '⇥',
  up: '↑',
}

/**
 * How each name in a chord is drawn everywhere else, where the words are the
 * label and the plus between two is part of the convention.
 */
const ELSEWHERE: Readonly<Record<string, string>> = {
  alt: 'Alt',
  backspace: 'Backspace',
  cmd: 'Win',
  ctrl: 'Ctrl',
  del: 'Del',
  down: '↓',
  enter: 'Enter',
  esc: 'Esc',
  left: '←',
  meta: 'Win',
  mod: 'Ctrl',
  opt: 'Alt',
  right: '→',
  shift: 'Shift',
  space: 'Space',
  tab: 'Tab',
  up: '↑',
}

/** A chord's keys as they are shown, and what is shown between two of them. */
export interface KeyNames {
  /** Each key's label, in the order the chord names them. */
  keys: string[]
  /** What goes between two keys: `+`, a hyphen, or nothing. */
  separator: string
}

/**
 * The labels of a chord's keys on a platform, with `own` labels in place of
 * the platform's, and what goes between two keys.
 *
 * `parts` are the chord's names as `chordParts` splits them. A name `own`
 * holds takes that label, a name the platform knows takes its glyph or word,
 * and any other single character is shown in capitals.
 *
 * **On an Apple keyboard glyphs run together and words are joined with a
 * hyphen**, as Apple writes `Command-K`. A label of more than one character
 * from `own` is a word, so `{"mod": "Command"}` shows `Command-K` there, where
 * nothing between the two ran them into `CommandK`. The platform's own `Esc`
 * and `Space` keep running on from a glyph, as `⌘Esc` always has. Everywhere
 * else keys are joined with `+`.
 */
export const keyNames = (
  parts: readonly string[],
  apple: boolean,
  own: Readonly<Record<string, string>> = {},
): KeyNames => {
  const names = apple ? APPLE : ELSEWHERE
  let worded = false
  const keys = parts.map((part) => {
    const name = part.toLowerCase()
    const mine = own[name]
    if (mine !== undefined) {
      worded ||= [...mine].length > 1
      return mine
    }
    return names[name] ?? (part.length === 1 ? part.toUpperCase() : part)
  })
  return { keys, separator: apple ? (worded ? '-' : '') : '+' }
}
