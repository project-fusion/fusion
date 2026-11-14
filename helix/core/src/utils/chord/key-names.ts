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

/**
 * The words a screen reader says for a glyph, by the key's name: an Apple
 * keyboard's modifiers and the arrows. A glyph alone is read as a symbol, or
 * not at all.
 */
const SPOKEN: Readonly<Record<string, string>> = {
  alt: 'Option',
  backspace: 'Delete',
  cmd: 'Command',
  ctrl: 'Control',
  del: 'Forward Delete',
  down: 'Down Arrow',
  enter: 'Return',
  left: 'Left Arrow',
  meta: 'Command',
  mod: 'Command',
  opt: 'Option',
  right: 'Right Arrow',
  shift: 'Shift',
  tab: 'Tab',
  up: 'Up Arrow',
}

/**
 * The place of each modifier in a chord, per platform, so a chord is drawn in
 * the platform's order whatever order it was written in.
 *
 * Apple orders its modifiers Control, Option, Shift, Command, as its menus
 * draw them: `mod+shift+p` is `⇧⌘P` there. Windows writes the Windows key
 * first, then Ctrl, Alt and Shift, as in `Ctrl+Shift+P`.
 */
const ORDER_APPLE: Readonly<Record<string, number>> = {
  alt: 1,
  cmd: 3,
  ctrl: 0,
  meta: 3,
  mod: 3,
  opt: 1,
  shift: 2,
}

const ORDER_ELSEWHERE: Readonly<Record<string, number>> = {
  alt: 2,
  cmd: 0,
  ctrl: 1,
  meta: 0,
  mod: 1,
  opt: 2,
  shift: 3,
}

/** A chord's keys as they are shown, and what is shown between two of them. */
export interface KeyNames {
  /** Each key's label, modifiers first in the platform's order, then the rest as written. */
  keys: string[]
  /** What goes between two keys: `+`, a hyphen, or nothing. */
  separator: string
  /**
   * The chord in words for a screen reader, such as `Shift Command P`, where a
   * label is a glyph a reader would hear as a symbol. Empty when every label
   * is a word already.
   */
  spoken: string
  /** Each key in words, in the order of `keys`, such as `Command` where `keys` holds `⌘`. */
  words: string[]
}

/**
 * A chord's names with its modifiers moved to the front, in the platform's
 * order. Every other name keeps its place after them.
 */
const ordered = (parts: readonly string[], apple: boolean): string[] => {
  const order = apple ? ORDER_APPLE : ORDER_ELSEWHERE
  const rank = (part: string): number => order[part.toLowerCase()] ?? Number.POSITIVE_INFINITY
  return parts
    .map((part, index) => ({ index, part }))
    .sort((a, b) => rank(a.part) - rank(b.part) || a.index - b.index)
    .map(({ part }) => part)
}

/**
 * The labels of a chord's keys on a platform, with `own` labels in place of
 * the platform's, and what goes between two keys.
 *
 * `parts` are the chord's names as `chordParts` splits them. A name `own`
 * holds takes that label, a name the platform knows takes its glyph or word,
 * and any other single character is shown in capitals. **Modifiers come first,
 * in the platform's order**, so one `keys` value is right on every platform:
 * `mod+shift+p` is `⇧⌘P` on an Apple keyboard and `Ctrl+Shift+P` elsewhere.
 *
 * **On an Apple keyboard glyphs run together and words are joined with a
 * hyphen**, as Apple writes `Command-K`. A label of more than one character
 * from `own` is a word, so `{"mod": "Command"}` shows `Command-K` there, where
 * nothing between the two ran them into `CommandK`. The platform's own `Esc`
 * and `Space` keep running on from a glyph, as `⌘Esc` always has. Everywhere
 * else keys are joined with `+`.
 *
 * `spoken` says the chord in words where a label is one of the platform's
 * glyphs, such as `⌘` or `↑`, which a screen reader reads as a symbol or
 * skips. A label from `own` is taken as words already.
 */
export const keyNames = (
  parts: readonly string[],
  apple: boolean,
  own: Readonly<Record<string, string>> = {},
): KeyNames => {
  const names = apple ? APPLE : ELSEWHERE
  let worded = false
  let glyphs = false
  const words: string[] = []
  const keys = ordered(parts, apple).map((part) => {
    const name = part.toLowerCase()
    const mine = own[name]
    if (mine !== undefined) {
      worded ||= [...mine].length > 1
      words.push(mine)
      return mine
    }
    const shown = names[name] ?? (part.length === 1 ? part.toUpperCase() : part)
    const said = SPOKEN[name]
    const glyph = said !== undefined && [...shown].length === 1
    glyphs ||= glyph
    words.push(glyph ? said : shown)
    return shown
  })
  return {
    keys,
    separator: apple ? (worded ? '-' : '') : '+',
    spoken: glyphs ? words.join(' ') : '',
    words,
  }
}
