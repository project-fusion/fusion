/**
 * Toast's derivations: the edge of the window its stack stands along, and,
 * for each message, the mark its tone draws, the word a screen reader hears
 * for that tone, its dismiss button's name, how long its bar drains, and the
 * words it is said in as it arrives, as the web's region says them.
 */
import { lookupWord } from '../../words/registry.js'
import type { Derivation } from '../derivations/derivations.js'
import { textOf } from '../number-format/props.js'
import { contentWords } from '../remove-name/remove-name.js'
import { toneMark } from '../tone-marks/tone-marks.js'

/** The English a message's dismiss button is named by. */
export const TOAST_DISMISS_LABEL = 'Dismiss'

/** The glyph each tone draws, by the icon's name, as `TONE_MARKS` draws it on the web. */
const GLYPHS: Readonly<Record<string, string>> = {
  danger: 'x-circle-fill',
  info: 'info-fill',
  success: 'check-circle-fill',
  warning: 'warning-fill',
}

/**
 * Pieces of a message joined into one line a screen reader says, with a full
 * stop between two where the first does not already end a sentence, so a
 * heading and its detail are heard as two sentences and not run together.
 */
export const joinSaid = (pieces: readonly string[]): string =>
  pieces
    .map((piece) => piece.replace(/\s+/gu, ' ').trim())
    .filter((piece) => piece !== '')
    .reduce(
      (line, piece) =>
        line === '' ? piece : `${line}${/[.!?:;]$/u.test(line) ? '' : '.'} ${piece}`,
      '',
    )

/**
 * A word: the prop's own where it is not the English default, then the one
 * registered for the language, then the English.
 */
const wordOf = (
  props: Readonly<Record<string, unknown>>,
  tag: string,
  prop: string,
  key: string,
  english: string,
): string => {
  const own = textOf(props[prop])
  if (own !== english && props[prop] !== undefined) {
    return own
  }
  const registered = lookupWord(textOf(props.locale) || 'en', tag, key)?.[0]
  return typeof registered === 'string' ? registered : english
}

/** `toast-edge`: the edge of the window the stack stands along, `top` or `bottom`, from `placement`. */
export const toastEdge: Derivation = (props) =>
  textOf(props.placement).startsWith('top') ? 'top' : 'bottom'

/** `toast-item-glyph`: the mark a message's tone draws, and none for a message with no tone. */
export const toastItemGlyph: Derivation = (props) => GLYPHS[textOf(props.tone)] ?? ''

/** `toast-item-tone-name`: the word a screen reader hears for a message's tone, "Error" for `danger`. */
export const toastItemToneName: Derivation = (props) => toneMark(textOf(props.tone))?.label ?? ''

/** `toast-item-dismiss-name`: the dismiss button's name, `dismiss-label`, or its registered word. */
export const toastItemDismissName: Derivation = (props) =>
  wordOf(props, 'helix-toast-item', 'dismiss-label', 'dismissLabel', TOAST_DISMISS_LABEL)

/**
 * `toast-item-words`: what a message says as it arrives: the word for its
 * tone, then its heading, its description and its text, and never its
 * actions or its dismiss button, as the web's region says it.
 */
export const toastItemWords: Derivation = (props) =>
  joinSaid([
    toneMark(textOf(props.tone))?.label ?? '',
    contentWords(props.heading),
    contentWords(props.description),
    contentWords(props.default),
  ])

/** `toast-item-dismissed`: what a dismissal says the message was: the words of its text. */
export const toastItemDismissed: Derivation = (props) => contentWords(props.default).trim()

/** A time in milliseconds, from a number or a CSS time, `5s` or `300ms`, where it is more than none. */
const timeOf = (value: unknown): number | undefined => {
  const read = /^\s*(\d+\.?\d*|\.\d+)\s*(ms|s)?\s*$/iu.exec(String(value ?? ''))
  const count = read ? Number(read[2]?.toLowerCase() === 's' ? `${read[1]}e3` : read[1]) : 0
  return Number.isFinite(count) && count > 0 ? count : undefined
}

/** `toast-item-timer`: how long a timed message stays, as the CSS time its bar drains over. */
export const toastItemTimer: Derivation = (props) => {
  const ms = timeOf(props.duration)
  return ms === undefined ? '' : `${ms}ms`
}

/** `toast-item-urgent`: whether a message is said assertively, which a `danger` one is. */
export const toastItemIsUrgent: Derivation = (props) => textOf(props.tone) === 'danger'
