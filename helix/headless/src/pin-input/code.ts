/** What a cell accepts, which decides the keyboard a phone offers. */
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
