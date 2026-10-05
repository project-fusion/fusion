import { valueAsSeconds } from '../value-as/value-as.js'
import { writtenList } from '../written-list/written-list.js'

/*
 * The clock Time Picker and Time Input share: the times on offer, which clock a
 * locale writes on, the parts a wheel shows, and what is wrong with a time.
 * Reading and writing one to the second is `valueAsSeconds`, `secondsAsValue`
 * and `writeClock`, beside the minute readings they extend.
 *
 * In seconds since midnight, because a time held to the second is a time held
 * to the minute as well, and one unit means one set of arithmetic for the list,
 * the wheels and the field's own validation.
 */

/** The two clocks a time is written on: twelve hours, or twenty-four. */
export type HourCycle = 'h12' | 'h23'

/** The seconds in a day. */
const DAY = 86_400

/**
 * The locale with its clock set, or the locale as given where no clock is.
 *
 * Through the locale's own `-u-hc-` extension, which every `Intl` formatter
 * reads, so a time written, a meridiem named and the question of whether the
 * locale writes twelve hours all answer to the one tag. Empty stays empty
 * without a clock, which is the runtime's own locale.
 */
export const clockLocale = (locale: string, hourCycle?: HourCycle): string => {
  if (!hourCycle) {
    return locale
  }
  try {
    const base = new Intl.DateTimeFormat(locale || undefined).resolvedOptions().locale
    return new Intl.Locale(base, { hourCycle }).toString()
  } catch {
    return locale
  }
}

/**
 * Whether a locale writes times on a twelve hour clock.
 *
 * Asked of `Intl` rather than derived from a list of locales, because it is
 * exactly the question `resolvedOptions` answers and the list is long and
 * changes. `en-US` is true, `en-GB`, `fr-FR` and `ja-JP` are false, measured.
 */
export const isTwelveHour = (locale?: string): boolean =>
  new Intl.DateTimeFormat(locale || undefined, { timeStyle: 'short' }).resolvedOptions().hour12 ===
  true

/**
 * What a locale calls the half of the day before or after noon, such as `AM`,
 * `PM`, `오전` or `오후`.
 *
 * Read off `Intl`'s own rendering of a time in that half, which is the one
 * place every engine states it.
 */
export const dayPeriod = (half: 'AM' | 'PM', locale?: string): string =>
  new Intl.DateTimeFormat(locale || undefined, { hour: 'numeric', hour12: true, timeZone: 'UTC' })
    .formatToParts(new Date(Date.UTC(1970, 0, 1, half === 'AM' ? 9 : 21)))
    .find((part) => part.type === 'dayPeriod')?.value ?? half

/**
 * Every time on offer, as seconds since midnight, from `min` to `max` by
 * `step`.
 *
 * `step` is in minutes, or in seconds with `seconds`, the unit
 * `<input type="time">` counts in. Built from `min` upward, so a list that
 * starts at `09:00` steps from nine rather than from midnight.
 */
export const offeredTimes = (min: string, max: string, step: number, seconds = false): number[] => {
  const from = valueAsSeconds(min) ?? 0
  const to = valueAsSeconds(max) ?? (seconds ? DAY - 1 : DAY - 60)
  const every = Math.max(1, Math.round(step)) * (seconds ? 1 : 60)
  const found: number[] = []
  for (let at = from; at <= to; at += every) {
    found.push(at)
  }
  return found
}

/**
 * The time on offer nearest to one, the earlier winning a tie, or the time
 * itself where nothing is on offer.
 */
export const nearestTime = (times: readonly number[], at: number): number => {
  let best = times[0] ?? at
  for (const one of times) {
    if (Math.abs(one - at) < Math.abs(best - at)) {
      best = one
    }
  }
  return best
}

/**
 * The parts a wheel shows for a time: the hour as the clock writes it, the
 * minute, the second, and which half of the day.
 */
export const wheelParts = (
  at: number,
  twelve: boolean,
): { hour: number; meridiem: 'AM' | 'PM'; minute: number; second: number; shown: number } => {
  const hour = Math.floor(at / 3600)
  return {
    hour,
    meridiem: hour < 12 ? 'AM' : 'PM',
    minute: Math.floor(at / 60) % 60,
    second: at % 60,
    shown: twelve ? (hour % 12 === 0 ? 12 : hour % 12) : hour,
  }
}

/**
 * The hour of the day a wheel's hour means: on a twelve hour clock the wheel
 * says 1 to 12 and the meridiem says which half, and 12 AM is midnight.
 */
export const wholeHour = (shown: number, half?: 'AM' | 'PM'): number =>
  half === undefined ? shown : (shown % 12) + (half === 'PM' ? 12 : 0)

/** What a time is checked against: its bounds, the times barred by name, and the times on offer. */
export interface TimeRules {
  /** Times barred by name, separated by commas or spaces. */
  disableTimes: string
  /** The latest time, or empty for the end of the day. */
  max: string
  /** The earliest time, or empty for midnight. */
  min: string
  /**
   * The times on offer, as seconds since midnight, where a time off them is a
   * fault. Left out, the step is not checked.
   */
  offered?: readonly number[] | undefined
}

/** What is wrong with a time, as the validity flag a control reports, or `unavailable` for a barred one. */
export type TimeFault = 'rangeOverflow' | 'rangeUnderflow' | 'stepMismatch' | 'unavailable'

/**
 * Whether a time, as seconds since midnight, is one `disable-times` names,
 * matching `09:30` and `09:30:00` alike.
 */
export const timeBarred = (at: number, disableTimes: string): boolean =>
  writtenList(disableTimes).some((one) => valueAsSeconds(one) === at)

/**
 * What is wrong with a time a control can read, or `null`: before `min`, past
 * `max`, barred by name, or off the times on offer, asked in that order.
 *
 * Time Picker reports the first fault of each time it holds, and Time Input
 * the first fault any of its times has, so each asks this of every time and
 * keeps the order its own message has always taken.
 */
export const timeFault = (value: string, rules: TimeRules): TimeFault | null => {
  const read = valueAsSeconds(value)
  const at = read ?? 0
  if (at < (valueAsSeconds(rules.min) ?? 0)) {
    return 'rangeUnderflow'
  }
  if (at > (valueAsSeconds(rules.max) ?? DAY - 1)) {
    return 'rangeOverflow'
  }
  if (read !== null && timeBarred(at, rules.disableTimes)) {
    return 'unavailable'
  }
  if (rules.offered && !rules.offered.includes(at)) {
    return 'stepMismatch'
  }
  return null
}
