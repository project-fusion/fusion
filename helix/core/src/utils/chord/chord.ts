/*
 * A chord written as keys joined by `+`, such as `mod+k`, `shift+?` or
 * `Alt+T`: how it splits, how it is spelled for `aria-keyshortcuts`, and
 * whether a key press is it.
 *
 * `matchesChord` and `printableChord` are Kbd's grammar, `mod` being the
 * platform's own modifier and Shift saying nothing about a symbol. Toast's
 * `hotkey` and Command's `hotkey` split the same way and keep matchers of
 * their own, each documented with its property, because their rules for Shift
 * and `mod` differ from Kbd's and a press each answers today would change.
 */

/** The keys of a chord, in the order written, with spaces and empty entries dropped. */
export const chordParts = (keys: string): string[] =>
  keys
    .split('+')
    .map((part) => part.trim())
    .filter((part) => part !== '')

/** Each name a chord accepts, as `aria-keyshortcuts` spells it: the UI Events key values. */
const ARIA: Record<string, string> = {
  alt: 'Alt',
  backspace: 'Backspace',
  cmd: 'Meta',
  ctrl: 'Control',
  del: 'Delete',
  down: 'ArrowDown',
  enter: 'Enter',
  esc: 'Escape',
  escape: 'Escape',
  left: 'ArrowLeft',
  meta: 'Meta',
  opt: 'Alt',
  right: 'ArrowRight',
  shift: 'Shift',
  space: 'Space',
  tab: 'Tab',
  up: 'ArrowUp',
}

/**
 * A chord as `aria-keyshortcuts` writes it: `mod+k` is `Meta+K` on an Apple
 * keyboard and `Control+K` elsewhere. A letter is written in capitals and a
 * symbol as itself. Empty for no keys.
 */
export const ariaChord = (keys: string, apple: boolean): string =>
  chordParts(keys)
    .map((part) => {
      const name = part.toLowerCase()
      if (name === 'mod') {
        return apple ? 'Meta' : 'Control'
      }
      return ARIA[name] ?? (part.length === 1 ? part.toUpperCase() : part)
    })
    .join('+')

/**
 * Whether a chord types a character, and so is indistinguishable from typing.
 *
 * One code point means a character rather than a name: `/` and `?` are
 * printable, `escape` and `enter` are not. **Shift is allowed beside it**,
 * because Shift is how a character is typed: `shift+?` and `shift+a` are a
 * question mark and a capital A in a field.
 */
export const printableChord = (keys: string): boolean => {
  const parts = chordParts(keys).map((part) => part.toLowerCase())
  const key = parts.at(-1) ?? ''
  return [...key].length === 1 && parts.slice(0, -1).every((modifier) => modifier === 'shift')
}

/** What a key press carries that a chord is compared against. */
export interface ChordPress {
  altKey: boolean
  ctrlKey: boolean
  key: string
  metaKey: boolean
  shiftKey: boolean
}

/**
 * Whether a press is the chord, modifiers and all.
 *
 * `mod` is one key, the platform's: Command where `apple` and Control
 * elsewhere. The other one is then checked like any modifier the chord does
 * not name, so Control and Command together do not answer `mod+k`. `cmd` and
 * `meta` are Command, `alt` and `opt` are Option.
 *
 * **A symbol is typed with Shift, so Shift says nothing about it.** On a US
 * layout `?` arrives as `?` with `shiftKey` set, and a chord of `?` that
 * refused Shift could never be pressed at all. A letter has a shifted form of
 * its own, so `a` still refuses Shift and `shift+a` still asks for it.
 *
 * Every other modifier is checked in both directions, so `mod+k` is not
 * answered by `shift+mod+k`: a chord a reader did not press is a chord that
 * should go to whatever did want it.
 */
export const matchesChord = (press: ChordPress, keys: string, apple: boolean): boolean => {
  const parts = chordParts(keys).map((part) => part.toLowerCase())
  if (parts.length === 0) {
    return false
  }
  const wanted = parts[parts.length - 1] ?? ''
  const modifiers = new Set(parts.slice(0, -1))
  const ctrl = modifiers.has('ctrl') || (modifiers.has('mod') && !apple)
  const meta = modifiers.has('cmd') || modifiers.has('meta') || (modifiers.has('mod') && apple)
  const symbol = wanted.toLowerCase() === wanted.toUpperCase() && [...wanted].length === 1
  return (
    press.key.toLowerCase() === wanted &&
    (modifiers.has('shift') ? press.shiftKey : symbol || !press.shiftKey) &&
    (modifiers.has('alt') || modifiers.has('opt') ? press.altKey : !press.altKey) &&
    (ctrl ? press.ctrlKey : !press.ctrlKey) &&
    (meta ? press.metaKey : !press.metaKey)
  )
}
