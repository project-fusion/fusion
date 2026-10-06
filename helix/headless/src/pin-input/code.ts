import { fillTemplate, type PickerVerdict } from '@fusion.dev/helix-core'

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

/** The messages a code's verdict is written with, where the page set its own. */
export interface CodeMessages {
  /** For a code with no characters in a required field. */
  missing?: string | undefined
  /** For a code with fewer characters than boxes; `{length}` is how many. */
  short?: string | undefined
}

/**
 * What is wrong with a code, as a picker field reports it: a required field
 * with nothing in it is missing, a code with fewer characters than boxes is
 * too short, and anything else is fine (`''`). The platform's own words where
 * the page set none.
 */
export const codeVerdict = (
  code: string,
  count: number,
  required: boolean,
  messages: CodeMessages,
): PickerVerdict => {
  if (required && code === '') {
    return ['valueMissing', messages.missing || 'Please fill in this field.']
  }
  if (code !== '' && code.length < count) {
    return [
      'tooShort',
      fillTemplate(messages.short || 'Please enter all {length} characters.', { length: count }),
    ]
  }
  return ''
}

/**
 * The box a caret key moves to from `caret`, kept within the boxes up to
 * `end`, or `undefined` for a key that moves nothing.
 *
 * Not `inlineStep`: the row is left to right whatever the page, so the key
 * pointing right is the one that moves on in every script.
 */
export const caretTo = (key: string, caret: number, end: number): number | undefined => {
  const to =
    key === 'ArrowRight'
      ? caret + 1
      : key === 'ArrowLeft'
        ? caret - 1
        : key === 'Home'
          ? 0
          : key === 'End'
            ? end
            : undefined
  return to === undefined ? undefined : Math.max(0, Math.min(to, end))
}
