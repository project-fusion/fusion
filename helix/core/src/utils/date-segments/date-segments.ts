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
 * The parts set so far, each a number: the month 1 to 12, the hour 0 to 23
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
 * dots; `ja-JP` year, month, day. A time follows the clock: a twelve hour
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

/** How many days a month has, in a year, or thirty-one where either is not known. */
const daysIn = (month?: number, year?: number): number =>
  month === undefined ? 31 : new Date(Date.UTC(year ?? 2000, month, 0)).getUTCDate()

/**
 * The lowest and highest a segment can be, as it is shown: the hour on a twelve
 * hour clock is 1 to 12, and a day goes as high as its month allows.
 */
export const segmentRange = (
  kind: SegmentKind,
  segments: Segments,
  twelve: boolean,
): { max: number; min: number } => {
  switch (kind) {
    case 'year':
      return { max: 9999, min: 1 }
    case 'month':
      return { max: 12, min: 1 }
    case 'day':
      return { max: daysIn(segments.month, segments.year), min: 1 }
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
 * is put back together with the half of the day, and keeps the day inside its
 * month.
 */
export const setSegment = (
  segments: Segments,
  kind: SegmentKind,
  shown: number | undefined,
  twelve: boolean,
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
  if (next.day !== undefined) {
    next.day = Math.min(next.day, daysIn(next.month, next.year))
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
  thisYear = new Date().getFullYear(),
): Segments => {
  const { max, min } = segmentRange(kind, segments, twelve)
  const shown = shownValue(kind, segments, twelve)
  let next: number
  if (shown === undefined) {
    next = kind === 'year' ? thisYear : by > 0 ? min : max
  } else if (kind === 'year') {
    next = Math.min(max, Math.max(min, shown + by))
  } else {
    const span = max - min + 1
    next = ((((shown - min + by) % span) + span) % span) + min
  }
  return setSegment(segments, kind, next, twelve)
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
): { advance: boolean; segments: Segments; typed: string } => {
  const { max, min } = segmentRange(kind, segments, twelve)
  let text = `${typed}${digit}`
  if (Number(text) > max) {
    text = digit
  }
  const value = Number(text)
  const full = text.length >= String(max).length || value * 10 > max
  const next = value >= min ? setSegment(segments, kind, value, twelve) : segments
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
  /** Whether the field is on a twelve hour clock. */
  twelve: boolean
  /** The digits typed into the segment so far. */
  typed: string
}

/**
 * What an editing key does to a segment, or `null` for a key that edits
 * nothing.
 *
 * The arrows step it and wrap, Home and End take it to its lowest and highest,
 * Backspace and Delete empty it, a digit is typed as `typeDigit` types it, and
 * on the meridiem a letter picks the half whose word starts with it. `advance`
 * says the segment is full and focus moves on.
 */
export const segmentKey = (
  key: string,
  { kind, locale, segments, twelve, typed }: SegmentKeyState,
): { advance: boolean; segments: Segments; typed: string } | null => {
  const done = (next: Segments | undefined) =>
    next === undefined ? null : { advance: false, segments: next, typed: '' }
  if (key === 'ArrowUp' || key === 'ArrowDown') {
    return done(stepSegment(segments, kind, key === 'ArrowUp' ? 1 : -1, twelve))
  }
  if (key === 'Home' || key === 'End') {
    const { max, min } = segmentRange(kind, segments, twelve)
    return done(setSegment(segments, kind, key === 'Home' ? min : max, twelve))
  }
  if (key === 'Backspace' || key === 'Delete') {
    return done(setSegment(segments, kind, undefined, twelve))
  }
  if (/^\d$/.test(key) && kind !== 'dayPeriod') {
    return typeDigit(segments, kind, typed, key, twelve)
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

/** The segments a value names, or none where it names nothing whole. */
export const segmentsOf = (kind: SegmentedKind, value: string): Segments => {
  if (kind === 'date') {
    const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
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
): string => {
  const shown = layout.flatMap((slot) => ('kind' in slot ? [slot.kind] : []))
  const needed = shown.filter((one) => one !== 'dayPeriod')
  if (needed.some((one) => segments[one] === undefined)) {
    return ''
  }
  const pad = (number: number | undefined, width = 2): string =>
    String(number ?? 0).padStart(width, '0')
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
): boolean =>
  segmentsValue(kind, segments, layout) === '' &&
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
 * month heard as a number alone leaves a reader counting.
 */
export const segmentValueText = (
  kind: SegmentKind,
  segments: Segments,
  twelve: boolean,
  locale: string,
): string => {
  const text = segmentText(kind, segments, twelve, locale)
  const month = segments.month
  if (kind !== 'month' || month === undefined) {
    return text
  }
  const name = new Intl.DateTimeFormat(locale || undefined, {
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(2000, month - 1, 1)))
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
