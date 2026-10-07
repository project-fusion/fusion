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
export const UNITS: Unit[] = [
  { ms: 1000, unit: 'second' },
  { ms: 60_000, unit: 'minute' },
  { ms: 3_600_000, unit: 'hour' },
  { ms: 86_400_000, unit: 'day' },
  { ms: 604_800_000, unit: 'week' },
  { ms: 2_629_800_000, unit: 'month' },
  { ms: 31_557_600_000, unit: 'year' },
]

/** One unit of `UNITS`. */
type Unit = { ms: number; unit: Intl.RelativeTimeFormatUnit }

/**
 * A size of time as a rounded count of one of `units`, and how long that
 * count holds while the size grows (`growing`, a moment gone) or shrinks (a
 * moment to come).
 *
 * **Rounded, as Shoelace's relative time rounds.** Truncated, a date 48 hours
 * ahead, measured a few milliseconds later, read "tomorrow", and 59 minutes
 * read "59 minutes" while 61 read "1 hour". A count that rounds up to the next
 * unit's size reads in that unit: 59.6 minutes is 1 hour, 6.6 days is 1 week.
 *
 * `units` run smallest first and the size is at least the first of them.
 * Exported for `elapsedTime`, which reads its minute, hour and day the same way.
 */
export const roundedCount = <U extends { ms: number }>(
  size: number,
  units: readonly U[],
  growing: boolean,
): { count: number; index: number; next: number } => {
  let index = 0
  for (let at = 1; at < units.length; at += 1) {
    if (size >= (units[at] as U).ms) {
      index = at
    }
  }
  const ms = (at: number): number => (units[at] as U).ms
  let count = Math.round(size / ms(index))
  while (index + 1 < units.length && count * ms(index) >= ms(index + 1)) {
    index += 1
    count = Math.round(size / ms(index))
  }
  /* The count turns over half a unit either side of a whole one. Shrinking, it
     also changes where the size drops under this unit, and, where this unit
     was reached by rounding up, where the unit below stops rounding up to it.
     A boundary too early only wakes a caller to the same text; one too late
     leaves the old text on screen, so every candidate is counted. */
  if (growing) {
    return { count, index, next: (count + 0.5) * ms(index) - size }
  }
  const below = [(count - 0.5) * ms(index)]
  if (size >= ms(index)) {
    below.push(ms(index))
  }
  if (index > 0) {
    below.push((Math.ceil(ms(index) / ms(index - 1)) - 0.5) * ms(index - 1))
  }
  const floor = Math.max(...below.filter((at) => at <= size))
  return { count, index, next: size - floor + 1 }
}

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

    /* Rounded, from the minute up: see `roundedCount`. The wait is until the
       count turns over, which is part of a unit rather than the whole of one:
       an item read at 100 seconds is "2 minutes ago" for another 50 seconds. */
    const { count, index, next } = roundedCount(size, UNITS.slice(1), elapsed < 0)
    const chosen = UNITS[index + 1] as Unit
    return {
      next: Math.max(1000, Math.min(next, 3_600_000)),
      text: found.format(elapsed < 0 ? -count : count, chosen.unit),
    }
  }
}
