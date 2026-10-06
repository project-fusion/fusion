import { FIELD } from './fields.js'

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

/**
 * The fields a style stands in for, which `Intl` refuses beside one: every
 * field a date is drawn in, as `fields.ts` names them. `dayPeriod` is among
 * them and is never an option, so it is never copied.
 */
const FIELDS = Object.keys(FIELD) as (keyof Asked)[]

/**
 * The `Intl.DateTimeFormat` options for what was asked, and none that was not:
 * an option not asked for is `undefined`, which `Intl` reads as absent.
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
  /* An option left `undefined` is one `Intl` reads as absent, so each is
     copied as it stands, set or not. */
  const options: Record<string, string | undefined> = {
    hourCycle: asked.hourCycle,
    timeZone: asked.timeZone || (dateOnly ? 'UTC' : undefined),
  }
  const styled = asked.dateStyle || asked.timeStyle
  for (const field of styled ? (['dateStyle', 'timeStyle'] as const) : FIELDS) {
    options[field] = asked[field]
  }
  return options
}
