/** One reading on a category axis: its name, and the instant it stands for, where it has one. */
export interface Category {
  /**
   * The reading's own name, which is what is drawn under it.
   */
  label: string
  /**
   * The machine-readable instant, from a `<time>` in the row's header.
   */
  when?: string
}

/** One reading's name drawn along a category axis, and the room it is given. */
export interface PlacedLabel {
  /**
   * The reading's place among the readings, counting from zero.
   */
  at: number
  /**
   * How much of the axis the name's room takes, as a percentage.
   */
  size: number
  /**
   * Where the name's room starts, as a percentage of the axis from its start.
   */
  start: number
}

/** How long a category axis is and how long each name on it is, in pixels. */
export interface AxisLengths {
  /**
   * The least room left between two names.
   */
  gap: number
  /**
   * The axis' own length.
   */
  length: number
  /**
   * How long the name of the reading at this place is, along the axis.
   */
  name: (at: number) => number
}

/**
 * How many names are drawn while the axis is not measured: before its first
 * layout, and where there is no layout at all, as on a server or in a DOM
 * without boxes. Every name up to this many, which is more than any axis
 * holds at a readable size, and a share of them past it.
 */
export const UNMEASURED_LABELS = 100

/** A rung of a ladder: which bucket each reading falls in, and roughly how many there are. */
interface Rung {
  /** The bucket of the reading at this place. A name is drawn where the bucket changes. */
  bucket: (at: number) => number
  /** About how many buckets the readings span, to pass over a rung far too fine to fit. */
  estimate: number
}

/** The 1, 2 and 5 steps `ticks` takes, for the rung of this place on the ladder. */
const roundStep = (rung: number): number =>
  ([1, 2, 5][rung % 3] as number) * 10 ** Math.floor(rung / 3)

/**
 * Plain categories, such as names or months written as words: every reading,
 * every second, every fifth, every tenth, and on, counted from the first.
 */
const plainRungs = function* (count: number): Generator<Rung> {
  for (let rung = 0; ; rung += 1) {
    const step = roundStep(rung)
    yield { bucket: (at) => Math.floor(at / step), estimate: count / step }
    if (step >= count) {
      return
    }
  }
}

/**
 * Categories that are numbers in order, such as years: a name where the
 * readings cross a round number, the multiples of 1, 2 or 5 at some power of
 * ten, so the names drawn are 1990, 2000 and 2010.
 */
const numericRungs = function* (values: readonly number[]): Generator<Rung> {
  let finest = Number.POSITIVE_INFINITY
  for (let at = 1; at < values.length; at += 1) {
    finest = Math.min(finest, Math.abs((values[at] as number) - (values[at - 1] as number)))
  }
  const span = Math.abs((values.at(-1) as number) - (values[0] as number))
  const base = 10 ** Math.floor(Math.log10(finest))
  for (let rung = 0; ; rung += 1) {
    const step = base * roundStep(rung)
    /* From zero, so the names drawn are multiples of the step whatever the
       first reading is. The nudge keeps 0.30000000000000004 a multiple of 0.1. */
    yield {
      bucket: (at) => Math.floor((values[at] as number) / step + 1e-9),
      estimate: span / step,
    }
    if (step > span) {
      return
    }
  }
}

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** Durations a clock is read in, finest first, up to a day. */
const CLOCK = [
  SECOND,
  5 * SECOND,
  15 * SECOND,
  30 * SECOND,
  MINUTE,
  5 * MINUTE,
  15 * MINUTE,
  30 * MINUTE,
  HOUR,
  3 * HOUR,
  6 * HOUR,
  12 * HOUR,
  DAY,
  2 * DAY,
]

/**
 * Categories that are instants, from a `<time>` in each row's header: a name
 * where the readings cross into a new second, minute, hour, day, week, month,
 * quarter or year, at the finest of those that fits. So a year of days draws
 * the first reading of each month, and ten years draw the first of each year.
 *
 * `walls` are the instants on the clock the readings were written in: a
 * date with no time is read in UTC, as `Date.parse` reads it, and a time with
 * no zone in the page's own, so a day starts at midnight where it was written.
 */
const timeRungs = function* (walls: readonly number[]): Generator<Rung> {
  const span = Math.abs((walls.at(-1) as number) - (walls[0] as number))
  for (const step of CLOCK) {
    yield { bucket: (at) => Math.floor((walls[at] as number) / step), estimate: span / step }
  }
  /* 1 January 1970 was a Thursday, so three days on is a Monday. */
  yield {
    bucket: (at) => Math.floor((Math.floor((walls[at] as number) / DAY) + 3) / 7),
    estimate: span / (7 * DAY),
  }
  const months = (at: number): number => {
    const date = new Date(walls[at] as number)
    return date.getUTCFullYear() * 12 + date.getUTCMonth()
  }
  for (const step of [1, 3, 6]) {
    yield { bucket: (at) => Math.floor(months(at) / step), estimate: span / (step * 30 * DAY) }
  }
  for (let rung = 0; ; rung += 1) {
    const step = roundStep(rung)
    yield {
      bucket: (at) => Math.floor(Math.floor(months(at) / 12) / step),
      estimate: span / (step * 365 * DAY),
    }
    if (step * 365 * DAY > span) {
      return
    }
  }
}

