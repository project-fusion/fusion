import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

/* The reading, after hydration. What is asserted here is what the element
   decides: which of the two modes it is in, where it takes its value from, and
   that `datetime` carries the instant whatever the text says. When the reading
   expires is `elapsedTime`'s own spec, which is pure and does not need a DOM. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

interface Stamp extends HTMLElement {
  date: string
  elapsed: boolean
  locale: string
  updateComplete: Promise<unknown>
}

const at = new Date(Date.now() - 42 * 60_000).toISOString()

const stamp = async (markup: string) => {
  const element = (await mount(markup)) as Stamp
  await element.updateComplete
  return element
}

describe('the reading', () => {
  test('elapsed is the compact form', async () => {
    const element = await stamp(
      `<helix-headless-format-date elapsed locale="en-US" date="${at}"></helix-headless-format-date>`,
    )
    expect(part(element, 'time')?.textContent).toBe('42m')
  })

  /* **`time-zone` is stated, because the instant is midnight UTC and the reading
     is not.** Without it `Intl.DateTimeFormat` answers in whatever zone is
     running the suite, so this rendered `Jan 1, 2020` on a UTC runner and
     `Dec 31, 2019` on any machine west of it: the element was correct in both
     places and the suite was only true in one. CI is UTC, so the failure
     belonged entirely to contributors. The attribute is the element's own
     published option rather than a harness trick, which is also the honest way
     to assert a calendar date. */
  test('without it, the options a consumer set decide', async () => {
    const element = await stamp(
      `<helix-headless-format-date locale="en-US" month="short" day="numeric" year="numeric"
        time-zone="UTC" date="2020-01-01T00:00:00.000Z"></helix-headless-format-date>`,
    )
    expect(part(element, 'time')?.textContent).toBe('Jan 1, 2020')
  })

  /**
   * `datetime` is the instant and the text is the reading, and they are
   * deliberately not the same thing: a screen reader, a copy and paste, and
   * anything parsing the page all want the first.
   */
  test('the exact instant is carried whatever the text says', async () => {
    const element = await stamp(
      `<helix-headless-format-date elapsed date="${at}"></helix-headless-format-date>`,
    )
    expect(part(element, 'time')?.getAttribute('datetime')).toBe(at)
  })

  test('no timestamp renders nothing, rather than the epoch', async () => {
    const element = await stamp('<helix-headless-format-date></helix-headless-format-date>')
    expect(part(element, 'time')).toBeNull()
  })

  test('a timestamp that is not one renders nothing either', async () => {
    const element = await stamp(
      '<helix-headless-format-date date="the day before yesterday"></helix-headless-format-date>',
    )
    expect(part(element, 'time')).toBeNull()
  })
})

describe('where the value comes from', () => {
  /**
   * The spelling that reads best in markup, and the client is the only place it
   * can work: the server shim has no `textContent` to read, which
   * `format-date-root.ssr.spec.ts` asserts from the other side.
   */
  test('the element text is read where no attribute carried one', async () => {
    const element = await stamp(
      `<helix-headless-format-date elapsed locale="en-US">${at}</helix-headless-format-date>`,
    )
    await element.updateComplete
    expect(part(element, 'time')?.textContent).toBe('42m')
  })

  test('an attribute wins over the text, so one element cannot say two things', async () => {
    const older = new Date(Date.now() - 3 * 3_600_000).toISOString()
    const element = await stamp(
      `<helix-headless-format-date elapsed locale="en-US" date="${older}">${at}</helix-headless-format-date>`,
    )
    await element.updateComplete
    expect(part(element, 'time')?.textContent).toBe('3h')
  })
})

describe('a day with no time', () => {
  /* Read in UTC, because it names a day rather than an instant: parsed, it is
     midnight UTC, and in Los Angeles that was August 3. Asserted in whatever
     zone runs the suite, which is the point: the answer must not depend on it. */
  test('is that day in every zone', async () => {
    const element = await stamp(
      '<helix-headless-format-date date="2026-08-04" locale="en-US" month="long" day="numeric" year="numeric"></helix-headless-format-date>',
    )
    expect(part(element, 'time')?.textContent).toBe('August 4, 2026')
    expect(part(element, 'time')?.getAttribute('datetime')).toBe('2026-08-04')
  })
})

