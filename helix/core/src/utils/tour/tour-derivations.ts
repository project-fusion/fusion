/**
 * Tour's derivations: what a stop's panel is placed against and the edge of
 * the window a floating stop stands along, and the words a phone's tour
 * gives its stops, as the web's tour writes them on each stop.
 */
import { formatMessage } from '../../words/message.js'
import { lookupWord } from '../../words/registry.js'
import type { Derivation } from '../derivations/derivations.js'
import { textOf } from '../number-format/props.js'
import { contentWords } from '../remove-name/remove-name.js'

/**
 * `tour-stop-aim`: the id a stop's panel is placed against, its `for`, and
 * none for a dialog, a floating, or a `wait` stop, which their rules place
 * in the window and which point at nothing.
 */
export const tourStopAim: Derivation = (props) =>
  props.type === undefined || props.type === null || textOf(props.type) === ''
    ? textOf(props.for)
    : ''

/** `tour-stop-edge`: the window's bottom edge for a floating stop, and none for any other. */
export const tourStopEdge: Derivation = (props) =>
  textOf(props.type) === 'floating' ? 'bottom' : undefined

/** The English each stop's controls say, and the tour's place in the run. */
export const TOUR_WORDS = {
  backLabel: 'Back',
  doneLabel: 'Done',
  nextLabel: 'Next',
  progressLabel: '{index} of {count}',
  skipLabel: 'Skip',
} as const

/** The language a word is looked up in: the element's `locale`, or English. */
const languageOf = (props: Readonly<Record<string, unknown>>): string =>
  textOf(props.locale) || 'en'

/**
 * A word of a tour's: the prop's own where it is set and not the English
 * default, then the one registered for the language under `tag`, then the
 * English, as an element's `@words` resolve on the web.
 */
export const tourWord = (
  props: Readonly<Record<string, unknown>>,
  tag: 'helix-tour' | 'helix-tour-stop',
  key: keyof typeof TOUR_WORDS,
  own: unknown,
): string => {
  const english = TOUR_WORDS[key]
  const set = textOf(own)
  if (own !== undefined && own !== null && set !== english) {
    return set
  }
  const registered = lookupWord(languageOf(props), tag, key)?.[0]
  return typeof registered === 'string' ? registered : english
}

/**
 * A stop's place in the run, such as "2 of 5": the tour's `progress-label`,
 * or its registered word, with `{index}` and `{count}` written in its
 * language, as the web's tour writes `position` on each stop.
 */
export const tourPlace = (
  props: Readonly<Record<string, unknown>>,
  index: number,
  count: number,
): string =>
  formatMessage(
    tourWord(props, 'helix-tour', 'progressLabel', props.progressLabel),
    { count, index },
    languageOf(props),
  )

/**
 * A control's label: the tour's own where it holds words, as the web's tour
 * writes it on each stop, and otherwise the stop's.
 */
export const tourControlWord = (
  tour: Readonly<Record<string, unknown>>,
  stop: Readonly<Record<string, unknown>>,
  key: 'backLabel' | 'doneLabel' | 'nextLabel' | 'skipLabel',
): string => {
  const given = textOf(tour[key])
  return given === '' ? tourWord(stop, 'helix-tour-stop', key, stop[key]) : given
}

/** The words of some content, as a stop's panel is described by them. */
export const tourWords = (content: unknown): string => contentWords(content).trim()
