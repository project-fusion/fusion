/**
 * What a Format Date was asked for, in its own spelling: the `Intl` options a
 * consumer set. The element itself is one, so it passes itself.
 */
export interface Asked {
  dateStyle?: 'full' | 'long' | 'medium' | 'short' | undefined
  day?: 'numeric' | '2-digit' | undefined
  era?: 'long' | 'narrow' | 'short' | undefined
  hour?: 'numeric' | '2-digit' | undefined
  hourCycle?: 'h11' | 'h12' | 'h23' | 'h24' | undefined
  minute?: 'numeric' | '2-digit' | undefined
  month?: 'numeric' | '2-digit' | 'long' | 'short' | 'narrow' | undefined
  second?: 'numeric' | '2-digit' | undefined
  timeStyle?: 'full' | 'long' | 'medium' | 'short' | undefined
  timeZone?: string | undefined
  timeZoneName?: 'long' | 'short' | undefined
  weekday?: 'long' | 'short' | 'narrow' | undefined
  year?: 'numeric' | '2-digit' | undefined
}

/** The fields a style stands in for, which `Intl` refuses beside one. */
const FIELDS = [
  'day',
  'era',
  'hour',
  'minute',
  'month',
  'second',
  'timeZoneName',
  'weekday',
  'year',
] as const

/**
 * The `Intl.DateTimeFormat` options for what was asked, and none that was not.
 *
 * **A style wins over the fields.** `dateStyle` and `timeStyle` are each
 * locale's own whole pattern, and `Intl` throws a `TypeError` when one is
 * given beside `month` or `hour`, so the fields are left out wherever a style
 * is set. `hourCycle` and `timeZone` go with either.
 *
 * **A day with no time, `dateOnly`, is read in UTC** unless a zone is given. Parsed, it is
 * midnight UTC, and read in a zone west of it that is the day before: measured
 * before this, `2026-08-04` read "August 3, 2026" in Los Angeles.
 */
export const formatOptions = (asked: Asked, dateOnly = false): Intl.DateTimeFormatOptions => {
  const options: Intl.DateTimeFormatOptions = {}
  const styled = asked.dateStyle !== undefined || asked.timeStyle !== undefined
  if (styled) {
    if (asked.dateStyle) {
      options.dateStyle = asked.dateStyle
    }
    if (asked.timeStyle) {
      options.timeStyle = asked.timeStyle
    }
  } else {
    for (const field of FIELDS) {
      const value = asked[field]
      if (value) {
        ;(options as Record<string, string>)[field] = value
      }
    }
  }
  if (asked.hourCycle) {
    options.hourCycle = asked.hourCycle
  }
  if (asked.timeZone) {
    options.timeZone = asked.timeZone
  } else if (dateOnly) {
    options.timeZone = 'UTC'
  }
  return options
}