describe('an elapsed reading to a screen reader', () => {
  /* Measured before this: Chromium named the `<time>` nothing and read its
     only child, "3h", and the instant in `datetime` reached nobody. */
  test('is named in full, and carries the whole date as its title', async () => {
    const element = await stamp(
      `<helix-headless-format-date elapsed locale="en-US" date="${at}"></helix-headless-format-date>`,
    )
    const time = part(element, 'time')
    expect(time?.getAttribute('aria-label')).toBe('42 minutes ago')
    expect(time?.getAttribute('title')).toContain(String(new Date(at).getFullYear()))
  })
})

/* The ticker keeps its state under a global symbol, so a spec outside core can
   hold it stopped, as the clock controller's own spec does, and move it on by
   hand. `Date.now` is held too, since the clock reads the time from it: a
   wall-clock wait for the words to go stale is a flaky spec. */
const TICKER = Symbol.for('helix.ticker')
const shared = globalThis as unknown as Record<symbol, unknown>
const realNow = Date.now
let heldTicker: unknown

afterEach(() => {
  Date.now = realNow
  shared[TICKER] = heldTicker
})

/** A clock that moves only when told, under both the ticker and `Date.now`. */
const stopped = () => {
  heldTicker = shared[TICKER]
  let now = realNow()
  let pending: { at: number; run: () => void } | undefined
  shared[TICKER] = {
    clock: {
      clearTimer: () => {
        pending = undefined
      },
      now: () => now,
      setTimer: (run: () => void, wait: number) => {
        pending = { at: now + wait, run }
        return 1
      },
    },
    timer: undefined,
    waiting: new Set(),
  }
  Date.now = () => now
  return {
    advance: (ms: number) => {
      now += ms
      if (pending && pending.at <= now) {
        const due = pending
        pending = undefined
        due.run()
      }
    },
    now: () => now,
  }
}

describe('a reading left on the page', () => {
  test('moves on by itself when its words go stale, and not before', async () => {
    const clock = stopped()
    const moment = new Date(clock.now() - 42 * 60_000 - 30_000).toISOString()
    const element = await stamp(
      `<helix-headless-format-date elapsed locale="en-US" date="${moment}"></helix-headless-format-date>`,
    )
    expect(part(element, 'time')?.textContent).toBe('42m')
    clock.advance(20_000)
    await element.updateComplete
    expect(part(element, 'time')?.textContent).toBe('42m')
    clock.advance(10_000)
    await element.updateComplete
    expect(part(element, 'time')?.textContent).toBe('43m')
    expect(part(element, 'time')?.getAttribute('aria-label')).toBe('43 minutes ago')
  })
})

describe('a frozen reading', () => {
  test('stays as it was drawn, and catches up once it is not frozen', async () => {
    const clock = stopped()
    const moment = new Date(clock.now() - 42 * 60_000 - 30_000).toISOString()
    const element = (await stamp(
      `<helix-headless-format-date elapsed frozen locale="en-US" date="${moment}"></helix-headless-format-date>`,
    )) as Stamp & { frozen: boolean }
    expect(part(element, 'time')?.textContent).toBe('42m')
    clock.advance(5 * 60_000)
    await element.updateComplete
    expect(part(element, 'time')?.textContent).toBe('42m')
    element.frozen = false
    await element.updateComplete
    expect(part(element, 'time')?.textContent).toBe('47m')
  })
})

describe('a reading under a minute old', () => {
  /* Measured before this: "in 0 seconds", a moment ago read as the future. */
  test('is in the past where every number is written', async () => {
    const clock = stopped()
    const moment = new Date(clock.now() - 57_000).toISOString()
    const element = await stamp(
      `<helix-headless-format-date relative="long" numeric="always" locale="en-US" date="${moment}"></helix-headless-format-date>`,
    )
    expect(part(element, 'time')?.textContent).toBe('0 seconds ago')
    const words = await stamp(
      `<helix-headless-format-date relative="long" locale="en-US" date="${moment}"></helix-headless-format-date>`,
    )
    expect(part(words, 'time')?.textContent).toBe('now')
  })
})
