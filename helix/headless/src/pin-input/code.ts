import type { PickerVerdict } from '@fusion.dev/helix-core'

import { type CodeEdit, cleanCode, readTyped } from '@fusion.dev/helix-core/pin-code'

/* Cleaning a code and reading an edit are core's, which a phone's Pin Input reads too. */
export { type CodeEdit, cleanCode, readTyped }

/**
 * What a box accepts, which decides the keyboard a phone offers. Written out
 * here, as core's, so the attribute's values are in its type.
 */
export type PinType = 'alphanumeric' | 'numeric' | 'text'

/** How typed letters are cased: as typed, or turned upper or lower case. */
export type PinCase = 'lower' | 'preserve' | 'upper'

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

/** The messages a code's verdict is written with. */
export interface CodeMessages {
  /** For a code with no characters in a required field. */
  missing?: string | undefined
  /** For a code with fewer characters than boxes, written for how many there are. */
  short: (length: number) => string
}

/**
 * What is wrong with a code, as a picker field reports it: a required field
 * with nothing in it is missing, a code with fewer characters than boxes is
 * too short, and anything else is fine (`''`). The platform's own words for a
 * missing code where the page set none.
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
    return ['tooShort', messages.short(count)]
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