/** Whether a list only rises, or only falls, which makes a round number crossable once. */
const ordered = (values: readonly number[], strict: boolean): boolean => {
  let rising = true
  let falling = true
  for (let at = 1; at < values.length; at += 1) {
    const step = (values[at] as number) - (values[at - 1] as number)
    rising &&= strict ? step > 0 : step >= 0
    falling &&= strict ? step < 0 : step <= 0
  }
  return rising || falling
}

/** A date with no time in it, which `Date.parse` reads as UTC midnight. */
const DATE_ONLY = /^\d{4}(-\d{2}(-\d{2})?)?$/

/**
 * The ladder a category axis is thinned along, by what its names are: instants
 * where every reading carries one, numbers where every name is one and they
 * run in order, and plain names otherwise.
 */
const rungsOf = (categories: readonly Category[]): Generator<Rung> => {
  const count = categories.length
  if (count > 1 && categories.every((one) => one.when !== undefined)) {
    const walls = categories.map((one) => {
      const when = (one.when as string).trim()
      const instant = Date.parse(when)
      return DATE_ONLY.test(when)
        ? instant
        : instant - new Date(instant).getTimezoneOffset() * MINUTE
    })
    if (walls.every(Number.isFinite) && ordered(walls, false)) {
      return timeRungs(walls)
    }
  }
  if (count > 1) {
    const values = categories.map((one) =>
      one.label.trim() === '' ? Number.NaN : Number(one.label.trim()),
    )
    if (values.every(Number.isFinite) && ordered(values, true)) {
      return numericRungs(values)
    }
  }
  return plainRungs(count)
}

/** The places where a rung's bucket changes, which is where its names are drawn. */
const changes = (rung: Rung, count: number): number[] => {
  const found = [0]
  let previous = rung.bucket(0)
  for (let at = 1; at < count; at += 1) {
    const bucket = rung.bucket(at)
    if (bucket !== previous) {
      found.push(at)
      previous = bucket
    }
  }
  return found
}

/**
 * Where the name of the reading at this place sits along the axis, in pixels:
 * centered on its reading, and pushed inward at either end so it keeps half a
 * gap from the end of the axis.
 */
const extentOf =
  (count: number, lengths: AxisLengths) =>
  (at: number): [number, number] => {
    const long = lengths.name(at)
    const center = ((at + 0.5) / count) * lengths.length
    const inset = lengths.gap / 2
    const low = Math.max(inset, Math.min(center - long / 2, lengths.length - inset - long))
    return [low, low + long]
  }

/**
 * The names kept from these candidates, or nothing where two of them collide.
 *
 * **The first and the last are always kept**, so the axis always says where
 * it starts and where it ends. A candidate too near either of them is dropped,
 * since the first is wherever the readings happen to start and is no round
 * place of its own; a collision between two candidates means the rung is too
 * fine for the axis, and the caller tries the next.
 */
const keep = (
  candidates: readonly number[],
  count: number,
  lengths: AxisLengths,
): number[] | undefined => {
  const last = count - 1
  const extent = extentOf(count, lengths)
  const kept = [0]
  let end = extent(0)[1]
  const tail = last > 0 ? extent(last)[0] : Number.POSITIVE_INFINITY
  for (const at of candidates) {
    if (at === 0 || at === last) {
      continue
    }
    const [low, high] = extent(at)
    if (high + lengths.gap > tail) {
      break
    }
    if (low < end + lengths.gap) {
      if (kept.length === 1) {
        continue
      }
      return undefined
    }
    kept.push(at)
    end = high
  }
  if (last > 0) {
    kept.push(last)
  }
  return kept
}

/** A number for a style, short enough to read in an inspector. */
const short = (value: number): number => Math.round(value * 10_000) / 10_000

/** A room as percentages of an axis this long. */
const percent = (at: number, low: number, high: number, length: number): PlacedLabel => ({
  at,
  size: short(((high - low) / length) * 100),
  start: short((low / length) * 100),
})

