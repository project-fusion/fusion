import { formatMessage } from '../../words/message.js'
import { lookupWord } from '../../words/registry.js'
import { labelWith } from '../fill-template/fill-template.js'

/** The English a tag's remove button is named by, with `{label}` for the tag's words. */
export const REMOVE_LABEL = 'Remove {label}'

/**
 * The words of content passed into a region, as a phone passes it: text and
 * numbers, and the text of every element inside, read through its
 * `children`. Each child's runs of white space are made one, and the children
 * are joined by a space, as `slottedWords` reads a slot on the web.
 */
export const contentWords = (content: unknown): string => {
  const flat = (one: unknown): unknown[] => (Array.isArray(one) ? one.flatMap(flat) : [one])
  const textOf = (one: unknown): string => {
    if (typeof one === 'string' || typeof one === 'number') {
      return String(one)
    }
    if (typeof one !== 'object' || one === null || !('props' in one)) {
      return ''
    }
    const inner = (one as { readonly props?: { readonly children?: unknown } }).props?.children
    return flat(inner).map(textOf).join('')
  }
  return flat(content)
    .map((one) => textOf(one).replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join(' ')
}

/** The props a remove button's name is worked out from, by the web's names. */
export interface RemoveProps {
  readonly default?: unknown
  readonly 'dismiss-label'?: unknown
  readonly locale?: unknown
  readonly start?: unknown
}

/**
 * A tag's remove button's name, as the web tag names it: `dismiss-label`
 * with the tag's words, its category first, where it writes `{label}`, and
 * the words after it where it does not and does not hold them already.
 *
 * **The words are the label's own where none are given**, the one registered
 * for `helix-tag` in `locale`, then the English. A label given as its English
 * reads the registry too, as a phone cannot tell it from one left unset.
 */
export const removeName = (props: RemoveProps): string => {
  const locale = typeof props.locale === 'string' && props.locale !== '' ? props.locale : 'en'
  const own = props['dismiss-label']
  const registered = lookupWord(locale, 'helix-tag', 'dismissLabel')?.[0]
  const label =
    typeof own === 'string' && own !== REMOVE_LABEL
      ? own
      : typeof registered === 'string'
        ? registered
        : REMOVE_LABEL
  const words = [contentWords(props.start), contentWords(props.default)].filter(Boolean).join(' ')
  if (label.includes('{label}')) {
    return formatMessage(label, { label: words }, locale).trim()
  }
  return words === '' || label.includes(words) ? label : `${label} ${words}`
}

/** The English a filter chip's remove button is named by, before the chip's words. */
export const FILTER_REMOVE_LABEL = 'Remove filter'

/** The props a filter chip's remove button's name is worked out from, by the web's names. */
export interface FilterRemoveProps {
  readonly default?: unknown
  readonly 'dismiss-label'?: unknown
  readonly field?: unknown
  readonly label?: unknown
  readonly locale?: unknown
  readonly 'operator-label'?: unknown
}

/**
 * A filter chip's remove button's name, as the web chip names it:
 * `dismiss-label` with the chip's words, its field, its comparison, and its
 * values, such as "Remove filter Status is not open", where it writes `{label}`,
 * and the words after it where it does not.
 *
 * **The field's words are what is passed into `field`**, and otherwise `label`.
 * A label given as its English reads the words registered for
 * `helix-filter-chip` in `locale`, as a phone cannot tell it from one left unset.
 */
export const filterRemoveName = (props: FilterRemoveProps): string => {
  const locale = typeof props.locale === 'string' && props.locale !== '' ? props.locale : 'en'
  const own = props['dismiss-label']
  const registered = lookupWord(locale, 'helix-filter-chip', 'dismissLabel')?.[0]
  const label =
    typeof own === 'string' && own !== FILTER_REMOVE_LABEL
      ? own
      : typeof registered === 'string'
        ? registered
        : FILTER_REMOVE_LABEL
  const field = contentWords(props.field) || contentWords(props.label)
  const words = [field, contentWords(props['operator-label']), contentWords(props.default)]
    .filter(Boolean)
    .join(' ')
  return labelWith(label, 'label', words)
}
