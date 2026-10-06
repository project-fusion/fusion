import { fillTemplate, formatNumber } from '@fusion.dev/helix-core'

/*
 * What a badge's mark reads and says, from its value, as pure functions of the
 * properties that decide them.
 *
 * Beside the family's `index.ts`, because capping and wording a count is a
 * rule and not the mark's template.
 */

/** Whether the value counts nothing, in which case there is no mark. */
export const badgeBlank = (given: string): boolean => given.trim() !== '' && Number(given) === 0

/** Whether the count is past `max`, which the mark shows as `{max}+`. */
export const badgeCapped = (given: string, max: number | undefined): boolean => {
  const count = Number(given)
  return max !== undefined && Number.isFinite(count) && count > max
}

/**
 * What the mark reads once the cap has been applied: the value as given, or
 * written with `options` in `locale` where they are set and it is a number.
 */
export const badgeText = (
  given: string,
  max: number | undefined,
  locale: string,
  options: Intl.NumberFormatOptions | undefined,
): string => {
  const write = (count: number): string =>
    options ? formatNumber(count, locale, options) : String(count)
  if (badgeCapped(given, max)) {
    return `${write(max as number)}+`
  }
  const count = Number(given)
  return options && given.trim() !== '' && Number.isFinite(count) ? write(count) : given
}

/**
 * What a reader hears for the mark: `label` with `{count}` filled, or the text
 * alone, and nothing for a blank mark or an unnamed dot.
 */
export const badgeWords = (text: string, label: string, blank: boolean): string => {
  if (blank || (text === '' && label === '')) {
    return ''
  }
  return fillTemplate(label, { count: text }) || text
}
