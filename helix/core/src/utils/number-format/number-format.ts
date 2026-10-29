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
/* `null` is what an `Object` property reads once its attribute is taken off,
   and `Intl.NumberFormat` throws on it where it takes `undefined`. */
const formatter = (
  locale: string,
  options: Intl.NumberFormatOptions | null | undefined,
): Intl.NumberFormat => {
  const key = `${locale}|${JSON.stringify(options ?? {})}`
  let found = held.get(key)
  if (!found) {
    found = new Intl.NumberFormat(locale || undefined, options ?? undefined)
    held.set(key, found)
  }
  return found
}

/** Writes a number in a locale with `Intl.NumberFormat` options. */
export const formatNumber = (
  value: number,
  locale = '',
  options?: Intl.NumberFormatOptions | null,
): string => formatter(locale, options).format(value)

/** A share written as a whole percentage, which a reading says by default. */
const WHOLE_PERCENT: Intl.NumberFormatOptions = { maximumFractionDigits: 0, style: 'percent' }

/**
 * A share, from 0 to 1, as a locale writes a whole percentage: `40%`, or
 * `40 %` in French. For `aria-valuetext`, since a bare `aria-valuenow` is read
 * as a number with no unit. Splitter's position and Meter's and Progress's
 * readings are written with it.
 */
export const formatPercent = (share: number, locale = ''): string =>
  formatNumber(share, locale, WHOLE_PERCENT)

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
 * Text with every decimal digit written in ASCII: Arabic-Indic `١٢٣`, Persian
 * `۱۲۳` and Devanagari `१२३` read as `123`. A keyboard in one of those
 * locales types its own digits, and `Number` reads only ASCII.
 */
export const latinDigits = (text: string): string =>
  text.replace(/\p{Nd}/gu, (digit) => {
    /* Unicode writes each script's digits as a run of ten from its zero, and
       some runs follow each other, so the digit's place is counted from the
       start of the run it is in. */
    const point = digit.codePointAt(0) ?? 0
    let zero = point
    while (/\p{Nd}/u.test(String.fromCodePoint(zero - 1))) {
      zero -= 1
    }
    return String((point - zero) % 10)
  })

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
/**
 * A number's parts as `formatToParts` gives them, or read off `format` where
 * the engine has no `formatToParts`, as iOS's Hermes has none for numbers.
 * Read off: the mark between the digits of `1` and `5` in one and a half is
 * the decimal, the mark between `2` and `3` in twelve thousand the group,
 * and the words left once the number is taken out are literals, which is all
 * `parseNumber` reads of them.
 */
export const partsOf = (format: Intl.NumberFormat, value: number): Intl.NumberFormatPart[] => {
  if (typeof format.formatToParts === 'function') {
    return format.formatToParts(value)
  }
  const digits = (text: string): string => latinDigits(text)
  const decimal = /1(\D+)5/u.exec(digits(format.format(1.5)))?.[1]
  const group = /2(\D+)3/u.exec(digits(format.format(12345)))?.[1]
  const parts: Intl.NumberFormatPart[] = []
  if (group !== undefined) {
    parts.push({ type: 'group', value: group })
  }
  if (decimal !== undefined) {
    parts.push({ type: 'decimal', value: decimal })
  }
  let rest = digits(format.format(value)).replace(/[\d\-\u2212]/gu, ' ')
  for (const mark of [group, decimal]) {
    rest = mark === undefined ? rest : rest.split(mark).join(' ')
  }
  const words = rest.split(/\s+/u).filter((word) => word !== '')
  for (const word of words) {
    parts.push({ type: 'literal', value: word })
  }
  return parts
}

export const parseNumber = (
  text: string,
  locale = '',
  options?: Intl.NumberFormatOptions,
): number | null => {
  const format = formatter(locale, options)
  const parts = partsOf(format, -12345.6)
  /* And a sample of one, whose words are the singular where the locale has
     one: `1 kilogram` beside `-12,345.6 kilograms`. */
  const one = partsOf(format, 1)
  const of = (type: string, from = parts): string[] =>
    from.filter((part) => part.type === type).map((part) => part.value)
  /* **The separators are the locale's, read from its plain format where the
     options write none**: a percent shows no fraction and `useGrouping: false`
     no groups, so the sample lacked the part. Measured before this: a
     zero-fraction percent in `de-DE` fell back to a point for the decimal,
     the same mark as its group, and refused both `0.25` and `12,5 %`. */
  const plain = partsOf(formatter(locale, undefined), -12345.6)
  const group = of('group')[0] ?? of('group', plain)[0] ?? ','
  const decimal = of('decimal')[0] ?? of('decimal', plain)[0] ?? '.'
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
  /* Digits in the locale's own script, `١٢٣` in Arabic, are read as ASCII,
     and the direction marks a right-to-left locale writes around its minus
     sign are dropped. Measured before this: `١٢٣` typed in `ar-EG` was no
     number. */
  let read = latinDigits(text).replace(/[\s\u00a0\u202f\u061c\u200e\u200f]/gu, '')
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