/**
 * The room each kept name is given, as percentages of the axis, with the name
 * centered in it.
 *
 * Measured, a room is the name's own extent widened toward its neighbors by
 * half the space between them, and toward an end of the axis by all of it, so
 * a name a little wider than measured is still not cut short. A name at an end
 * keeps the half gap `extentOf` left it, which is what lets it sit flush with
 * the end of the axis while centered in its room. With every name drawn and
 * each narrower than its slot, the rooms are the slots exactly.
 *
 * Unmeasured, a room is centered on its reading and reaches halfway to the
 * nearer neighbor, which with every name drawn is again the slot.
 */
const rooms = (
  kept: readonly number[],
  count: number,
  lengths: AxisLengths | undefined,
): PlacedLabel[] => {
  const last = kept.length - 1
  if (last === 0) {
    return [{ at: kept[0] as number, size: 100, start: 0 }]
  }
  if (!lengths) {
    const center = (at: number): number => at + 0.5
    return kept.map((at, place) => {
      const before = place > 0 ? center(at) - center(kept[place - 1] as number) : 2 * center(at)
      const after =
        place < last ? center(kept[place + 1] as number) - center(at) : 2 * (count - center(at))
      const half = Math.min(before, after) / 2
      return percent(at, center(at) - half, center(at) + half, count)
    })
  }
  const length = lengths.length
  const extent = extentOf(count, lengths)
  const spans = kept.map(extent)
  /* Two names that cannot both fit share the axis, each cut to its half, so
     neither covers the other. */
  const [head, tail] = [spans[0] as [number, number], spans[last] as [number, number]]
  if (last === 1 && head[1] + lengths.gap > tail[0]) {
    return [
      percent(kept[0] as number, 0, length / 2, length),
      percent(kept[1] as number, length / 2, length, length),
    ]
  }
  return kept.map((at, place) => {
    const [low, high] = spans[place] as [number, number]
    const before = place > 0 ? (low - (spans[place - 1] as [number, number])[1]) / 2 : low
    const after =
      place < last ? ((spans[place + 1] as [number, number])[0] - high) / 2 : length - high
    const pad = Math.max(0, Math.min(before, after))
    return percent(at, low - pad, high + pad, length)
  })
}

/**
 * Which readings a category axis names, and where each name sits.
 *
 * **Every name where every name fits, and a regular share of them where they
 * do not.** One name per reading in a grid of equal columns truncated each name
 * to its column and, past a few hundred readings, laid them over one another:
 * 10,000 readings across 900 pixels gave each name under a tenth of a pixel and
 * built ten thousand elements to draw nothing legible. So the names that fit
 * are drawn and the rest are left out, with the first and the last always kept.
 *
 * **Which share depends on what the names are.** Instants, from a `<time>` in
 * every row, are named where they cross into a new period: the first of each
 * month, the first of each year. Numbers in order, such as years, are named
 * where they cross a round number. Anything else is named every so many
 * readings, counted from the first. Every share is the finest of a ladder of
 * round steps, 1, 2 and 5 at each power of ten, that leaves `gap` between every
 * two names at `length`.
 *
 * Without `lengths` the axis has not been measured, and every name is drawn up
 * to `UNMEASURED_LABELS`, which is what a page with no layout sees.
 *
 * A pure function, so the drawing and its specs share one answer. The names
 * are read for the reading's own words only: a reading's tooltip and its
 * spoken readout say its own name, whether or not the axis draws it.
 */
export const placeLabels = (
  categories: readonly Category[],
  lengths?: AxisLengths,
): PlacedLabel[] => {
  const count = categories.length
  if (count === 0) {
    return []
  }
  if (!lengths || !(lengths.length > 0)) {
    let step = 1
    for (let rung = 0; count / step > UNMEASURED_LABELS; rung += 1) {
      step = roundStep(rung + 1)
    }
    const kept = Array.from({ length: Math.ceil(count / step) }, (_, place) => place * step)
    return rooms(kept.at(-1) === count - 1 ? kept : [...kept, count - 1], count, undefined)
  }
  /* A rung that would put more names on the axis than it has gaps for cannot
     fit, so it is passed over without being walked. The estimate is a span
     divided by a step and can be off by a bucket at each end, hence the
     factor. */
  const most = (2 * lengths.length) / Math.max(lengths.gap, 1)
  if (count <= most) {
    const every = Array.from({ length: count }, (_, at) => at)
    const all = keep(every, count, lengths)
    if (all && all.length === count) {
      return rooms(all, count, lengths)
    }
  }
  for (const rung of rungsOf(categories)) {
    if (rung.estimate > most) {
      continue
    }
    const candidates = changes(rung, count)
    if (candidates.length === count) {
      continue
    }
    const kept = keep(candidates, count, lengths)
    if (kept) {
      return rooms(kept, count, lengths)
    }
  }
  return rooms(count > 1 ? [0, count - 1] : [0], count, lengths)
}
