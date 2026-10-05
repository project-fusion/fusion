/** A key and the modifiers held with it. */
export interface Chord {
  alt: boolean
  ctrl: boolean
  key: string
  meta: boolean
  shift: boolean
}

/** What a key press carries that a chord is compared against. */
export interface Pressed {
  altKey: boolean
  ctrlKey: boolean
  key: string
  metaKey: boolean
  shiftKey: boolean
}

const MODIFIERS = new Set(['alt', 'ctrl', 'meta', 'shift'])

/**
 * Reads a chord written as keys joined by `+`, such as `F8` or `Alt+T`, case
 * aside. The last part is the key. Empty, or a chord with no key, is none.
 */
export const parseHotkey = (text: string): Chord | null => {
  const parts = text
    .split('+')
    .map((one) => one.trim())
    .filter(Boolean)
  const key = parts.pop()
  if (!key || MODIFIERS.has(key.toLowerCase())) {
    return null
  }
  const held = new Set(parts.map((one) => one.toLowerCase()))
  return {
    alt: held.has('alt'),
    ctrl: held.has('ctrl'),
    key,
    meta: held.has('meta'),
    shift: held.has('shift'),
  }
}

/** Whether a press is the chord: the same key, case aside, and exactly its modifiers. */
export const matchesHotkey = (pressed: Pressed, chord: Chord | null): boolean =>
  chord !== null &&
  pressed.key.toLowerCase() === chord.key.toLowerCase() &&
  pressed.altKey === chord.alt &&
  pressed.ctrlKey === chord.ctrl &&
  pressed.metaKey === chord.meta &&
  pressed.shiftKey === chord.shift
