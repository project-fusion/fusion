/*
 * A short code typed one character a box, as Pin Input holds it on the web
 * and on a phone: the characters a box accepts, how letters are cased, and
 * the separators a `format` draws between boxes.
 */

/** What a box accepts, which decides the keyboard a phone offers. */
export type PinType = 'alphanumeric' | 'numeric' | 'text'

/** How typed letters are cased: as typed, or turned upper or lower case. */
export type PinCase = 'lower' | 'preserve' | 'upper'

/**
 * Typed or pasted text as the code's characters: trimmed, with what `type`
 * refuses dropped, and its letters cased as `letterCase` asks.
 *
 * `numeric` keeps digits, `alphanumeric` keeps ASCII letters and digits, and
 * `text` keeps everything.
 */
export const cleanCode = (
  text: string,
  type: PinType,
  letterCase: PinCase = 'preserve',
): string => {
  const trimmed = text.trim()
  const kept =
    type === 'numeric'
      ? trimmed.replace(/\D/g, '')
      : type === 'alphanumeric'
        ? trimmed.replace(/[^0-9A-Za-z]/g, '')
        : trimmed
  return letterCase === 'upper'
    ? kept.toUpperCase()
    : letterCase === 'lower'
      ? kept.toLowerCase()
      : kept
}

/**
 * The separator drawn after each box, from a `format` such as `###-###`: each
 * `#` or `*` is a box, and what stands between two boxes is drawn between
 * them. Nothing is drawn before the first box or after the last.
 */
export const separatorsAfter = (format: string, count: number): string[] => {
  const after = Array.from({ length: count }, () => '')
  let box = -1
  for (const character of format) {
    if (character === '#' || character === '*') {
      box += 1
      if (box >= count) {
        break
      }
    } else if (box >= 0 && box < count - 1) {
      after[box] += character
    }
  }
  return after
}

/** A code after an edit, and the box the caret is in after it. */
export interface CodeEdit {
  /** The box the caret is in, from 0, never past the last box. */
  caret: number
  /** The code's characters, as many as there are boxes at most. */
  code: string
}

/**
 * What the one field holds after the platform edited it, as a code: `raw` is
 * the field's text with the caret at `caret`, cleaned and cut at `count`, and
 * the caret is moved past only the characters the code kept before it.
 */
export const readTyped = (
  raw: string,
  caret: number,
  type: PinType,
  letterCase: PinCase,
  count: number,
): CodeEdit => ({
  caret: Math.min(cleanCode(raw.slice(0, caret), type, letterCase).length, count - 1),
  code: cleanCode(raw, type, letterCase).slice(0, count),
})

/** The field's selection for the caret in box `at`: the character there, or the place after the code. */
export const caretSelection = (
  at: number,
  length: number,
): { readonly end: number; readonly start: number } => ({
  end: at < length ? at + 1 : at,
  start: at,
})
