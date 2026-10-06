/**
 * Writes and reads numbers in a locale with `Intl.NumberFormat` options, for a
 * control that shows a number and takes one typed: a currency, a percent, a
 * unit, or grouped thousands. React Aria's NumberField and Slider take the same
 * `formatOptions`.
 *
 * **Formatters are kept**, by locale and options, since one is expensive to
 * build and cheap to call, and a control formats on every update.
 */

/** The formatters built so far, by locale and options. */
const held = new Map<string, Intl.NumberFormat>()

/** The formatter for a locale and options. An empty locale is the runtime's. */
const formatter = (
  locale: string,
  options: Intl.NumberFormatOptions | undefined,
): Intl.NumberFormat => {
  const key = `${locale}|${JSON.stringify(options ?? {})}`
  let found = held.get(key)
  if (!found) {
    found = new Intl.NumberFormat(locale || undefined, options)
    held.set(key, found)
  }
  return found
}

/** Writes a number in a locale with `Intl.NumberFormat` options. */
export const formatNumber = (
  value: number,
  locale = '',
  options?: Intl.NumberFormatOptions,
): string => formatter(locale, options).format(value)

/** A share written as a whole percentage, which a reading says by default. */
const WHOLE_PERCENT: Intl.NumberFormatOptions = { maximumFractionDigits: 0, style: 'percent' }

/**
 * A reading in words: `value` written with `options` where they say another
 * style, and otherwise `share`, from 0 to 1, as a percentage, whole unless
 * `options` say more.
 *
 * Meter and Progress each wrote this, with the value each holds to its range
 * and the share of it that is filled.
 */
export const readingText = (
  value: number,
  share: number,
  locale = '',
  options?: Intl.NumberFormatOptions,
): string =>
  options && options.style !== 'percent'
    ? formatNumber(value, locale, options)
    : formatNumber(share, locale, options ?? WHOLE_PERCENT)

/**
 * Whether the group separators in a number stand where a locale puts them:
 * one to three digits, then groups of three, up to the decimal separator.
 */
const grouped = (text: string, separator: string, decimal: string): boolean => {
  const whole = (text.split(decimal)[0] ?? '').replace(/^[+-]/u, '')
  return new RegExp(`^\\d{1,3}(${literal(separator)}\\d{3})+$`, 'u').test(whole)
}

/** Escapes text for use inside a regular expression. */
const literal = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')

/**
 * Reads a number written in a locale with the same options it is shown with,
 * or `null` where the text is no number.
 *
 * The locale's group separators are dropped and its decimal separator read as
 * a point, so `1.234,5` in `de-DE` is 1234.5. A currency sign, a percent sign
 * and a unit the options write are dropped too, in the plural and the
 * singular, and a percent is read back as
 * the fraction it shows: `25 %` is 0.25. A point is read as a decimal point in
 * a locale that groups with something else, which is what a decimal keypad
 * types.
 */
export const parseNumber = (
  text: string,
  locale = '',
  options?: Intl.NumberFormatOptions,
): number | null => {
  const format = formatter(locale, options)
  const parts = format.formatToParts(-12345.6)
  /* And a sample of one, whose words are the singular where the locale has
     one: `1 kilogram` beside `-12,345.6 kilograms`. */
  const one = format.formatToParts(1)
  const of = (type: string, from = parts): string[] =>
    from.filter((part) => part.type === type).map((part) => part.value)
  const group = of('group')[0] ?? ','
  const decimal = of('decimal')[0] ?? '.'
  const named = (from: Intl.NumberFormatPart[]): string[] => [
    ...of('currency', from),
    ...of('percentSign', from),
    ...of('unit', from),
    ...of('literal', from),
  ]
  /* Longest first, so `kilogram` never leaves the `s` of `kilograms`. */
  const dropped = [...new Set([...named(parts), ...named(one)].map((word) => word.trim()))]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
  const percent = options?.style === 'percent' && /[%\u066a\u2030]/u.test(text)
  let read = text.replace(/[\s\u00a0\u202f]/gu, '')
  for (const one of dropped) {
    read = read.replace(new RegExp(literal(one), 'gu'), '')
  }
  read = read.replace(/[\u2212\u2012\u2013]/gu, '-')
  const separator = group.trim() || group
  if (read.includes(separator) && !grouped(read, separator, decimal)) {
    /* A separator out of place, such as `1,5` in a locale that groups with a
       comma, is no number: a reader meant something the field cannot know. */
    if (group !== '.' || read.includes(decimal)) {
      return null
    }
  }
  if (group !== '.' || decimal === '.') {
    read = read.replace(new RegExp(literal(separator), 'gu'), '')
  } else if (read.includes(decimal)) {
    read = read.replaceAll(group, '')
  } else {
    /* A point and no decimal comma, in a locale that groups with points: a
       decimal point, which is what a decimal keypad types. */
    read = read.replaceAll(group, '.')
  }
  read = read.replace(decimal, '.')
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/u.test(read)) {
    return null
  }
  const parsed = Number(read)
  if (!Number.isFinite(parsed)) {
    return null
  }
  return percent ? parsed / 100 : parsed
}
