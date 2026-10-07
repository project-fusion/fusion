import type { MonthSystem } from '../calendar/calendar.js'
import { valueAsDate as asDate, dateAsValue as fromDate } from '../value-as/value-as.js'

/*
 * A date or a time as segments, the way React Aria's DateField and TimeField
 * and Web Awesome's time input take one: a year, a month and a day, or an
 * hour, a minute, a second and a half of the day, each set on its own.
 *
 * Pure arithmetic, so the order a locale writes the parts in, what a key does
 * to one, and the value they add up to are answered here once for Date Input
 * and Time Input, and `MixinSegmentedField` only draws and listens.
 */

/** One part of a date or a time a reader sets on its own. */
export type SegmentKind = 'day' | 'dayPeriod' | 'hour' | 'minute' | 'month' | 'second' | 'year'

/** What a segmented field holds: a date, or a time of day. */
export type SegmentedKind = 'date' | 'time'

/**
 * The parts set so far, each a number: the month 1 to 12, or to 13 in a
 * calendar whose year can have 13, the hour 0 to 23
 * whatever clock it is shown on, and the half of the day 0 for before noon and
 * 1 for after. A part not yet set is absent.
 */
export type Segments = Partial<Record<SegmentKind, number>>

/** One place in the field: a segment, or the text a locale writes between two. */
export type SegmentSlot = { kind: SegmentKind } | { literal: string }

/** How the field is laid out and which clock its hour is on. */
export interface SegmentOptions {
  /** `h12` or `h23`, or absent for the locale's own. */
  hourCycle?: 'h12' | 'h23' | undefined
  /** Whether a time carries its seconds. */
  seconds?: boolean | undefined
}

const SAMPLE = new Date(Date.UTC(2006, 10, 22, 15, 4, 5))

/**
 * The segments in the order the locale writes them, with what it writes
 * between them, read off `Intl`'s own rendering of a sample.
 *
 * `en-US` is month, day, year with slashes; `de-DE` day, month, year with
 * dots; `ja-JP` year, month, day; the `iso8601` calendar year, month, day
 * with hyphens. A time follows the clock: a twelve hour
 * locale ends with the half of the day.
 */
export const segmentLayout = (
  kind: SegmentedKind,
  locale: string,
  options: SegmentOptions = {},
): SegmentSlot[] => {
  const format =
    kind === 'date'
      ? new Intl.DateTimeFormat(locale || undefined, {
          day: '2-digit',
          month: '2-digit',
          timeZone: 'UTC',
          year: 'numeric',
        })
      : new Intl.DateTimeFormat(locale || undefined, {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'UTC',
          ...(options.seconds ? { second: '2-digit' } : {}),
          ...(options.hourCycle ? { hourCycle: options.hourCycle } : {}),
        })
  /* The ISO 8601 calendar is year, month and day with hyphens in every
     locale. ICU writes it so from CLDR 42; an older ICU, such as the one Bun
     and Node use on Linux, writes the locale's own order, so it is set here. */
  if (
    kind === 'date' &&
    (/-ca-iso8601/i.test(locale) || format.resolvedOptions().calendar === 'iso8601')
  ) {
    return [
      { kind: 'year' },
      { literal: '-' },
      { kind: 'month' },
      { literal: '-' },
      { kind: 'day' },
    ]
  }
  const known = new Set<string>(['day', 'dayPeriod', 'hour', 'minute', 'month', 'second', 'year'])
  const slots: SegmentSlot[] = []
  for (const part of format.formatToParts(SAMPLE)) {
    if (known.has(part.type)) {
      slots.push({ kind: part.type as SegmentKind })
    } else if (part.type === 'literal' && slots.length > 0) {
      slots.push({ literal: part.value })
    }
  }
  /* A literal after the last segment is the locale's trailing text, such as a
     space before nothing; it draws an empty gap at the end of the field. */
  while (slots.length > 0 && 'literal' in (slots.at(-1) as SegmentSlot)) {
    slots.pop()
  }
  return slots
}

