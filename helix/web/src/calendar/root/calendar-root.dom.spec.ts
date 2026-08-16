import { beforeAll, describe, expect, test } from 'bun:test'
import { formValue, mount, part, registerDom } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Calendar = HTMLElement & {
  month: string
  value: string
  min: string
  max: string
  mode?: string
}

const calendar = async (attrs = 'month="2026-08" default-value="2026-08-14"'): Promise<Calendar> =>
  (await mount(`<helix-calendar label="Choose a date" ${attrs}></helix-calendar>`)) as Calendar

/** The cells, which is what carries a day's role, state, and tab stop. */
const days = (cal: Calendar): HTMLElement[] => [
  ...(cal.shadowRoot?.querySelectorAll<HTMLElement>('[part="cell"]') ?? []),
]

const stop = (cal: Calendar): string | null =>
  cal.shadowRoot?.querySelector('[part="cell"][tabindex="0"]')?.getAttribute('aria-label') ?? null

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
    const cal = await calendar('month="2026-01" default-value="2026-01-31"')
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
    cal.addEventListener('helix-change', (event) => {
      seen = (event as CustomEvent<{ value: string }>).detail.value
    })
    days(cal)
      .find((day) => day.getAttribute('aria-label')?.includes('August 20'))
      ?.click()
    expect(seen).toBe('2026-08-20')
    expect(cal.value).toBe('2026-08-20')
  })

  test('shows as many months as asked, with one set of controls', async () => {
    // A pair of controls per month offers several ways to make the same move
    // and leaves the reader to work out which.
    const cal = await calendar('month="2026-08" months="2"')
    expect(cal.shadowRoot?.querySelectorAll('[part="month"]')).toHaveLength(2)
    expect(cal.shadowRoot?.querySelectorAll('[part="previous"]')).toHaveLength(1)
    expect(cal.shadowRoot?.querySelectorAll('[part="next"]')).toHaveLength(1)
  })

  test('a range marks its ends and everything between them', async () => {
    const cal = await calendar('mode="range" month="2026-08" default-value="2026-08-11,2026-08-14"')
    expect(days(cal).filter((day) => day.hasAttribute('aria-selected'))).toHaveLength(4)
    expect(days(cal).filter((day) => day.hasAttribute('data-range-start'))).toHaveLength(1)
    expect(days(cal).filter((day) => day.hasAttribute('data-range-end'))).toHaveLength(1)
  })

  test('a range starts over on the third date', async () => {
    // Rather than extending, or replacing whichever end is nearer, which is a
    // guess at which one was meant.
    const cal = await calendar('mode="range" month="2026-08" default-value="2026-08-11,2026-08-14"')
    days(cal)
      .find((day) => day.getAttribute('aria-label')?.includes('August 20'))
      ?.click()
    expect(cal.value).toBe('2026-08-20')
  })

  test('multiple toggles, so a chosen date comes back out', async () => {
    const cal = await calendar(
      'mode="multiple" month="2026-08" default-value="2026-08-05,2026-08-06"',
    )
    days(cal)
      .find((day) => day.getAttribute('aria-label')?.includes('August 6'))
      ?.click()
    expect(cal.value).toBe('2026-08-05')
  })

  test('a weekday can be barred without naming every date', async () => {
    const cal = await calendar('month="2026-08" disable-days="0,6"')
    const saturday = days(cal).find((day) => day.getAttribute('aria-label')?.includes('August 15'))
    const wednesday = days(cal).find((day) => day.getAttribute('aria-label')?.includes('August 12'))
    expect(saturday?.getAttribute('aria-disabled')).toBe('true')
    expect(wednesday?.hasAttribute('aria-disabled')).toBe(false)
  })

  test('a single date can be barred by name', async () => {
    const cal = await calendar('month="2026-08" disable-dates="2026-08-17"')
    const holiday = days(cal).find((day) => day.getAttribute('aria-label')?.includes('August 17'))
    expect(holiday?.getAttribute('aria-disabled')).toBe('true')
  })

  test('a date outside the range stays in the grid and refuses selection', async () => {
    // Dropping it would leave a ragged week. It is marked instead.
    const cal = await calendar('month="2026-08" min="2026-08-10" max="2026-08-22"')
    const blocked = days(cal).find((day) => day.getAttribute('aria-label')?.includes('August 5'))
    expect(blocked?.getAttribute('aria-disabled')).toBe('true')

    let fired = false
    cal.addEventListener('helix-change', () => {
      fired = true
    })
    blocked?.click()
    expect(fired).toBe(false)
    expect(cal.value).toBe('')
  })
})

