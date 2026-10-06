/** What a box accepts, which decides the keyboard a phone offers. */
export type PinType = 'alphanumeric' | 'numeric' | 'text'

/** How typed letters are cased: as typed, or turned upper or lower case. */
export type PinCase = 'lower' | 'preserve' | 'upper'

/**
 * Typed or pasted text as the code's characters: trimmed, with what `type`
 * refuses dropped, and its letters cased as `letterCase` asks. Web Awesome's
 * OTP input takes the same `case`.
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

/**
 * A run of characters written over `code` from box `at` onward, which is what a
 * paste does: the boxes it reaches take its characters and the rest keep
 * theirs, and anything past the last box is dropped.
 *
 * **A code has no holes in it**, so the run starts no later than the end of
 * the code: a whole code pasted into an empty field fills from the first box
 * wherever the caret was, and two characters pasted into box three of a field
 * holding two fill from box three.
 */
export const overwriteCode = (code: string, at: number, text: string, count: number): CodeEdit => {
  const start = Math.min(at, code.length)
  const characters = [...code.slice(0, count)]
  for (let offset = 0; offset < text.length && start + offset < count; offset += 1) {
    characters[start + offset] = text[offset] as string
  }
  return { caret: Math.min(count - 1, start + text.length), code: characters.join('') }
}