/** Whether a layout writes the hour on a twelve hour clock. */
export const isTwelveHourLayout = (layout: readonly SegmentSlot[]): boolean =>
  layout.some((slot) => 'kind' in slot && slot.kind === 'dayPeriod')

/** This year in a calendar: its own count, or the Gregorian year where none is given. */
const yearNow = (system?: MonthSystem): number =>
  system ? system.parts(new Date()).year : new Date().getFullYear()

/**
 * The years a segment with no year set is measured against: this one and the
 * two after it, which in the Hebrew calendar always hold a leap year.
 */
const yearsAround = (system: MonthSystem): number[] => {
  const now = yearNow(system)
  return [now, now + 1, now + 2]
}

/** How many months a year has, or the most a year has where the year is not known. */
const monthsIn = (year?: number, system?: MonthSystem): number => {
  if (!system) {
    return 12
  }
  return year === undefined
    ? Math.max(...yearsAround(system).map((one) => system.months(one)))
    : system.months(year)
}

/**
 * How many days a month has, in a year, or the most it has where either is
 * not known: thirty-one in the Gregorian calendar, which lets February 29
 * stand until a year says otherwise.
 */
const daysIn = (month?: number, year?: number, system?: MonthSystem): number => {
  if (!system) {
    return month === undefined ? 31 : new Date(Date.UTC(year ?? 2000, month, 0)).getUTCDate()
  }
  if (month === undefined) {
    return 31
  }
  const years = year === undefined ? yearsAround(system) : [year]
  return Math.max(
    ...years.filter((one) => month <= system.months(one)).map((one) => system.days(one, month)),
    1,
  )
}

/**
 * The lowest and highest a segment can be, as it is shown: the hour on a twelve
 * hour clock is 1 to 12, and a day goes as high as its month allows.
 */
export const segmentRange = (
  kind: SegmentKind,
  segments: Segments,
  twelve: boolean,
  system?: MonthSystem,
): { max: number; min: number } => {
  switch (kind) {
    case 'year':
      return { max: 9999, min: 1 }
    case 'month':
      return { max: monthsIn(segments.year, system), min: 1 }
    case 'day':
      return { max: daysIn(segments.month, segments.year, system), min: 1 }
    case 'hour':
      return twelve ? { max: 12, min: 1 } : { max: 23, min: 0 }
    case 'minute':
    case 'second':
      return { max: 59, min: 0 }
    case 'dayPeriod':
      return { max: 1, min: 0 }
  }
}

/** A segment's number as it is shown: the hour on the clock the field is on. */
export const shownValue = (
  kind: SegmentKind,
  segments: Segments,
  twelve: boolean,
): number | undefined => {
  if (kind === 'dayPeriod') {
    return segments.hour === undefined ? segments.dayPeriod : segments.hour >= 12 ? 1 : 0
  }
  const value = segments[kind]
  if (kind === 'hour' && twelve && value !== undefined) {
    return value % 12 === 0 ? 12 : value % 12
  }
  return value
}

/**
 * Sets a segment from the number shown for it, which on a twelve hour clock
 * is put back together with the half of the day, and keeps the month inside
 * its year and the day inside its month.
 */
export const setSegment = (
  segments: Segments,
  kind: SegmentKind,
  shown: number | undefined,
  twelve: boolean,
  system?: MonthSystem,
): Segments => {
  const next: Segments = { ...segments }
  if (shown === undefined) {
    delete next[kind]
    return next
  }
  if (kind === 'hour' && twelve) {
    const half =
      segments.hour !== undefined ? (segments.hour >= 12 ? 1 : 0) : (segments.dayPeriod ?? 0)
    next.hour = (shown % 12) + half * 12
  } else if (kind === 'dayPeriod') {
    next.dayPeriod = shown
    if (next.hour !== undefined) {
      next.hour = (next.hour % 12) + shown * 12
    }
  } else {
    next[kind] = shown
  }
  if (next.month !== undefined) {
    next.month = Math.min(next.month, monthsIn(next.year, system))
  }
  if (next.day !== undefined) {
    next.day = Math.min(next.day, daysIn(next.month, next.year, system))
  }
  return next
}

