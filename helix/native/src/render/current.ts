import { lookupWord } from '@fusion.dev/helix-core/words'

/**
 * What a phone says after a part's name where its `current` says which of a
 * set it is, by `aria-current`'s values. **React Native has no state for
 * it**, so it is said in words, as the part's value.
 */
const CURRENT = {
  date: 'Current date',
  location: 'Current location',
  page: 'Current page',
  step: 'Current step',
  time: 'Current time',
  true: 'Current',
} as const

type Which = keyof typeof CURRENT

/**
 * The words a part that is current is read with, or `undefined` where it is
 * not: `true` or one of `aria-current`'s values, and nothing for `false` or
 * an empty string. **An app translates them** as it translates any
 * component's words, under `helix-current`:
 *
 * ```ts
 * registerWords('de', { 'helix-current': { page: 'Aktuelle Seite' } })
 * ```
 */
export const currentWords = (current: unknown, locale: string | undefined): string | undefined => {
  const which = current === true ? 'true' : current
  if (typeof which !== 'string' || !Object.hasOwn(CURRENT, which)) {
    return undefined
  }
  const found = locale === undefined ? undefined : lookupWord(locale, 'helix-current', which)
  return typeof found?.[0] === 'string' ? found[0] : CURRENT[which as Which]
}
