/**
 * Callout's derivations: the mark its tone draws and the word a screen
 * reader hears for it, its dismiss button's name, and what its dismissal
 * says it was, as the web callout works them out.
 */
import { formatMessage } from '../../words/message.js'
import { lookupWord } from '../../words/registry.js'
import type { Derivation } from '../derivations/derivations.js'
import { textOf } from '../number-format/props.js'
import { contentWords } from '../remove-name/remove-name.js'

/** The props a callout is drawn from, by the web element's attribute names. */
type CalloutProps = Readonly<Record<string, unknown>>

/** The tag a callout's words are registered under. */
const TAG = 'helix-callout'

/** The English each tone is said in. */
export const CALLOUT_TONE_LABELS: Readonly<Record<string, string>> = {
  danger: 'Error',
  info: 'Information',
  neutral: 'Note',
  success: 'Success',
  warning: 'Warning',
}

/** The English a dismiss button is named by, with `{label}` for what the callout is called. */
export const CALLOUT_DISMISS_LABEL = 'Dismiss {label}'

/** The glyph each tone draws, by the icon's name. `neutral` draws the information mark. */
const GLYPHS: Readonly<Record<string, string>> = {
  danger: 'x-circle-fill',
  info: 'info-fill',
  neutral: 'info-fill',
  success: 'check-circle-fill',
  warning: 'warning-fill',
}

/** The language the words are in: the callout's `locale`, or English. */
const languageOf = (props: CalloutProps): string => textOf(props.locale) || 'en'

/** The tone a callout draws: its own where it is one of the five, and `info` otherwise. */
const toneOf = (props: CalloutProps): string => {
  const tone = textOf(props.tone)
  return tone in CALLOUT_TONE_LABELS ? tone : 'info'
}

/** `callout-glyph`: the mark the tone draws where no icon is passed in. */
export const calloutGlyph: Derivation = (props) => GLYPHS[toneOf(props)]

/**
 * `callout-tone-name`: the word a screen reader hears for the tone:
 * `tone-label`, the tone's word in `tone-labels`, the one registered for the
 * callout's language, or the English.
 */
export const calloutToneName: Derivation = (props) => {
  const own = textOf(props['tone-label'])
  if (own !== '') {
    return own
  }
  const tone = toneOf(props)
  const given = props['tone-labels']
  const registered = lookupWord(languageOf(props), TAG, 'toneLabels')?.[0]
  const words = {
    ...CALLOUT_TONE_LABELS,
    ...(typeof registered === 'object' ? (registered as Record<string, string>) : {}),
    ...(typeof given === 'object' && given !== null ? (given as Record<string, string>) : {}),
  }
  return words[tone] ?? ''
}

/**
 * `callout-dismiss-name`: the dismiss button's name: `dismiss-label` with
 * the heading's words, or the tone's word where there is no heading, as
 * "Dismiss Scheduled maintenance". A label without `{label}` is read as
 * written.
 */
export const calloutDismissName: Derivation = (props) => {
  const language = languageOf(props)
  const own = textOf(props['dismiss-label'])
  const registered = lookupWord(language, TAG, 'dismissLabel')?.[0]
  const label =
    own !== '' && own !== CALLOUT_DISMISS_LABEL
      ? own
      : typeof registered === 'string'
        ? registered
        : CALLOUT_DISMISS_LABEL
  if (!label.includes('{label}')) {
    return label
  }
  const named = contentWords(props.heading) || String(calloutToneName(props) ?? '')
  return formatMessage(label, { label: named }, language).trim()
}

/**
 * `callout-dismissed`: what a dismissal says the callout was: its heading's
 * words where it has a heading, and the words of its content otherwise.
 */
export const calloutDismissed: Derivation = (props) =>
  contentWords(props.heading) || contentWords(props.default)
