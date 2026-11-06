/*
 * Reads the props a number is written from, as a derivation is given them:
 * by the web element's names, and in whichever form a platform holds them.
 */

/**
 * `Intl.NumberFormat` options, as an object or as the JSON the web's
 * attribute holds, or `undefined` where there are none or they do not read.
 */
export const numberOptions = (options: unknown): Intl.NumberFormatOptions | undefined => {
  if (typeof options === 'string') {
    try {
      return options.trim() === '' ? undefined : numberOptions(JSON.parse(options))
    } catch {
      return undefined
    }
  }
  return typeof options === 'object' && options !== null && !Array.isArray(options)
    ? (options as Intl.NumberFormatOptions)
    : undefined
}

/** A number, as a number or the words of one, or `undefined` where it is none. */
export const numberOf = (value: unknown): number | undefined => {
  const number = typeof value === 'string' && value.trim() !== '' ? Number(value) : value
  return typeof number === 'number' && Number.isFinite(number) ? number : undefined
}

/** A string prop, or the empty string where it holds none. */
export const textOf = (value: unknown): string => (typeof value === 'string' ? value : '')