/**
 * A segment moved by a key's step, wrapping at its ends as a dial does, and
 * starting from where a reader would look for it when it is empty: the lowest
 * going up, the highest going down, and this year for a year.
 */
export const stepSegment = (
  segments: Segments,
  kind: SegmentKind,
  by: number,
  twelve: boolean,
  thisYear?: number,
  system?: MonthSystem,
): Segments => {
  const { max, min } = segmentRange(kind, segments, twelve, system)
  const shown = shownValue(kind, segments, twelve)
  let next: number
  if (shown === undefined) {
    next = kind === 'year' ? (thisYear ?? yearNow(system)) : by > 0 ? min : max
  } else if (kind === 'year') {
    next = Math.min(max, Math.max(min, shown + by))
  } else {
    const span = max - min + 1
    next = ((((shown - min + by) % span) + span) % span) + min
  }
  return setSegment(segments, kind, next, twelve, system)
}

/**
 * A digit typed into a segment, given what was typed into it already.
 *
 * The digits run on while the number they make still fits and could take
 * another, so `1` then `2` in a month is December; a digit that would overflow
 * starts the number over. `advance` says the segment is full, so focus moves
 * on, which is React Aria's typing: `3` in a month is March and moves to the
 * day, `1` waits for a second digit.
 */
export const typeDigit = (
  segments: Segments,
  kind: SegmentKind,
  typed: string,
  digit: string,
  twelve: boolean,
  system?: MonthSystem,
): { advance: boolean; segments: Segments; typed: string } => {
  const { max, min } = segmentRange(kind, segments, twelve, system)
  let text = `${typed}${digit}`
  if (Number(text) > max) {
    text = digit
  }
  const value = Number(text)
  const full = text.length >= String(max).length || value * 10 > max
  const next = value >= min ? setSegment(segments, kind, value, twelve, system) : segments
  return { advance: full && value >= min, segments: next, typed: full ? '' : text }
}

/** Where a segment stands when a key arrives: its kind, the field's parts, and what was typed into it. */
export interface SegmentKeyState {
  /** The segment the key was pressed on. */
  kind: SegmentKind
  /** The locale the meridiem is written in, whose words a letter picks. */
  locale: string
  /** The field's parts. */
  segments: Segments
  /** The calendar a date's parts are counted in, Gregorian where none is given. */
  system?: MonthSystem | undefined
  /** Whether the field is on a twelve hour clock. */
  twelve: boolean
  /** The digits typed into the segment so far. */
  typed: string
}

/** How far Page Up and Page Down step each kind of segment, as React Aria's segments step. */
const pageStep: Partial<Record<SegmentKind, number>> = {
  day: 7,
  hour: 2,
  minute: 15,
  month: 2,
  second: 15,
  year: 5,
}

/**
 * What an editing key does to a segment, or `null` for a key that edits
 * nothing.
 *
 * The arrows step it and wrap, Page Up and Page Down step it by a page, Home
 * and End take it to its lowest and highest, Backspace and Delete empty it, a
 * digit is typed as `typeDigit` types it, and on the meridiem a letter picks
 * the half whose word starts with it. `advance` says the segment is full and
 * focus moves on.
 */
