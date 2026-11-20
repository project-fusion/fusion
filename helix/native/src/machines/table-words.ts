/**
 * The words a table says on a phone: a prop a page set, a language's words, and
 * the default, in that order, as the web's `@words` reads them.
 */
import { locale } from '@fusion.dev/helix-core/capabilities/locale'
import { formatMessage, lookupWord } from '@fusion.dev/helix-core/words'
import type { Props } from '../render/behavior'
import { madeFor } from '../render/made'
import type { Family } from '../style/form'
import { given } from './props'

/** The template a words prop holds. */
export const wordOf = (family: Family, props: Props, name: string): string => {
  if (props[name] !== undefined) {
    return String(props[name])
  }
  const found = lookupWord(locale().read(), 'helix-table', name)
  if (typeof found?.[0] === 'string') {
    return found[0]
  }
  /* A prop's name in a form is its attribute's. A word Data Table has no prop for
     is the table's, as the words of a row's disclosure are. */
  const attribute = name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
  const own = given(family, props, attribute)
  return String(own ?? given(madeFor('helix-table')?.family ?? family, {}, attribute) ?? '')
}

/** The words a words prop holds, formatted. */
export const worded = (
  family: Family,
  props: Props,
  name: string,
  values: Readonly<Record<string, unknown>>,
): string => formatMessage(wordOf(family, props, name), values as never, locale().read())
