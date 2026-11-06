/**
 * The words a family takes from `registerWords`, for those that read them as
 * props: a prop a page set, a language's words, and the default, in that order,
 * as the web's `@words` reads them.
 */
import { lookupWord } from '@fusion.dev/helix-core/words'
import type { Family } from '../style/form'
import type { Props } from './behavior'

/** The props each tag reads from the words registry. */
const WORDS: Readonly<Record<string, readonly string[]>> = {
  'helix-log': [
    'doneLabel',
    'droppedLabel',
    'emptyText',
    'errorLabel',
    'fallbackLabel',
    'groupLabel',
    'lineLabel',
    'loadingText',
    'matchesLabel',
    'resumeLabel',
  ],
  'helix-log-group': ['statusLabel'],
  'helix-log-line': ['levelWords', 'lineLabel', 'timesLabel'],
  'helix-notification': ['dismissLabel', 'unreadLabel'],
  'helix-notifications': [
    'arrivedLabel',
    'emptyText',
    'fallbackLabel',
    'loadMoreLabel',
    'loadingText',
    'markAllLabel',
  ],
}

/** `props`, with the words registered for the language in each prop a page left unset. */
export const withWords = (family: Family, props: Props, locale: string | undefined): Props => {
  const names = WORDS[family.tag]
  if (names === undefined || locale === undefined) {
    return props
  }
  let worded = props
  for (const name of names) {
    const found = props[name] === undefined ? lookupWord(locale, family.tag, name)?.[0] : undefined
    if (found !== undefined) {
      worded = { ...worded, [name]: found }
    }
  }
  return worded
}