export const segmentKey = (
  key: string,
  { kind, locale, segments, system, twelve, typed }: SegmentKeyState,
): { advance: boolean; segments: Segments; typed: string } | null => {
  const done = (next: Segments | undefined) =>
    next === undefined ? null : { advance: false, segments: next, typed: '' }
  if (key === 'ArrowUp' || key === 'ArrowDown') {
    return done(stepSegment(segments, kind, key === 'ArrowUp' ? 1 : -1, twelve, undefined, system))
  }
  if (key === 'PageUp' || key === 'PageDown') {
    const by = (key === 'PageUp' ? 1 : -1) * (pageStep[kind] ?? 1)
    return done(stepSegment(segments, kind, by, twelve, undefined, system))
  }
  if (key === 'Home' || key === 'End') {
    const { max, min } = segmentRange(kind, segments, twelve, system)
    return done(setSegment(segments, kind, key === 'Home' ? min : max, twelve, system))
  }
  if (key === 'Backspace' || key === 'Delete') {
    return done(setSegment(segments, kind, undefined, twelve, system))
  }
  if (/^\d$/.test(key) && kind !== 'dayPeriod') {
    return typeDigit(segments, kind, typed, key, twelve, system)
  }
  if (kind === 'dayPeriod' && key.length === 1) {
    const letter = key.toLowerCase()
    const words = [0, 1].map((half) =>
      segmentText('dayPeriod', { dayPeriod: half }, true, locale).toLowerCase(),
    )
    const half = words.findIndex((word) => word.startsWith(letter))
    return done(half >= 0 ? setSegment(segments, kind, half, twelve) : undefined)
  }
  return null
}

/**
 * The segments a value names, or none where it names nothing whole: a date's
 * year, month, and day as `system` counts them, Gregorian where none is given.
 */
export const segmentsOf = (kind: SegmentedKind, value: string, system?: MonthSystem): Segments => {
  if (kind === 'date') {
    const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
    const date = system && parts ? asDate(value) : null
    if (system && date) {
      return { ...system.parts(date) }
    }
    return parts ? { day: Number(parts[3]), month: Number(parts[2]), year: Number(parts[1]) } : {}
  }
  const parts = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value)
  if (!parts) {
    return {}
  }
  const hour = Number(parts[1])
  return {
    dayPeriod: hour >= 12 ? 1 : 0,
    hour,
    minute: Number(parts[2]),
    ...(parts[3] === undefined ? {} : { second: Number(parts[3]) }),
  }
}

/**
 * The value the segments add up to, or the empty string while any segment the
 * layout shows is unset.
 *
 * A date that does not exist, the thirtieth of February, cannot be reached,
 * the day being kept inside its month as it is set.
 */
export const segmentsValue = (
  kind: SegmentedKind,
  segments: Segments,
  layout: readonly SegmentSlot[],
  system?: MonthSystem,
): string => {
  const shown = layout.flatMap((slot) => ('kind' in slot ? [slot.kind] : []))
  const needed = shown.filter((one) => one !== 'dayPeriod')
  if (needed.some((one) => segments[one] === undefined)) {
    return ''
  }
  const pad = (number: number | undefined, width = 2): string =>
    String(number ?? 0).padStart(width, '0')
  if (kind === 'date' && system) {
    return fromDate(system.from(segments.year ?? 1, segments.month ?? 1, segments.day ?? 1))
  }
  if (kind === 'date') {
    return `${pad(segments.year, 4)}-${pad(segments.month)}-${pad(segments.day)}`
  }
  const clock = `${pad(segments.hour)}:${pad(segments.minute)}`
  return shown.includes('second') ? `${clock}:${pad(segments.second)}` : clock
}

/** Whether a reader has set some segments and not all of them. */
export const isPartial = (
  kind: SegmentedKind,
  segments: Segments,
  layout: readonly SegmentSlot[],
  system?: MonthSystem,
): boolean =>
  segmentsValue(kind, segments, layout, system) === '' &&
  layout.some(
    (slot) => 'kind' in slot && slot.kind !== 'dayPeriod' && segments[slot.kind] !== undefined,
  )

/**
 * What a segment shows: its number, padded the way the locale pads it, the
 * locale's own word for the half of the day, or dashes while it is unset.
 */
