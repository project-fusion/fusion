/**
 * The clock Time Picker and Time Input share: reading and writing a time of
 * day to the second, the times on offer, and which clock a locale writes on.
 *
 * In seconds since midnight, because a time held to the second is a time held
 * to the minute as well, and one unit means one set of arithmetic for the list,
 * the wheels and the field's own validation.
 */

/** The two clocks a time is written on: twelve hours, or twenty-four. */
export type HourCycle = 'h12' | 'h23'

/** The seconds in a day, and the last second of one. */
const DAY = 86_400

/** `HH:mm`, or `HH:mm:ss`, on a twenty-four hour clock. */
const CLOCK = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/

/**
 * The seconds since midnight a value names, or `null` where it is not a time.
 *
 * Both shapes are read whatever a control writes, so a value with seconds
 * handed to a field without them is a time it can judge, off its step, rather
 * than text it cannot read.
 */
export const valueAsSeconds = (value: string): number | null => {
  const parts = CLOCK.exec(value.trim())
  if (!parts) {
    return null
  }
  return Number(parts[1]) * 3600 + Number(parts[2]) * 60 + Number(parts[3] ?? 0)
}

/**
 * Whether a value is a time a control holds: `HH:mm`, or either shape where it
 * holds `seconds`.
 */
export const isClockValue = (value: string, seconds = false): boolean =>
  valueAsSeconds(value) !== null && (seconds || value.trim().length === 5)

/**
 * Seconds since midnight as `HH:mm`, or `HH:mm:ss` with `seconds`, wrapping
 * rather than running off the day.
 */
export const secondsAsValue = (at: number, seconds = false): string => {
  const whole = ((Math.round(at) % DAY) + DAY) % DAY
  const pad = (part: number): string => String(part).padStart(2, '0')
  const clock = `${pad(Math.floor(whole / 3600))}:${pad(Math.floor(whole / 60) % 60)}`
  return seconds ? `${clock}:${pad(whole % 60)}` : clock
}

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
 * A time written the way the locale writes one, with its seconds where asked.
 *
 * `timeStyle` rather than the parts assembled by hand, for the reason core's
 * `writeTime` gives: `short` and `medium` are each locale's own answer, padded
 * and ordered as it pads and orders them. A value that is not a time is handed
 * back unchanged, so a field showing what is being typed shows the letters.
 */
export const writeClock = (value: string, locale: string, seconds = false): string => {
  const at = valueAsSeconds(value)
  if (at === null) {
    return value
  }
  return new Intl.DateTimeFormat(locale || undefined, {
    timeStyle: seconds ? 'medium' : 'short',
    timeZone: 'UTC',
  }).format(new Date(at * 1000))
}

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
