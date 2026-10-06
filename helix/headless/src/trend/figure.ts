import { formatNumber } from '@fusion.dev/helix-core'

/**
 * The movement a signed change makes: `up` above zero, `down` below it and
 * `neutral` at zero. Nothing for a value that is no number, so a trend with
 * none falls back to what its attributes say.
 */
export const movementOf = (value: number | undefined): 'down' | 'neutral' | 'up' | undefined => {
  if (value === undefined || !Number.isFinite(value)) {
    return undefined
  }
  return value > 0 ? 'up' : value < 0 ? 'down' : 'neutral'
}

/**
 * A change written in a locale with `Intl.NumberFormat` options, such as
 * `12%` for 0.12 with `{ style: 'percent' }`.
 *
 * **The size of the change, with no sign**, because the movement is already
 * said by the arrow and the word: "Down, worse 8%" rather than "Down, worse
 * -8%". Options that set `signDisplay` ask for the sign, and get the value as
 * it is.
 */
export const figureOf = (value: number, locale = '', options?: Intl.NumberFormatOptions): string =>
  formatNumber(options?.signDisplay === undefined ? Math.abs(value) : value, locale, options)
