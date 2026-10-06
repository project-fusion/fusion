import { formatMessage } from '../../words/message.js'

/**
 * A count said in one of two sentences, the one for a single thing or the one
 * for any other number, with `{count}` filled in for `locale`.
 *
 * **`Intl.PluralRules` picks the sentence**, because the line between "one"
 * and "other" is the language's: French says "0 résultat" where English says
 * "0 results". Each sentence is a message, so `other` can hold every form a
 * language has, `{count, plural, one {# wynik} few {# wyniki} many {# wyników}
 * other {# wyniku}}`, and an empty `one` leaves the choice to it.
 *
 * Kept for the families whose singular property is still read. A family on the
 * words registry formats its one plural message with `formatWords`. Listbox
 * says how many options a filter left this way, which Combobox and Command
 * hand down to it.
 */
export const countLabel = (count: number, one: string, other: string, locale = ''): string =>
  formatMessage(
    one && new Intl.PluralRules(locale || undefined).select(count) === 'one' ? one : other,
    { count },
    locale,
  )
