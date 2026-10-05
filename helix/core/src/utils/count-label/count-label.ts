import { fillTemplate } from '../fill-template/fill-template.js'
import { formatNumbers } from '../format-numbers/format-numbers.js'

/**
 * A count said in one of two sentences, the one for a single thing or the one
 * for any other number, with `{count}` filled in for `locale`.
 *
 * **`Intl.PluralRules` picks the sentence**, because the line between "one"
 * and "other" is the language's: French says "0 résultat" where English says
 * "0 results". A language with more forms than two writes its `one` in the
 * first sentence and the rest in the second.
 *
 * Data Table says how many rows a search left this way, and Listbox how many
 * options a filter left, which Combobox and Command hand down to it.
 */
export const countLabel = (count: number, one: string, other: string, locale = ''): string =>
  fillTemplate(new Intl.PluralRules(locale || undefined).select(count) === 'one' ? one : other, {
    count: formatNumbers(locale)(count),
  })
