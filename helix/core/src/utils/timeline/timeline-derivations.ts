/**
 * Timeline's derivations: what an entry's mark says and draws, and the
 * reading of how long ago its `datetime` was, as the web entry draws them.
 * The reading ticks on the element's clock, which gives each derivation the
 * time of its last tick as `now`.
 */
import { timers } from '../../capabilities/timers/index.js'
import { lookupWord } from '../../words/registry.js'
import type { Derivation } from '../derivations/derivations.js'
import type { Expiry } from '../format-date/format-date.js'
import { numberOf, textOf } from '../number-format/props.js'
import { type Relative, relativeTime } from '../relative-time/relative-time.js'

/** The props an entry is drawn from, by the web element's attribute names. */
type EntryProps = Readonly<Record<string, unknown>>

/** The tag an entry's words are registered under. */
const TAG = 'helix-timeline-item'

/** The English each tone is said in. `neutral` and `primary` say nothing. */
export const TIMELINE_TONE_LABELS: Readonly<Record<string, string>> = {
  danger: 'Error',
  info: 'Information',
  success: 'Success',
  warning: 'Warning',
}

/** The English a pending entry is said with. */
export const TIMELINE_PENDING_LABEL = 'Scheduled'

/** The styles `relative` names; anything else, the empty flag among them, reads `long`. */
const STYLES: readonly Intl.RelativeTimeFormatStyle[] = ['long', 'narrow', 'short']

/** A date with no time of day, which names a day rather than an instant. */
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

/** The language the entry's words are in: its `locale`, or English. */
const languageOf = (props: EntryProps): string => textOf(props.locale) || 'en'

/** The words for each tone: those given, over the registered ones, over the English. */
const toneLabelsOf = (props: EntryProps): Readonly<Record<string, string>> => {
  const registered = lookupWord(languageOf(props), TAG, 'toneLabels')?.[0]
  const given = props['tone-labels']
  return {
    ...TIMELINE_TONE_LABELS,
    ...(typeof registered === 'object' ? (registered as Record<string, string>) : {}),
    ...(typeof given === 'object' && given !== null ? (given as Record<string, string>) : {}),
  }
}

/** The pending word: the one given, the registered one where it is the English, or the English. */
const pendingLabelOf = (props: EntryProps): string => {
  const given = textOf(props['pending-label'])
  if (given !== '' && given !== TIMELINE_PENDING_LABEL) {
    return given
  }
  const registered = lookupWord(languageOf(props), TAG, 'pendingLabel')?.[0]
  return typeof registered === 'string' ? registered : TIMELINE_PENDING_LABEL
}

/**
 * What an entry's mark says: the tone's word and the pending word, where
 * either applies, joined by a comma.
 */
export const timelineMarkName = (props: EntryProps): string => {
  const tone = textOf(props.tone)
  const toned = tone === '' ? '' : textOf(props['tone-label']) || (toneLabelsOf(props)[tone] ?? '')
  return [toned, props.pending === true ? pendingLabelOf(props) : '']
    .filter((word) => word !== '')
    .join(', ')
}

/** The instant `datetime` names, where `relative` asks for a reading of it. */
const momentOf = (props: EntryProps): Date | undefined => {
  const relative = props.relative
  const source = textOf(props.datetime)
  if (relative === undefined || relative === null || relative === false || source === '') {
    return undefined
  }
  const at = new Date(source)
  return Number.isNaN(at.getTime()) ? undefined : at
}

/** The time of day a derivation is given, `now`, or the timers capability's where none is. */
const nowOf = (props: EntryProps): number => numberOf(props.now) ?? timers().wall()

/** The reading of how long ago the moment was, at `now`, and when it goes stale. */
const readingOf = (props: EntryProps): Relative | undefined => {
  const moment = momentOf(props)
  if (moment === undefined) {
    return undefined
  }
  const style = STYLES.includes(props.relative as Intl.RelativeTimeFormatStyle)
    ? (props.relative as Intl.RelativeTimeFormatStyle)
    : 'long'
  return relativeTime(languageOf(props), { style })(moment, new Date(nowOf(props)))
}

/** `timeline-item-mark-name`: what the mark is said as, and nothing where it says nothing. */
export const timelineItemMarkName: Derivation = (props) => timelineMarkName(props) || undefined

/** `timeline-item-mark-unnamed`: whether the mark says nothing, so it is decoration. */
export const timelineItemMarkIsUnnamed: Derivation = (props) => timelineMarkName(props) === ''

/**
 * `timeline-item-glyph`: the mark drawn where none is passed in: the open
 * circle for an entry with no tone and for one still to come, and the
 * circle with a center for an entry that reports something.
 */
export const timelineItemGlyph: Derivation = (props) =>
  textOf(props.tone) === '' || props.pending === true ? 'circle' : 'record'

/** `timeline-item-reading`: how long ago the moment was, under `relative`, and nothing otherwise. */
export const timelineItemReading: Derivation = (props) => readingOf(props)?.text || undefined

/** `timeline-item-whole`: the whole date and time `datetime` names, under `relative`. */
export const timelineItemWhole: Derivation = (props) => {
  const moment = momentOf(props)
  if (moment === undefined) {
    return undefined
  }
  /* A date alone is midnight UTC to `Date`, so it is written in UTC, or west
     of Greenwich it would be the day before. */
  const dateOnly = DATE_ONLY.test(textOf(props.datetime))
  return new Intl.DateTimeFormat(languageOf(props), {
    dateStyle: 'long',
    ...(dateOnly ? { timeZone: 'UTC' } : { timeStyle: 'short' }),
  }).format(moment)
}

/** `timeline-item-expires`: how long the reading drawn at `now` holds, and nothing with no reading. */
export const timelineItemExpires: Expiry = (props) => readingOf(props)?.next
