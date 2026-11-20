/**
 * The formatters a calendar writes its headings, days, and names with, built
 * once per locale, since one costs about a quarter of a millisecond and a
 * two-month calendar would otherwise build six on each move of the stop.
 */

/** Each way a calendar writes a date, in UTC, as every date there is. */
export interface CalendarFormats {
  /** A day's whole name, which a cell is named by. */
  full: Intl.DateTimeFormat
  /** A month and its year, a month's heading. */
  heading: Intl.DateTimeFormat
  /** A date in a message or in the words for the chosen dates. */
  long: Intl.DateTimeFormat
  /** A month's short name, in the months view. */
  monthName: Intl.DateTimeFormat
  /** A month's short name with its year, a month's name in the months view. */
  monthYear: Intl.DateTimeFormat
  /** A weekday's short name, or its narrow one where short names are long, a column's heading. */
  weekday: Intl.DateTimeFormat
  /** A weekday's whole name, which a column's heading is named by. */
  weekdayName: Intl.DateTimeFormat
  /** A year, in the years view. */
  year: Intl.DateTimeFormat
}

const built = new Map<string, CalendarFormats>()

/**
 * The format of the names over the day columns: the short name, or the narrow
 * one in a language whose short names are longer than four characters.
 *
 * A column is a day wide, and the short name is the one a reader expects
 * where it fits. In Arabic, Persian, Hebrew, Thai, Polish, and Vietnamese it
 * does not: "أربعاء" and "niedz." ran past their 40 pixel columns into the
 * next. The narrow names fit any column, and each header still says the long
 * name to a reader.
 */
const columnHeads = (
  utc: (options: Intl.DateTimeFormatOptions) => Intl.DateTimeFormat,
): Intl.DateTimeFormat => {
  const short = utc({ weekday: 'short' })
  const long = Array.from({ length: 7 }, (_, day) => short.format(Date.UTC(2026, 0, 4 + day))).some(
    (name) => [...name].length > 4,
  )
  return long ? utc({ weekday: 'narrow' }) : short
}

/**
 * The formatters for a locale that carries its calendar, as `calendarLocale`
 * writes it, or the runtime's own where it is empty.
 */
export const calendarFormats = (language: string): CalendarFormats => {
  const held = built.get(language)
  if (held) {
    return held
  }
  const utc = (options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat =>
    new Intl.DateTimeFormat(language || undefined, { ...options, timeZone: 'UTC' })
  const formats = {
    full: utc({ dateStyle: 'full' }),
    heading: utc({ month: 'long', year: 'numeric' }),
    long: utc({ dateStyle: 'long' }),
    monthName: utc({ month: 'short' }),
    monthYear: utc({ month: 'short', year: 'numeric' }),
    weekday: columnHeads(utc),
    weekdayName: utc({ weekday: 'long' }),
    year: utc({ year: 'numeric' }),
  }
  built.set(language, formats)
  return formats
}
