/**
 * The steps a number field takes when `step` is not set, read off its format.
 *
 * React Aria's NumberField does not round a typed number to whole steps when
 * no step is given: it keeps the fraction the format shows. A field showing
 * dollars keeps cents, and one showing a percent steps by one percent.
 */

/**
 * The smallest amount a format shows, which is the grid a typed number is
 * rounded to when no `step` is set: `0.01` for a currency in dollars, `0.001`
 * for a plain decimal, and `0.01` for a whole percent, since a percent shows
 * the number a hundred times over.
 */
export const formatGrain = (locale: string, options: Intl.NumberFormatOptions): number => {
  const { maximumFractionDigits = 0 } = new Intl.NumberFormat(
    locale || undefined,
    options,
  ).resolvedOptions()
  const places = maximumFractionDigits + (options.style === 'percent' ? 2 : 0)
  return Number(`1e-${places}`)
}

/**
 * How far one press moves when no `step` is set: one percent for a percent,
 * as React Aria does, and one otherwise.
 */
export const strideOf = (options: Intl.NumberFormatOptions | undefined): number =>
  options?.style === 'percent' ? 0.01 : 1

/**
 * How many decimal places a number is written with.
 *
 * Read off the string rather than computed, because the question is about how
 * the consumer wrote the step and not about what the binary can represent.
 * `1e-7` is handled separately: its string form has no dot at all, so counting
 * after one would say zero and round every result to a whole number.
 */
export const decimals = (value: number): number => {
  const text = String(value)
  const exponent = /e-(\d+)$/.exec(text)
  if (exponent) {
    return Number(exponent[1])
  }
  return (text.split('.')[1] ?? '').length
}
