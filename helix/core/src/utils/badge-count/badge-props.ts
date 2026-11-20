import { numberOf, numberOptions, textOf } from '../number-format/props.js'
import { badgeBlank, badgeCapped, badgeText, badgeWords } from './badge-count.js'

/** The props a badge's mark is worked out from, by the web element's names. */
type BadgeProps = Readonly<Record<string, unknown>>

/** What a badge's mark is, from its props, as the web element works it out. */
export interface BadgeMark {
  /** The value counts nothing, so there is no mark. */
  readonly blank: boolean
  /** The count is past `max`, so the mark shows `{max}+`. */
  readonly capped: boolean
  /** There is no value and no icon, so the mark is a dot. */
  readonly dot: boolean
  /** The mark shows one character or none, so it is a circle. */
  readonly single: boolean
  /** What the mark shows. */
  readonly text: string
  /** There is no value, which the web marks `data-dot`. */
  readonly unset: boolean
  /** What a reader hears for the mark, or nothing. */
  readonly words: string
}

/**
 * A badge's mark from its props: `value`, `max`, `format-options` as an
 * object or as JSON, `label`, `locale`, and `icon`, whatever is passed into
 * the icon's region.
 */
export const badgeMark = (props: BadgeProps): BadgeMark => {
  const given = String(props.value ?? '')
  const max = numberOf(props.max)
  const locale = textOf(props.locale)
  const blank = badgeBlank(given)
  const text = badgeText(given, max, locale, numberOptions(props['format-options']))
  const icon = props.icon !== undefined && props.icon !== null && props.icon !== false
  return {
    blank,
    capped: badgeCapped(given, max),
    dot: given.trim() === '' && !icon,
    single: text.length <= 1,
    text,
    unset: given.trim() === '',
    words: badgeWords(text, textOf(props.label), blank, locale),
  }
}