export const segmentText = (
  kind: SegmentKind,
  segments: Segments,
  twelve: boolean,
  locale: string,
): string => {
  const shown = shownValue(kind, segments, twelve)
  if (kind === 'dayPeriod') {
    const at = new Date(Date.UTC(2000, 0, 1, (shown ?? 0) === 1 ? 15 : 3))
    const word =
      new Intl.DateTimeFormat(locale || undefined, {
        hour: 'numeric',
        hour12: true,
        timeZone: 'UTC',
      })
        .formatToParts(at)
        .find((part) => part.type === 'dayPeriod')?.value ?? (shown === 1 ? 'PM' : 'AM')
    return shown === undefined ? '–'.repeat(word.length) : word
  }
  const width = kind === 'year' ? 4 : 2
  if (shown === undefined) {
    return '–'.repeat(width)
  }
  return kind === 'hour' && twelve ? String(shown) : String(shown).padStart(width, '0')
}

/**
 * What a screen reader hears for a segment's value: what it shows, and for a
 * month its name as well, "8 – August", which is React Aria's reading. A
 * month heard as a number alone leaves a reader counting. In a calendar with
 * months of its own, the name is that calendar's month in the year the
 * segments hold, or in this year: "7 – Mehr".
 */
export const segmentValueText = (
  kind: SegmentKind,
  segments: Segments,
  twelve: boolean,
  locale: string,
  system?: MonthSystem,
): string => {
  const text = segmentText(kind, segments, twelve, locale)
  const month = segments.month
  if (kind !== 'month' || month === undefined) {
    return text
  }
  const name = new Intl.DateTimeFormat(locale || undefined, {
    month: 'long',
    timeZone: 'UTC',
  }).format(
    system
      ? system.from(segments.year ?? yearNow(system), month, 1)
      : new Date(Date.UTC(2000, month - 1, 1)),
  )
  return `${month} – ${name}`
}

/** What a locale calls a segment, such as "month" or "AM/PM", from `Intl`. */
export const segmentName = (kind: SegmentKind, locale: string): string => {
  try {
    const names = new Intl.DisplayNames(locale || undefined, { type: 'dateTimeField' })
    return names.of(kind === 'dayPeriod' ? 'dayPeriod' : kind) ?? kind
  } catch {
    return kind
  }
}

/** The first code point of each run of ten decimal digits a locale may write: Arabic-Indic, Persian, Devanagari, Bengali, Thai, full-width, and others. */
const ZEROS = [
  0x660, 0x6f0, 0x966, 0x9e6, 0xa66, 0xae6, 0xb66, 0xbe6, 0xc66, 0xce6, 0xd66, 0xe50, 0xed0, 0xf20,
  0x1040, 0x17e0, 0x1810, 0xff10,
]

/** Text with every decimal digit a locale writes turned into `0` to `9`. */
const latinDigits = (text: string): string =>
  text.replace(/\p{Nd}/gu, (char) => {
    const code = char.charCodeAt(0)
    const zero = ZEROS.find((one) => code >= one && code < one + 10)
    return zero === undefined ? char : String(code - zero)
  })

/** A two-digit year, read as the year within eighty years back and twenty forward. */
const wholeYear = (year: number, digits: number, now: number): number => {
  if (digits > 2) {
    return year
  }
  const century = Math.floor(now / 100) * 100
  const near = century + year
  return near > now + 20 ? near - 100 : near
}

/**
 * The date a reader wrote in the order and the digits of `locale`, as
 * `YYYY-MM-DD`, or empty where it is no date.
 *
 * `8/4/2026` in `en-US` and `4.8.2026` in `de-DE` are August 4, 2026, and a
 * month written as a word, `Aug 4, 2026` or `4. August 2026`, is read by its
 * name in the Gregorian calendar. A first number of four digits is a year,
 * as ISO writes it. A year of two digits is the nearest year within eighty
 * years back and twenty forward. `Intl` formats and does not parse, so this
 * reads the numbers back in the order `segmentLayout` finds the locale
 * writing them. Under `system`, the numbers are that calendar's year, month,
 * and day.
 */
