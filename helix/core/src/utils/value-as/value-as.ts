/*
 * A date or time control's string value, read as the platform reads it.
 *
 * Shared, because six families hold three formats between them and separate
 * implementations of one conversion are chances to disagree about what an
 * invalid value returns. A pure function of a string, so it sits here beside
 * `formatNumbers` and `relativeTime` rather than under `helix/headless`.
 *
 * **UTC throughout, which is the platform's own choice and looks wrong until it
 * is explained.** `<input type="date">.valueAsDate` returns midnight UTC rather
 * than midnight local, so a date that is the same date everywhere does not
 * become a different one by crossing a timezone. Constructing through
 * `new Date('2026-08-26')` happens to do this and `new Date(2026, 7, 26)` does
 * not, and the difference is a whole day for anybody west of Greenwich: the
 * local constructor gives a `Date` whose UTC date is the 25th. `Date.UTC` says
 * which one is meant rather than relying on a parse rule.
 *
 * **Invalid is `null` and `NaN`, never a thrown error and never a guess.** That
 * is what the platform answers for a half-typed date, which is most of the
 * keystrokes a reader makes in one: a control that threw on the way to a valid
 * value would be unusable, and one that guessed would submit a date nobody
 * chose.
 *
 * **What stays with each family is the accessor pair, and that is deliberate.**
 * Date Input and Date Picker write an identical `valueAsDate` and
 * `valueAsNumber` over `valueAsDate`/`dateAsValue`, and Time Input and Time
 * Picker an identical pair over the time ones. Each body is a single line; the
 * rest of the pair is its published docblock, which says different things about
 * a date and about a time and is read off each family's own reference page. A
 * mixin holding them would save four one-line bodies and cost two exported
 * mixins in a published package, and it would not save the prose: a mixin here
 * declares its surface twice, once on the inner class the analyzer reads and
 * once on the `declare class` TypeScript consumers see, which is the same two
 * copies the four families carry now. So the conversion is shared and the API
 * is each family's own, and the four say so where they write it.
 */

/** `YYYY-MM-DD`, and nothing that merely starts like it. */
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

/** `HH:mm`, optionally with seconds, which is what a step under a minute produces. */
const ISO_TIME = /^(\d{2}):(\d{2})(?::(\d{2}(?:\.\d{1,3})?))?$/

/** Milliseconds in one day, for a time value, which is an offset rather than an instant. */
const DAY = 86_400_000

/**
 * The date a `YYYY-MM-DD` value names, at midnight UTC, or `null`.
 *
 * The range check is not decoration. `2026-02-31` matches the pattern and
 * `Date.UTC` rolls it forward to 3 March, so without reading the parts back a
 * control would report a date the reader never typed and never saw.
 */
export const valueAsDate = (value: string): Date | null => {
  const parts = ISO_DATE.exec(value)
  if (!parts) {
    return null
  }
  const [year, month, day] = [Number(parts[1]), Number(parts[2]), Number(parts[3])]
  const date = new Date(Date.UTC(year, month - 1, day))
  const rolled =
    date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day
  return rolled ? null : date
}

/** The `YYYY-MM-DD` value for a date, or the empty string, which is how a control says nothing. */
export const dateAsValue = (date: Date | null): string => {
  if (!date || Number.isNaN(date.getTime())) {
    return ''
  }
  return date.toISOString().slice(0, 10)
}

/**
 * The time an `HH:mm` value names, on 1 January 1970 UTC, or `null`.
 *
 * The platform's own answer for `<input type="time">`, and the epoch day is
 * what makes `valueAsNumber` come out as milliseconds since midnight rather
 * than as an instant nobody meant.
 */
export const valueAsTime = (value: string): Date | null => {
  const parts = ISO_TIME.exec(value)
  if (!parts) {
    return null
  }
  const [hours, minutes] = [Number(parts[1]), Number(parts[2])]
  const seconds = parts[3] === undefined ? 0 : Number(parts[3])
  if (hours > 23 || minutes > 59 || seconds >= 60) {
    return null
  }
  return new Date(Date.UTC(1970, 0, 1, hours, minutes, Math.floor(seconds), (seconds % 1) * 1000))
}

/**
 * The `HH:mm` value for a time, or the empty string.
 *
 * Seconds are written only where there are any, because `HH:mm` is what this
 * library's time controls hold and a trailing `:00` on every value would be a
 * format change dressed as a conversion.
 */
export const timeAsValue = (date: Date | null): string => {
  if (!date || Number.isNaN(date.getTime())) {
    return ''
  }
  const within = ((date.getTime() % DAY) + DAY) % DAY
  const clock = new Date(within)
  const pad = (part: number): string => String(part).padStart(2, '0')
  const seconds = clock.getUTCSeconds() + clock.getUTCMilliseconds() / 1000
  const hm = `${pad(clock.getUTCHours())}:${pad(clock.getUTCMinutes())}`
  return seconds === 0 ? hm : `${hm}:${pad(clock.getUTCSeconds())}`
}

/**
 * The number a value holds, or `NaN`.
 *
 * `Number('')` is zero, which is the trap: an empty control would report a
 * number it does not hold and a form would submit it. The platform answers
 * `NaN` for an empty `<input type="number">` and so does this.
 */
export const valueAsNumber = (value: string): number =>
  value.trim() === '' ? Number.NaN : Number(value)

/** The value for a number, or the empty string, which is how a control says nothing. */
export const numberAsValue = (count: number): string => (Number.isNaN(count) ? '' : String(count))
