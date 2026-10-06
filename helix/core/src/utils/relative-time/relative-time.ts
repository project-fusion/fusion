/**
 * A timestamp read the way a person reads one, and the moment it stops being true.
 *
 * **The second half is the point.** "2 minutes ago" is correct for sixty seconds
 * and wrong for the rest of the session, and a feed a user leaves open is
 * exactly where that shows: every item drifts, quietly, and the panel ends up
 * describing when the page loaded rather than when anything happened. So this
 * returns the text and the milliseconds until that text changes, which is what
 * lets a caller schedule one update instead of polling and lets a page hold one
 * timer instead of one per item.
 *
 * `Intl.RelativeTimeFormat` with `numeric: 'auto'` is what produces "yesterday"
 * rather than "1 day ago", which is what a reader would say. Cached per locale
 * for the reason `formatNumbers` is: the constructor is expensive, the call is
 * cheap, and a feed of fifty items formats fifty times per update.
 */
const held = new Map<string, Intl.RelativeTimeFormat>()

/**
 * How long each unit lasts, in milliseconds, largest last. `elapsedTime`
 * reads its minute, hour and day from here.
 */
export const UNITS: Array<{ ms: number; unit: Intl.RelativeTimeFormatUnit }> = [
  { ms: 1000, unit: 'second' },
  { ms: 60_000, unit: 'minute' },
  { ms: 3_600_000, unit: 'hour' },
  { ms: 86_400_000, unit: 'day' },
  { ms: 604_800_000, unit: 'week' },
  { ms: 2_629_800_000, unit: 'month' },
  { ms: 31_557_600_000, unit: 'year' },
]

/** What one timestamp reads as, and when that stops being true. */
export interface Relative {
  /**
   * Milliseconds until `text` would be different, or `Infinity` where it never
   * will be within a session worth planning for.
   *
   * Floored at a second so a caller cannot be handed a zero and schedule a busy
   * loop, and capped at an hour: an item three years old changes text in about
   * a year, and a timer set for a year is a timer that is really "never" while
   * looking like a number.
   */
  next: number
  /** The reading, in the caller's locale. */
  text: string
}

/**
 * How a reading is written: `style` is `Intl.RelativeTimeFormat`'s, from
 * "3 hours ago" at `long` to "3h ago" at `narrow` in English, and `numeric`
 * says whether a day back is "yesterday" (`auto`) or "1 day ago" (`always`).
 */
export interface RelativeOptions {
  numeric?: 'always' | 'auto'
  style?: 'long' | 'narrow' | 'short'
}

/**
 * A formatter for one locale, kept.
 *
 * `now` is a parameter rather than read from the clock, which is what makes this
 * testable at all: a function that reads `Date.now()` internally can only be
 * tested by waiting or by replacing a global, and both produce specs that fail
 * on a slow machine.
 *
 * Long and `auto` unless `options` says otherwise, which is what a person
 * says aloud and what every caller wanted before Format Date offered the rest.
 */
export const relativeTime = (
  locale: string,
  options: RelativeOptions = {},
): ((from: Date, now: Date) => Relative) => {
  const numeric = options.numeric ?? 'auto'
  const style = options.style ?? 'long'
  const key = `${locale}|${numeric}|${style}`
  let format = held.get(key)
  if (!format) {
    format = new Intl.RelativeTimeFormat(locale || undefined, { numeric, style })
    held.set(key, format)
  }
  const found = format

  return (from, now) => {
    /* Signed from the timestamp's point of view, not the reader's:
       `Intl.RelativeTimeFormat` takes a negative count for the past, so
       `format(-2, 'minute')` is "2 minutes ago" and `format(2, 'minute')` is "in
       2 minutes". Computed as `now - from` the sign is backwards and every past
       item reads as the future, which is the shape of it that looks like a
       working feed until you read one. */
    const elapsed = from.getTime() - now.getTime()
    if (!Number.isFinite(elapsed)) {
      return { next: Number.POSITIVE_INFINITY, text: '' }
    }

    /* Under a minute is "now" rather than a count of seconds. A feed that
       reports 3, then 4, then 5 seconds ago is a feed that moves under the
       reader while they are trying to read it, and the precision is worth
       nothing: nobody acts differently at seven seconds than at four. */
    const size = Math.abs(elapsed)
    if (size < 60_000) {
      /* Floored, as `Relative.next` says every branch is: at 59,999
         milliseconds the remainder is one, so a caller scheduling for itself is
         re-armed inside the callback that fired it. The shared ticker's own
         `Math.max(1000, ...)` hides this from the two readers that go through
         it. */
      /* A zero that keeps its sign: `format(0, 'second')` is "in 0 seconds"
         where `numeric` is `always`, so a moment ago read as the future. `-0`
         is "0 seconds ago", and both are "now" where `numeric` is `auto`. */
      return {
        next: Math.max(1000, 60_000 - size),
        text: found.format(elapsed > 0 ? 0 : -0, 'second'),
      }
    }

    let chosen = UNITS[1] as { ms: number; unit: Intl.RelativeTimeFormatUnit }
    for (const unit of UNITS) {
      if (size >= unit.ms) {
        chosen = unit
      }
    }
    const count = Math.trunc(elapsed / chosen.ms)

    /* Time until the count ticks over, which is the remainder of the current
       unit rather than the whole of one: an item read at 90 seconds is "1 minute
       ago" for another 30 seconds, not another 60. */
    const remaining = chosen.ms - (size % chosen.ms)
    return {
      next: Math.max(1000, Math.min(remaining, 3_600_000)),
      text: found.format(count, chosen.unit),
    }
  }
}