export const readWrittenDate = (text: string, locale: string, system?: MonthSystem): string => {
  const plain = latinDigits(text).toLowerCase()
  const numbers = [...plain.matchAll(/\d+/g)].map((match) => match[0])
  let order: SegmentKind[] = segmentLayout('date', locale).flatMap((slot) =>
    'kind' in slot && slot.kind !== 'dayPeriod' ? [slot.kind] : [],
  )
  const found: Segments = {}
  if (!system) {
    /* A month written as a word: its long name, or the short one with any
       dot, whichever the text holds. */
    const names = (style: 'long' | 'short'): string[] =>
      Array.from({ length: 12 }, (_, index) =>
        new Intl.DateTimeFormat(locale || undefined, { month: style, timeZone: 'UTC' })
          .format(new Date(Date.UTC(2000, index, 1)))
          .toLowerCase()
          .replace(/\.$/, ''),
      )
    const words = plain.match(/\p{L}+/gu) ?? []
    for (const style of ['long', 'short'] as const) {
      const at = names(style).findIndex(
        (name) => name.length > 1 && words.some((word) => word === name),
      )
      if (at >= 0 && found.month === undefined) {
        found.month = at + 1
        order = order.filter((kind) => kind !== 'month')
      }
    }
  }
  if (numbers.length !== order.length || numbers.length === 0) {
    return ''
  }
  if ((numbers[0] as string).length >= 3) {
    const shown = order
    order = (['year', 'month', 'day'] as SegmentKind[]).filter((kind) => shown.includes(kind))
  }
  const now = system ? system.parts(new Date()).year : new Date().getFullYear()
  order.forEach((kind, index) => {
    const digits = numbers[index] as string
    found[kind] = kind === 'year' ? wholeYear(Number(digits), digits.length, now) : Number(digits)
  })
  const { day, month, year } = found
  if (day === undefined || month === undefined || year === undefined || year < 1 || year > 9999) {
    return ''
  }
  if (month < 1 || month > monthsIn(year, system) || day < 1 || day > daysIn(month, year, system)) {
    return ''
  }
  return system
    ? fromDate(system.from(year, month, day))
    : segmentsValue('date', found, [{ kind: 'year' }, { kind: 'month' }, { kind: 'day' }])
}

/**
 * The time a reader wrote, as `HH:mm`, or `HH:mm:ss` with `seconds`, or empty
 * where it is no time.
 *
 * Reads `2:30 PM`, `2.30pm`, `14h30`, and `3 pm` alike, with the half of the
 * day in the locale's own words or as `am` and `pm`, and digits in the
 * locale's own script.
 */
export const readWrittenTime = (text: string, locale: string, seconds = false): string => {
  const plain = latinDigits(text).toLowerCase()
  const numbers = [...plain.matchAll(/\d+/g)].map((match) => Number(match[0]))
  const letters = plain.replace(/[\d\s:.,h]/g, '')
  const words = [0, 1].map((half) =>
    segmentText('dayPeriod', { dayPeriod: half }, true, locale).toLowerCase().replace(/\./g, ''),
  )
  const bare = letters.replace(/\./g, '')
  const half =
    bare === ''
      ? undefined
      : words.indexOf(bare) >= 0
        ? words.indexOf(bare)
        : /^a(m)?$/.test(bare)
          ? 0
          : /^p(m)?$/.test(bare)
            ? 1
            : -1
  if (half === -1 || numbers.length === 0 || numbers.length > 3) {
    return ''
  }
  /* `1430` is 14:30, as a reader typing digits alone means it. */
  if (numbers.length === 1 && /\d{3,4}/.test(plain)) {
    const run = numbers[0] as number
    numbers.splice(0, 1, Math.floor(run / 100), run % 100)
  }
  let [hour = 0, minute = 0, second = 0] = numbers
  if (half !== undefined) {
    if (hour < 1 || hour > 12) {
      return ''
    }
    hour = (hour % 12) + half * 12
  }
  if (hour > 23 || minute > 59 || second > 59) {
    return ''
  }
  const pad = (number: number): string => String(number).padStart(2, '0')
  return seconds ? `${pad(hour)}:${pad(minute)}:${pad(second)}` : `${pad(hour)}:${pad(minute)}`
}