describe('calendar selection can be refused', () => {
  /* Same fault the carousel had: `value` was written and then announced, so a
     listener refusing a date was refusing one already chosen. Every other
     stateful component in the library announces first, through the helper whose
     own documentation calls itself the one audited path for this. */
  const press = (cal: Calendar, label: string): void => {
    const day = days(cal).find((one) => one.getAttribute('aria-label')?.includes(label))
    if (!day) {
      throw new Error(`the fixture no longer renders ${label}`)
    }
    day.click()
  }

  test('a listener that refuses leaves the date where it was', async () => {
    const cal = await calendar()
    cal.addEventListener('helix-change', (event) => event.preventDefault())
    press(cal, 'August 20')
    expect(cal.value).toBe('2026-08-14')
  })

  test('and one that does not still changes it', async () => {
    // The other half: a refusal that refused everything would pass the first.
    const cal = await calendar()
    press(cal, 'August 20')
    expect(cal.value).toBe('2026-08-20')
  })

  test('the announcement carries the date being proposed, not the one held', async () => {
    const cal = await calendar()
    let seen = ''
    cal.addEventListener('helix-change', (event) => {
      seen = (event as CustomEvent<{ value: string }>).detail.value
      event.preventDefault()
    })
    press(cal, 'August 20')
    expect(seen).toBe('2026-08-20')
    expect(cal.value).toBe('2026-08-14')
  })
})

describe('calendar as a form control', () => {
  /** The dates a submission would carry, in order. */
  const submitted = (cal: Calendar): string[] => {
    const reported = formValue(cal as HTMLElement)
    if (reported === null || reported === undefined) {
      return []
    }
    return [...(reported as FormData).values()].map(String)
  }

  test('one date submits one entry', async () => {
    expect(
      submitted(await calendar('name="when" month="2026-08" default-value="2026-08-14"')),
    ).toEqual(['2026-08-14'])
  })

  test('several dates submit one entry each, not a joined string', async () => {
    /* `mode="multiple"` is genuinely several answers. A server reading
       `when=2026-08-04,2026-08-06` has to know to split it on a convention this
       library invented; one entry per date is what every other multi-valued
       control on the platform sends. */
    const cal = await calendar(
      'mode="multiple" name="when" month="2026-08" value="2026-08-04,2026-08-06"',
    )
    expect(submitted(cal)).toEqual(['2026-08-04', '2026-08-06'])
  })

  test('a range submits its two the same way, in order', async () => {
    const cal = await calendar(
      'mode="range" name="when" month="2026-08" value="2026-08-11,2026-08-14"',
    )
    expect(submitted(cal)).toEqual(['2026-08-11', '2026-08-14'])
  })

  test('nothing chosen submits nothing', async () => {
    expect(formValue((await calendar('name="when" month="2026-08"')) as HTMLElement)).toBeNull()
  })

  test('no name submits nothing, which is what lets one sit inside something else', async () => {
    /* The mechanism a `DatePicker` will rest on, the same way `Select` holds
       the name and the `Listbox` in its panel does not. It has to be explicit
       here in a way it is not for a control reporting a plain string: a
       `FormData` carries its own names and its entries are appended whatever
       the element is called, so an unnamed calendar would otherwise submit
       empty-named dates. */
    expect(
      formValue((await calendar('month="2026-08" default-value="2026-08-14"')) as HTMLElement),
    ).toBeNull()
  })

  test('disabled submits nothing, whatever is chosen', async () => {
    expect(
      formValue(
        (await calendar(
          'disabled name="when" month="2026-08" default-value="2026-08-14"',
        )) as HTMLElement,
      ),
    ).toBeNull()
  })

  test('a reset returns to the date the markup declared', async () => {
    const cal = (await calendar(
      'name="when" month="2026-08" default-value="2026-08-14"',
    )) as Calendar & { formResetCallback(): void; updateComplete: Promise<boolean> }
    expect(cal.value).toBe('2026-08-14')

    cal.value = '2026-08-20'
    await cal.updateComplete
    expect(submitted(cal)).toEqual(['2026-08-20'])

    cal.formResetCallback()
    await cal.updateComplete
    expect(cal.value).toBe('2026-08-14')
    expect(submitted(cal)).toEqual(['2026-08-14'])
  })
})
