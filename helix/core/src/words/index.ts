/*
 * `@fusion.dev/helix-core/words`: the words registry, on its own.
 *
 * The same exports reach you from `@fusion.dev/helix-core`,
 * `@fusion.dev/helix-headless` and `@fusion.dev/helix`. This entry is for a
 * page that registers words before it loads any element.
 */
export {
  formatMessage,
  type Message,
  type MessageOptions,
  type MessageTable,
  type MessageValues,
} from './message.js'
export {
  clearWords,
  type HelixWords,
  localeChain,
  lookupWord,
  refreshWords,
  registerWords,
  setDefaultWordsLocale,
  type Words,
} from './registry.js'
export { handedLocale, wordsLocale } from './words-locale.js'
