import { formatMessage } from '../../words/message.js'
import { lookupWord } from '../../words/registry.js'
import { numberOf, numberOptions, textOf } from '../number-format/props.js'
import { figureOf, movementOf } from './trend-figure.js'

/** The props a trend is worked out from, by the web element's names. */
type TrendProps = Readonly<Record<string, unknown>>

/**
 * Each word a trend says, by its prop: the property the words registry knows
 * it by, and its English.
 */
const WORDS = {
  'better-label': ['betterLabel', 'better'],
  'down-label': ['downLabel', 'Down'],
  'judgment-label': [
    'judgmentLabel',
    '{judgment, select, better {{direction}, {betterLabel}} worse {{direction}, {worseLabel}} other {{direction}}}',
  ],
  'unchanged-label': ['unchangedLabel', 'Unchanged'],
  'up-label': ['upLabel', 'Up'],
  'worse-label': ['worseLabel', 'worse'],
} as const

type Word = keyof typeof WORDS

/** The prop that holds the word for each movement, and for one that is none of the three. */
const SAID: Readonly<Record<string, Word>> = {
  down: 'down-label',
  neutral: 'unchanged-label',
  up: 'up-label',
}

/**
 * A word as the web element reads it: the one the props give, then the one
 * registered for `helix-trend` in the locale, then the English. **A word
 * given as its English reads the registry**, as a phone cannot tell it from
 * one left unset.
 */
const wordOf = (props: TrendProps, name: Word, locale: string): string => {
  const [property, english] = WORDS[name]
  const own = props[name]
  if (typeof own === 'string' && own !== english) {
    return own
  }
  const registered = lookupWord(locale || 'en', 'helix-trend', property)?.[0]
  return typeof registered === 'string' ? registered : english
}

/** Which way a trend moved and what it says, from its props. */
export interface TrendReading {
  /** The trend moved the way `good` names. */
  readonly better: boolean
  /** The trend moved down. */
  readonly down: boolean
  /** The change `value` writes, or nothing where it is no number. */
  readonly figure: string
  /** The movement, as `movement`, the old `direction`, or the sign of `value` says. */
  readonly moved: string | undefined
  /** The movement as a screen reader hears it, judged where `good` judges it. */
  readonly said: string
  /** The trend moved up. */
  readonly up: boolean
  /** The trend moved against the way `good` names. */
  readonly worse: boolean
}

/**
 * A trend from its props: `movement`, then the old `direction`, then the sign
 * of `value` for the movement; `good` for the judgment; and `value` written
 * with `format-options`, as an object or as JSON, in `locale`.
 */
export const trendReading = (props: TrendProps): TrendReading => {
  const locale = textOf(props.locale)
  const value = numberOf(props.value)
  const set = (name: string) =>
    typeof props[name] === 'string' ? (props[name] as string) : undefined
  const moved = set('movement') ?? set('direction') ?? movementOf(value)
  const good = set('good')
  const judged =
    good && moved !== undefined && moved in SAID && moved !== 'neutral'
      ? good === moved
        ? 'better'
        : 'worse'
      : undefined
  const direction = wordOf(props, SAID[moved ?? ''] ?? 'unchanged-label', locale)
  return {
    better: judged === 'better',
    down: moved === 'down',
    figure:
      value === undefined ? '' : figureOf(value, locale, numberOptions(props['format-options'])),
    moved,
    said: formatMessage(
      wordOf(props, 'judgment-label', locale),
      {
        betterLabel: wordOf(props, 'better-label', locale),
        direction,
        judgment: judged ?? 'none',
        worseLabel: wordOf(props, 'worse-label', locale),
      },
      locale,
    ),
    up: moved === 'up',
    worse: judged === 'worse',
  }
}
