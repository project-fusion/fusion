/**
 * What a field of dates or times reads of its props, as core's picker text
 * names it: how it tells, writes, and reads back one value, the segments it is
 * laid out in, and what is wrong with what it holds. A date field and a time
 * field each make one, and the picker field's machine runs either.
 */

import { locale } from '@fusion.dev/helix-core/capabilities/locale'
import { clockLocale, writeClock } from '@fusion.dev/helix-core/clock'
import {
  committedDates,
  committedTimes,
  type DateStyle,
  dateFault,
  dateKind,
  dateSegmentLocale,
  dateSegmentSystem,
  EXAMPLE_DATE,
  exampleTime,
  type HourCycle,
  type MonthSystem,
  type PickerKind,
  type PickerMode,
  type SegmentedKind,
  type SegmentOptions,
  type SegmentSlot,
  segmentLayout,
  type TimeStyle,
  timeFieldFault,
  timeKind,
  writtenDate,
} from '@fusion.dev/helix-core/picker-text'
import { formatMessage } from '@fusion.dev/helix-core/words'
import type { Family } from '../style/form'
import { numberIn, wordsIn } from './date-picker-read'

/** What is wrong with a field's values: nothing, a message alone, or a flag and its message. */
export type FieldFault = string | readonly [string, string]

/** What a picker field holds and how it reads it. */
export interface FieldKind {
  /**
   * Whether a pick of one value in the panel closes it: a date's does, and a
   * time's does in a list, while on the wheels each turn is a third of a time.
   */
  readonly closesOnPick: boolean
  /** What its committed text names, written, before each is read back. */
  readonly committed: (value: string) => string[]
  /** What is wrong with the values, the empty string where nothing is. */
  readonly fault: (value: string) => FieldFault
  /** Whether a value written whole shows as it is, `iso`. */
  readonly iso: boolean
  /** The language its words are written in. */
  readonly lang: string
  /** The segments in the locale's order, with what it writes between them. */
  readonly layout: readonly SegmentSlot[]
  /** The locale the segments are laid out and named in. */
  readonly locale: string
  readonly mode: PickerMode
  /** `date` or `time`. */
  readonly segmented: SegmentedKind
  /** Whether several are kept in order, as times are. */
  readonly sorts: boolean
  readonly system?: MonthSystem | undefined
  readonly text: PickerKind
}

/** A prop's words, its own or as the form defaults it. */
export type Read = (name: string) => unknown

/** The mode a prop names: `range`, `multiple`, or one value. */
export const modeOf = (read: Read): PickerMode => {
  const mode = wordsIn(read('mode'))
  return mode === 'range' || mode === 'multiple' ? mode : 'single'
}

/** The words a message writes, filled in, in the field's language. */
export const sayIn =
  (read: Read, lang: string) =>
  (name: string, values: Readonly<Record<string, string | number>> = {}): string =>
    formatMessage(wordsIn(read(name)), values, lang)

/** The language the field's words are written in: `locale`, or the reader's. */
export const langOf = (read: Read): string => wordsIn(read('locale')) || locale().read()

/** A date field, as Date Input's props say. */
export const dateFieldKind = (read: Read): FieldKind => {
  const lang = langOf(read)
  const calendar = wordsIn(read('calendar')) || undefined
  const style = (wordsIn(read('date-style')) || 'long') as DateStyle
  const mode = modeOf(read)
  const written = (one: string) => writtenDate(one, style, lang, calendar)
  const say = sayIn(read, lang)
  const options: SegmentOptions = {}
  const segmentLocale = dateSegmentLocale(lang, calendar)
  const rules = {
    disableDates: wordsIn(read('disable-dates')),
    disableDays: wordsIn(read('disable-days')),
    isDateUnavailable: read('is-date-unavailable') as ((date: string) => boolean) | undefined,
    max: wordsIn(read('max')),
    min: wordsIn(read('min')),
    step: numberIn(read('step')) ?? 1,
  }
  return {
    closesOnPick: true,
    committed: (value) => committedDates(mode, value),
    fault: (value) =>
      dateFault(mode, value, rules, {
        bad: () =>
          wordsIn(read('bad-input-message')) ||
          say('unreadable-message', { example: written(EXAMPLE_DATE), mode }),
        length: say('range-length-message'),
        order: (start) => say('range-order-message', { start: written(start) }),
        over: (max) => say('range-overflow-message', { max: written(max) }),
        step: say('step-mismatch-message'),
        unavailable: say('unavailable-message'),
        under: (min) => say('range-underflow-message', { min: written(min) }),
      }),
    iso: style === 'iso',
    lang,
    layout: segmentLayout('date', segmentLocale, options),
    locale: segmentLocale,
    mode,
    segmented: 'date',
    sorts: false,
    system: dateSegmentSystem(calendar),
    text: dateKind(style, lang, calendar),
  }
}

/** A time field, as Time Input's props say. */
export const timeFieldKind = (read: Read): FieldKind => {
  const lang = langOf(read)
  const hourCycle = (wordsIn(read('hour-cycle')) || undefined) as HourCycle | undefined
  const seconds = read('seconds') === true
  const style = (wordsIn(read('time-style')) || 'local') as TimeStyle
  const mode = modeOf(read)
  const text = timeKind(style, lang, hourCycle, seconds)
  const say = sayIn(read, lang)
  const clock = clockLocale(lang, hourCycle)
  const max = wordsIn(read('max'))
  const min = wordsIn(read('min'))
  const rules = { disableTimes: wordsIn(read('disable-times')), max, min }
  return {
    closesOnPick: wordsIn(read('picker')) !== 'wheels',
    committed: committedTimes,
    fault: (value) =>
      timeFieldFault(mode, value, rules, seconds, {
        bad: () =>
          wordsIn(read('bad-input-message')) ||
          say('unreadable-message', {
            example: text.written(exampleTime(seconds)),
            mode,
            shape: seconds ? 'HH:mm:ss' : 'HH:mm',
          }),
        length: say('range-length-message'),
        over: () => say('range-overflow-message', { max: writeClock(max, clock, seconds) }),
        unavailable: say('unavailable-message'),
        under: () => say('range-underflow-message', { min: writeClock(min, clock, seconds) }),
      }),
    iso: style === 'iso',
    lang,
    layout: segmentLayout('time', lang, { hourCycle, seconds }),
    locale: lang,
    mode,
    segmented: 'time',
    sorts: true,
    text,
  }
}

/**
 * The kind of field a family is, by the words its tag ends with: a field of
 * times where it names one, and of dates otherwise.
 */
export const fieldKindFor = (family: Family): ((read: Read) => FieldKind) =>
  family.tag.endsWith('time-input') ? timeFieldKind : dateFieldKind
