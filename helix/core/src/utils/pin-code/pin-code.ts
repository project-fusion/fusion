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
