import { type Relative, UNITS as TIME_UNITS } from '../relative-time/relative-time.js'

/**
 * A timestamp read the way a feed reads one: short, and a date once short stops
 * meaning anything.
 *
 * **The compact form is ambiguous past a week, and that is why it stops.**
 * `Intl.NumberFormat` with `unitDisplay: 'narrow'` is the only locale-aware way
 * to get "42m" rather than "42 minutes ago", and measured across locales it
 * renders both `minute` and `month` as `m` in en-US: "3m" is three minutes or
 * three months and a reader cannot tell which. `Intl.RelativeTimeFormat` in its
 * narrow style disambiguates the month as "3mo" and keeps an affix that cannot
 * be removed across locales, German prefixing "vor" and Japanese suffixing 前.
 *
 * So the compact form covers the range where it is unambiguous, the units up to
 * a week, and past that this returns a date. Nothing is guessed and nothing is
 * hand-written: the short units come from `Intl.NumberFormat`, the dates from
 * `Intl.DateTimeFormat`, and both answer to the caller's locale.
 *
 * Cached per locale for the reason `relativeTime` and `formatNumbers` are: the
 * constructors are expensive, the calls are cheap, and a feed of fifty items
 * formats fifty times per update.
 */
const held = new Map<string, Intl.NumberFormat[]>()
const dated = new Map<string, Intl.DateTimeFormat[]>()

/** The units the compact form covers, largest last: `relativeTime`'s minute,
    hour and day. `week` is deliberately not among them: past six days this
    returns a date instead, which is both shorter to read and the only reading
    that cannot be mistaken for minutes. */
const UNITS = TIME_UNITS.slice(1, 4) as Array<{ ms: number; unit: 'day' | 'hour' | 'minute' }>

/** Where the compact form gives out, in milliseconds. Seven days. */
const HORIZON = 604_800_000

const compact = (locale: string): Intl.NumberFormat[] => {
  let found = held.get(locale)
  if (!found) {
    found = UNITS.map(
      ({ unit }) =>
        new Intl.NumberFormat(locale || undefined, {
          style: 'unit',
          unit,
          unitDisplay: 'narrow',
        }),
    )
    held.set(locale, found)
  }
  return found
}

/** Same day and month for a timestamp inside the year, month and year outside
    it: "12 Mar" says everything while the year is understood, and "Mar 2023" is
    what a reader wants once it is not. */
const calendar = (locale: string): Intl.DateTimeFormat[] => {
  let found = dated.get(locale)
  if (!found) {
    found = [
      new Intl.DateTimeFormat(locale || undefined, { day: 'numeric', month: 'short' }),
      new Intl.DateTimeFormat(locale || undefined, { month: 'short', year: 'numeric' }),
    ]
    dated.set(locale, found)
  }
  return found
}

/**
 * A formatter for one locale, kept.
 *
 * `now` is a parameter rather than read from the clock, for the reason
 * `relativeTime` gives: a function that reads `Date.now()` internally can only
 * be tested by waiting or by replacing a global, and both produce specs that
 * fail on a slow machine.
 */
export const elapsedTime = (locale: string): ((from: Date, now: Date) => Relative) => {
  const short = compact(locale)
  const dates = calendar(locale)
  /* "now" rather than a count of seconds, and taken from `Intl` rather than
     written here so it is a word in the reader's language. Under a minute a feed
     that reports 3, then 4, then 5 seconds is a feed moving under somebody
     trying to read it, and nobody acts differently at seven seconds than four. */
  const zero = new Intl.RelativeTimeFormat(locale || undefined, { numeric: 'auto' })

  return (from, now) => {
    const elapsed = now.getTime() - from.getTime()
    if (!Number.isFinite(elapsed)) {
      return { next: Number.POSITIVE_INFINITY, text: '' }
    }

    const size = Math.abs(elapsed)
    if (size < 60_000) {
      /* Floored like every other branch. At 59,999 milliseconds the remainder is
         one, and a caller handed a one is re-armed inside the callback that
         fired it. */
      return { next: Math.max(1000, 60_000 - size), text: zero.format(0, 'second') }
    }

    /* A date, and it will not change again. `Infinity` is the whole point of
       saying so: the caller schedules nothing, so a feed of old notifications
       left open overnight wakes for none of them. */
    if (size >= HORIZON) {
      const sameYear = from.getFullYear() === now.getFullYear()
      const format = sameYear ? dates[0] : dates[1]
      return { next: Number.POSITIVE_INFINITY, text: (format as Intl.DateTimeFormat).format(from) }
    }

    let index = 0
    for (let at = 0; at < UNITS.length; at += 1) {
      if (size >= (UNITS[at] as { ms: number }).ms) {
        index = at
      }
    }
    const chosen = UNITS[index] as { ms: number; unit: string }
    const count = Math.trunc(size / chosen.ms)

    /* Time until the count ticks over, which is the remainder of the current
       unit rather than the whole of one: read at 90 seconds an item is "1m" for
       another 30 seconds, not another 60. Capped where `relativeTime` caps it,
       and floored at a second so nobody is handed a zero and schedules a busy
       loop. */
    const remaining = Math.min(chosen.ms - (size % chosen.ms), HORIZON - size)
    return {
      next: Math.max(1000, Math.min(remaining, 3_600_000)),
      text: (short[index] as Intl.NumberFormat).format(count),
    }
  }
}
