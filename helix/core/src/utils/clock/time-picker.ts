/**
 * A list of times and a set of wheels with no element in them: what a choice
 * leaves, which times a range is drawn between, what each wheel offers, what a
 * turn of one leaves, and what is wrong with the times held. Time Picker reads
 * these on the web and on a phone.
 */

import { secondsAsValue, valueAsSeconds } from '../value-as/value-as.js'
import { commaList } from '../written-list/written-list.js'
import {
  nearestTime,
  type TimeFault,
  timeBarred,
  timeFault,
  wheelParts,
  wholeHour,
} from './clock.js'

/** One, a range of two, or several. */
export type TimeMode = 'multiple' | 'range' | undefined

/** A wheel of a set: the hour, the minute, the second, or the half of the day. */
export type WheelPart = 'hour' | 'meridiem' | 'minute' | 'second'

/**
 * The value a choice the list announces leaves, or `undefined` where a barred
 * time refuses it. A range keeps its two ends in order, and a third time starts
 * the range again from it.
 */
export const timeChoice = (
  announced: string,
  held: readonly string[],
  mode: TimeMode,
  barred: (at: string) => boolean,
): string | undefined => {
  if (announced.split(',').some((one) => barred(one.trim()))) {
    return undefined
  }
  if (mode !== 'range') {
    return announced
  }
  const next = commaList(announced)
  if (next.length <= 2) {
    return next.sort().join(',')
  }
  const before = new Set(held)
  return next.find((one) => !before.has(one)) ?? ''
}

/** Whether a time is drawn between a range's ends, or between its start and the one previewed. */
export const timeBetween = (
  at: string,
  held: readonly string[],
  previewed: string,
  mode: TimeMode,
): boolean => {
  if (mode !== 'range') {
    return false
  }
  const [from, to = previewed] = held
  if (from === undefined || to === '' || held.length > 2) {
    return false
  }
  const [low = from, high = to] = [from, to].sort()
  return at > low && at < high
}

/** What the wheels show, from the value or from `min`. */
export const wheelsAt = (value: string, min: string, twelve: boolean) =>
  wheelParts(valueAsSeconds(value) ?? valueAsSeconds(min) ?? 0, twelve)

/** Every whole hour with an offered time, read 1 to 12 once each on a twelve hour clock. */
export const wheelHours = (times: readonly number[], twelve: boolean): number[] => {
  const whole = [...new Set(times.map((at) => Math.floor(at / 3600)))]
  return twelve
    ? [...new Set(whole.map((one) => (one % 12 === 0 ? 12 : one % 12)))].sort((a, b) => a - b)
    : whole
}

/** Every minute offered within an hour. */
export const wheelMinutes = (times: readonly number[], hour: number): number[] => [
  ...new Set(
    times.filter((at) => Math.floor(at / 3600) === hour).map((at) => Math.floor(at / 60) % 60),
  ),
]

/** Every second offered within a minute. */
export const wheelSeconds = (times: readonly number[], hour: number, minute: number): number[] =>
  times.filter((at) => Math.floor(at / 60) === hour * 60 + minute).map((at) => at % 60)

/** Whether every offered time in a shown hour is barred. */
export const hourBarred = (
  times: readonly number[],
  shown: number,
  disableTimes: string,
  half?: 'AM' | 'PM',
): boolean => {
  const whole = wholeHour(shown, half)
  const within = times.filter((at) => Math.floor(at / 3600) === whole)
  return within.length > 0 && within.every((at) => timeBarred(at, disableTimes))
}

/** Whether every offered time in a half of the day is barred. */
export const halfBarred = (
  times: readonly number[],
  half: 'AM' | 'PM',
  disableTimes: string,
): boolean => {
  const within = times.filter((at) => (half === 'PM') === at >= 43_200)
  return within.length > 0 && within.every((at) => timeBarred(at, disableTimes))
}

/**
 * The value a turn of one wheel leaves: the nearest offered time to what the
 * wheels then read, or `undefined` where that time is barred. On a twelve hour
 * clock the hour and the half recombine, 12 AM being midnight and 12 PM noon.
 */
export const wheelTurn = (
  part: WheelPart,
  to: string,
  state: {
    readonly disableTimes: string
    readonly min: string
    readonly seconds: boolean
    readonly times: readonly number[]
    readonly twelve: boolean
    readonly value: string
  },
): string | undefined => {
  const { hour, meridiem, minute, second } = wheelsAt(state.value, state.min, state.twelve)
  let [h, m, sec] = [hour, minute, second]
  if (part === 'minute') {
    m = Number(to)
  } else if (part === 'second') {
    sec = Number(to)
  } else if (part === 'hour') {
    h = wholeHour(Number(to), state.twelve ? meridiem : undefined)
  } else {
    h = (hour % 12) + (to === 'PM' ? 12 : 0)
  }
  const nearest = nearestTime(state.times, h * 3600 + m * 60 + sec)
  return timeBarred(nearest, state.disableTimes)
    ? undefined
    : secondsAsValue(nearest, state.seconds)
}

/** What a time picker's messages say, each a sentence its prop holds. */
export interface TimeProblemWords {
  readonly bad: () => string
  readonly missing: string
  readonly over: () => string
  readonly step: string
  readonly under: () => string
  readonly unavailable: string
}

/** The flag a native time input sets for each fault, a barred time being `badInput`. */
const FLAGS: Readonly<
  Record<TimeFault, 'badInput' | 'rangeOverflow' | 'rangeUnderflow' | 'stepMismatch'>
> = {
  rangeOverflow: 'rangeOverflow',
  rangeUnderflow: 'rangeUnderflow',
  stepMismatch: 'stepMismatch',
  unavailable: 'badInput',
}

/**
 * What is wrong with the times a picker holds, as a native time input says it:
 * a flag and its message, or `undefined` where nothing is. A time the picker
 * cannot read is bad input.
 */
export const timeProblem = (
  state: {
    readonly disableTimes: string
    readonly max: string
    readonly min: string
    readonly required: boolean
    readonly times: readonly number[]
    readonly value: string
  },
  words: TimeProblemWords,
): readonly [string, string] | undefined => {
  if (state.required && state.value === '') {
    return ['valueMissing', words.missing]
  }
  const held = commaList(state.value)
  if (held.some((one) => valueAsSeconds(one) === null)) {
    return ['badInput', words.bad()]
  }
  const rules = {
    disableTimes: state.disableTimes,
    max: state.max,
    min: state.min,
    offered: state.times,
  }
  for (const one of held) {
    const fault = timeFault(one, rules)
    if (fault !== null) {
      const said = {
        rangeOverflow: words.over,
        rangeUnderflow: words.under,
        stepMismatch: () => words.step,
        unavailable: () => words.unavailable,
      }[fault]
      return [FLAGS[fault], said()]
    }
  }
  return undefined
}
