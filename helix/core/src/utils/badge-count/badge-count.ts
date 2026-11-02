import { formatMessage } from '../../words/message.js'
import { formatNumber } from '../number-format/number-format.js'

/*
 * What a badge's mark reads and says, from its value, as pure functions of the
 * properties that decide them.
 *
 * In core, because a badge on the web and a badge on a phone write the same
 * count: the web element calls these, and the native runtime calls them
 * through core's derivations.
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
 *
 * `label` is a message, so it can hold plural forms: `{count, plural, one
 * {{count} unread} other {{count} unread}}`. `{count}` is the text as the mark
 * shows it, such as `99+`, and the form is picked by its number in `locale`'s
 * rules, `other` where the text is no number.
 */
export const badgeWords = (text: string, label: string, blank: boolean, locale = ''): string => {
  if (blank || (text === '' && label === '')) {
    return ''
  }
  return formatMessage(label, { count: text }, locale) || text
}
