import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { setTimers, timers } from '@fusion.dev/helix-core/capabilities/timers'
import { type FakeTimers, fakeTimers } from '@fusion.dev/helix-core/capabilities/timers/fake'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const entry = async (
  attributes = '',
  inner = '<span slot="time">March</span>Shipped',
): Promise<HTMLElement> =>
  (await mount(
    `<helix-headless-timeline-item ${attributes}>${inner}</helix-headless-timeline-item>`,
  )) as HTMLElement

/**
 * One entry, and the contract that is the entry's rather than the line's.
 *
 * **The timeline already proves the arrangement**, which is the order of entries
 * and the rail running behind them. What one entry decides alone is whether the
 * time it was given is a machine readable stamp or a label, and where that time
 * sits in the box, and neither is visible from the timeline, because both
 * shapes read identically.
 */
describe('one timeline entry', () => {
  /* A `<time>` with no `datetime` is a worse element than a `<span>`: it claims
     to carry a stamp and carries prose. So the tag follows the attribute, and
     the entry decides that from the one property it has. */
  test('is a time element only where it was given a stamp to carry', async () => {
    const stamped = await entry('datetime="2026-03-01"')
    expect(part(stamped, 'time')?.tagName).toBe('TIME')
    expect(part(stamped, 'time')?.getAttribute('datetime')).toBe('2026-03-01')

    const bare = await entry()
    expect(part(bare, 'time')?.tagName).toBe('SPAN')
    expect(part(bare, 'time')?.hasAttribute('datetime')).toBe(false)
  })

  /* The tone colored the mark and said nothing, so a reader who could not see
     the color was not told an event had failed. */
  test('names its mark by the tone, so the meaning is not only a color', async () => {
    const failed = await entry('tone="danger"')
    expect(part(failed, 'marker')?.getAttribute('role')).toBe('img')
    expect(part(failed, 'marker')?.getAttribute('aria-label')).toBe('Error')

    const own = await entry('tone="danger" tone-label="Failed"')
    expect(part(own, 'marker')?.getAttribute('aria-label')).toBe('Failed')

    const quiet = await entry('tone="neutral"')
    expect(part(quiet, 'marker')?.hasAttribute('role')).toBe(false)
    expect(part(quiet, 'marker')?.hasAttribute('aria-label')).toBe(false)
  })

  test('a pending entry says it has not happened yet', async () => {
    const later = await entry('pending tone="info"')
    expect(part(later, 'marker')?.getAttribute('aria-label')).toBe('Information, Scheduled')
    const bare = await entry('pending')
    expect(part(bare, 'marker')?.getAttribute('aria-label')).toBe('Scheduled')
  })

  /* The time is a sibling of the content, not the first thing inside it. Nested,
     the mark on the rail could only sit a fixed distance from the top of the
     entry, which is right for a one-line time and wrong for two. */
  test('keeps the time beside the content so the rail can align to it', async () => {
    const host = await entry()
    const time = part(host, 'time')
    const content = part(host, 'content')
    expect(content?.contains(time as Node)).toBe(false)
    expect(time?.parentElement).toBe(content?.parentElement as HTMLElement)
  })

  /* The rail is the column the line is drawn in, and the line itself is the
     sheet's: both halves are `::part(rail)::before` and `::after`, so a reader
     being read this entry hears what happened and when with nothing in the tree
     to hide from them. */
  test('renders the column the line is drawn in, and no box for the line', async () => {
    const host = await entry()
    expect(part(host, 'rail')).not.toBeNull()
    expect(part(host, 'marker')).not.toBeNull()
    expect(part(host, 'connector')).toBeNull()
  })
})

/* A timeline of recent events had to write "3 hours ago" itself, and the words
   stayed as they were drawn for as long as the page was open. */
describe('a relative time', () => {
  /* A fake clock set as the timers capability, which the entry's clock runs
     on, with `Date.now` following it. */
  const realNow = Date.now
  const heldTimers = timers()
  let clock: FakeTimers
  const reading = (element: HTMLElement): string =>
    part(element, 'time')?.querySelector('slot')?.textContent?.trim() ?? ''

  /* Set by each test that reads it, and not in a `beforeEach`: the browser
     harness runs a bundle's `beforeEach` before every test in the bundle,
     and a fake clock left there stopped the composer's typing timeout. */
  const stop = (): void => {
    clock = fakeTimers(realNow())
    setTimers(clock)
    Date.now = () => clock.wall()
  }

  afterEach(() => {
    Date.now = realNow
    setTimers(heldTimers)
  })

  test('is written from datetime where nothing is slotted, and moves on as it goes stale', async () => {
    stop()
    const said = Date.now() - 80_000
    const element = await entry(
      `lang="en" relative datetime="${new Date(said).toISOString()}"`,
      'Shipped',
    )
    expect(part(element, 'time')?.tagName).toBe('TIME')
    expect(reading(element)).toBe('1 minute ago')
    expect(clock.pending().timeouts).toBeGreaterThan(0)
    clock.advance(45_000)
    await (element as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
    expect(reading(element)).toBe('2 minutes ago')
  })

  test('takes the style it is given, and none without relative', async () => {
    const at = new Date(Date.now() - 3 * 3_600_000).toISOString()
    expect(reading(await entry(`lang="en" relative="narrow" datetime="${at}"`, 'Shipped'))).toBe(
      '3h ago',
    )
    expect(reading(await entry(`lang="en" datetime="${at}"`, 'Shipped'))).toBe('')
  })

  /* "3 hours ago" said when, and never what day that was. */
  test('carries the whole date as its title, and none without relative', async () => {
    const timed = await entry('lang="en" relative datetime="2026-08-19T09:12"', 'Shipped')
    expect(part(timed, 'time')?.getAttribute('title')).toBe(
      new Intl.DateTimeFormat('en', { dateStyle: 'long', timeStyle: 'short' }).format(
        new Date('2026-08-19T09:12'),
      ),
    )
    const day = await entry('lang="en" relative datetime="2026-08-19"', 'Shipped')
    expect(part(day, 'time')?.getAttribute('title')).toBe('August 19, 2026')
    const plain = await entry('lang="en" datetime="2026-08-19T09:12"', 'Shipped')
    expect(part(plain, 'time')?.hasAttribute('title')).toBe(false)
  })

  test('an entry taken off the page stops asking', async () => {
    stop()
    const element = await entry(`relative datetime="${new Date().toISOString()}"`, 'Shipped')
    const before = clock.pending().timeouts
    element.remove()
    expect(clock.pending().timeouts).toBeLessThan(before)
  })
})
