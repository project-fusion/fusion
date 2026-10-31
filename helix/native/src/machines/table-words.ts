/**
 * The words a table says on a phone: a prop a page set, a language's words, and
 * the default, in that order, as the web's `@words` reads them.
 */
import { locale } from '@fusion.dev/helix-core/capabilities/locale'
import { formatMessage, lookupWord } from '@fusion.dev/helix-core/words'
import type { Props } from '../render/behavior'
import type { Family } from '../style/form'
import { given } from './props'

/** The template a words prop holds. */
export const wordOf = (family: Family, props: Props, name: string): string => {
  if (props[name] !== undefined) {
    return String(props[name])
  }
  const found = lookupWord(locale().read(), 'helix-table', name)
  return typeof found?.[0] === 'string' ? found[0] : String(given(family, props, name) ?? '')
}

/** The words a words prop holds, formatted. */
export const worded = (
  family: Family,
  props: Props,
  name: string,
  values: Readonly<Record<string, unknown>>,
): string => formatMessage(wordOf(family, props, name), values as never, locale().read())
