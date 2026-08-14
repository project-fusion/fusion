import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Calendar = HTMLElement & { month: string; value: string; min: string; max: string }

const calendar = async (attrs = 'month="2026-08" value="2026-08-14"'): Promise<Calendar> =>
  (await mount(`<helix-calendar label="Choose a date" ${attrs}></helix-calendar>`)) as Calendar

const days = (cal: Calendar): HTMLElement[] => [
  ...(cal.shadowRoot?.querySelectorAll<HTMLElement>('[part="day"]') ?? []),
]

const stop = (cal: Calendar): string | null =>
  cal.shadowRoot?.querySelector('[part="day"][tabindex="0"]')?.getAttribute('aria-label') ?? null

const press = async (cal: Calendar, key: string, shiftKey = false): Promise<void> => {
  cal.dispatchEvent(
    new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key, shiftKey }),
  )
  await (cal as unknown as { updateComplete: Promise<unknown> }).updateComplete
}

describe('calendar', () => {
  test('renders six weeks, so the grid keeps one height between months', async () => {
    const cal = await calendar()
    expect(days(cal)).toHaveLength(42)
  })

  test('is a grid whose selected day is the one marked', async () => {
    const cal = await calendar()
    expect(part(cal, 'grid')?.getAttribute('role')).toBe('grid')
    const selected = days(cal).filter((day) => day.hasAttribute('aria-selected'))
    expect(selected).toHaveLength(1)
    expect(selected[0]?.getAttribute('aria-label')).toContain('August 14, 2026')
  })

  test('the grid is one tab stop', async () => {
    // Arrow keys move within it, so exactly one cell is ever in the sequence.
    const cal = await calendar()
    expect(days(cal).filter((day) => day.getAttribute('tabindex') === '0')).toHaveLength(1)
  })

  test('arrows move by day and by week', async () => {
    const cal = await calendar()
    await press(cal, 'ArrowRight')
    expect(stop(cal)).toContain('August 15')
    await press(cal, 'ArrowDown')
    expect(stop(cal)).toContain('August 22')
    await press(cal, 'ArrowUp')
    expect(stop(cal)).toContain('August 15')
    await press(cal, 'ArrowLeft')
    expect(stop(cal)).toContain('August 14')
  })

  test('Home and End go to the ends of the week', async () => {
    const cal = await calendar()
    await press(cal, 'Home')
    expect(stop(cal)).toContain('August 9')
    await press(cal, 'End')
    expect(stop(cal)).toContain('August 15')
  })

  test('Page moves by month, and with Shift by a year', async () => {
    const cal = await calendar()
    await press(cal, 'PageDown')
    expect(stop(cal)).toContain('September 14, 2026')
    await press(cal, 'PageUp')
    expect(stop(cal)).toContain('August 14, 2026')
    await press(cal, 'PageDown', true)
    expect(stop(cal)).toContain('August 14, 2027')
  })

  test('a month step clamps to the shorter month', async () => {
    // Adding a month to the 31st has to land on the last day of a month with
    // fewer, rather than rolling into the one after it.
    const cal = await calendar('month="2026-01" value="2026-01-31"')
    await press(cal, 'PageDown')
    expect(stop(cal)).toContain('February 28, 2026')
  })

  test('paging a year away and back leaves the grid reachable', async () => {
    // The tab stop has to be a date the grid renders. Comparing the month
    // without its year put the stop on a date a year away, which is rendered
    // nowhere, and left the grid with no tab stop at all.
    const cal = await calendar()
    await press(cal, 'PageDown', true)
    cal.month = '2026-08'
    await (cal as unknown as { updateComplete: Promise<unknown> }).updateComplete
    expect(days(cal).filter((day) => day.getAttribute('tabindex') === '0')).toHaveLength(1)
  })

  test('the selected date holds the stop when the last focus was elsewhere', async () => {
    const cal = await calendar()
    await press(cal, 'PageDown', true)
    cal.month = '2026-01'
    cal.value = '2026-01-31'
    await (cal as unknown as { updateComplete: Promise<unknown> }).updateComplete
    expect(stop(cal)).toContain('January 31, 2026')
  })

  test('choosing a day reports it as an ISO date', async () => {
    const cal = await calendar()
    let seen = ''
    cal.addEventListener('helix-select', (event) => {
      seen = (event as CustomEvent<{ value: string }>).detail.value
    })
    days(cal)
      .find((day) => day.getAttribute('aria-label')?.includes('August 20'))
      ?.click()
    expect(seen).toBe('2026-08-20')
    expect(cal.value).toBe('2026-08-20')
  })

  test('a date outside the range stays in the grid and refuses selection', async () => {
    // Dropping it would leave a ragged week. It is marked instead.
    const cal = await calendar('month="2026-08" min="2026-08-10" max="2026-08-22"')
    const blocked = days(cal).find((day) => day.getAttribute('aria-label')?.includes('August 5'))
    expect(blocked?.getAttribute('aria-disabled')).toBe('true')

    let fired = false
    cal.addEventListener('helix-select', () => {
      fired = true
    })
    blocked?.click()
    expect(fired).toBe(false)
    expect(cal.value).toBe('')
  })
})
