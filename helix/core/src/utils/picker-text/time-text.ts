/**
 * A time field's text with no element in it: how one time is written and read
 * back, and what is wrong with the times it holds. Time Input reads these on the
 * web and on a phone.
 */

import { clockLocale, type HourCycle, type TimeRules, timeFault } from '../clock/clock.js'
import { readWrittenTime } from '../date-segments/date-segments.js'
import { isClockValue } from '../value-as/value-as.js'
import { writeClock } from '../write-time/write-time.js'
import { heldValues, type PickerKind, type PickerMode } from './picker-text.js'

/** The time the unreadable message shows as an example: to the minute, or to the second. */
export const exampleTime = (seconds: boolean): string => (seconds ? '14:30:15' : '14:30')

/** How a time is written: the reader's own convention, or `iso`, the value itself. */
export type TimeStyle = 'iso' | 'local'

/** One time, written the way `style` asks for, on the clock `hourCycle` names. */
export const writtenTime = (
  at: string,
  style: TimeStyle,
  language: string,
  hourCycle: HourCycle | undefined,
  seconds: boolean,
): string =>
  style === 'iso' || !isClockValue(at, seconds)
    ? at
    : writeClock(at, clockLocale(language, hourCycle), seconds)

/** How a time field tells, writes, and reads back one time. */
export const timeKind = (
  style: TimeStyle,
  language: string,
  hourCycle: HourCycle | undefined,
  seconds: boolean,
): PickerKind => ({
  read: (text) => (isClockValue(text, seconds) ? text : readWrittenTime(text, language, seconds)),
  whole: (one) => isClockValue(one, seconds),
  written: (one) => writtenTime(one, style, language, hourCycle, seconds),
})

/**
 * The times a committed text names, written. A time carries a colon and no
 * hyphen, so a dash between two times always means "to".
 */
export const committedTimes = (value: string): string[] => heldValues(value)

/** What a time field's messages say, each a sentence its prop holds. */
export interface TimeFaultWords {
  readonly bad: () => string
  readonly length: string
  readonly over: () => string
  readonly under: () => string
  readonly unavailable: string
}

/**
 * What is wrong with the times a field holds: the empty string where nothing
 * is, a message alone for a fault with no flag of its own, or a flag a native
 * time input sets and its message. **Each fault across every time**, in the
 * order the messages take, so a range with one end early and the other late
 * says it is early. A time barred by name is `badInput`, there being no native
 * flag for one.
 */
export const timeFieldFault = (
  mode: PickerMode,
  value: string,
  rules: TimeRules,
  seconds: boolean,
  words: TimeFaultWords,
): string | readonly ['rangeOverflow' | 'rangeUnderflow', string] => {
  const held = heldValues(value)
  if (held.length > 0 && !held.every((one) => isClockValue(one, seconds))) {
    return words.bad()
  }
  const faults = held.map((one) => timeFault(one, rules))
  if (faults.includes('rangeUnderflow')) {
    return ['rangeUnderflow', words.under()]
  }
  if (faults.includes('rangeOverflow')) {
    return ['rangeOverflow', words.over()]
  }
  if (faults.includes('unavailable')) {
    return words.unavailable
  }
  if (mode === 'range' && held.length > 2) {
    return words.length
  }
  return ''
}
