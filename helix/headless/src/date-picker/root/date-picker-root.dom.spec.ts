import { beforeAll, describe, expect, test } from 'bun:test'
import { formValue, mount, part, registerDom } from '@helix-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type DatePicker = HTMLElement & {
  month: string
  value: string
  min: string
  max: string
  mode?: string
}

const calendar = async (
  attrs = 'default-month="2026-08" default-value="2026-08-14"',
): Promise<DatePicker> =>
  (await mount(
    `<helix-headless-date-picker label="Choose a date" ${attrs}></helix-headless-date-picker>`,
  )) as DatePicker

/** The cells, which is what carries a day's role, state, and tab stop. */
const days = (cal: DatePicker): HTMLElement[] => [
  ...(cal.shadowRoot?.querySelectorAll<HTMLElement>('[part="cell"]') ?? []),
]

/** Presses the forward arrow, which is the only way a reader pages. */
const next = (cal: DatePicker): void => {
  cal.shadowRoot?.querySelector<HTMLElement>('[part="next"]')?.click()
}

const stop = (cal: DatePicker): string | null =>
  cal.shadowRoot?.querySelector('[part="cell"][tabindex="0"]')?.getAttribute('aria-label') ?? null

/* From the grid, which is where a reader's presses come from.
 *
 * These were dispatched at the host, which is also where the previous and next
 * buttons live, and the handler could not tell the two apart: Enter on the
 * "next month" button was read as "choose the focused day" and then
 * `preventDefault`ed, so the month never moved. The handler asks where the
 * press came from now, and so does this. */
const press = async (cal: DatePicker, key: string, shiftKey = false): Promise<void> => {
  const grid = (cal as unknown as { renderRoot: ShadowRoot }).renderRoot.querySelector(
    '[part="grid"]',
  )
  if (!grid) {
    throw new Error('the calendar no longer renders a grid')
  }
  grid.dispatchEvent(
    new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      composed: true,
      key,
      shiftKey,
    }),
  )
  await (cal as unknown as { updateComplete: Promise<unknown> }).updateComplete
}

describe('date picker', () => {
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
    const cal = await calendar('default-month="2026-01" default-value="2026-01-31"')
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
    const cal = await calendar('default-month="2026-08" months="2"')
    expect(cal.shadowRoot?.querySelectorAll('[part="month"]')).toHaveLength(2)
    expect(cal.shadowRoot?.querySelectorAll('[part="previous"]')).toHaveLength(1)
    expect(cal.shadowRoot?.querySelectorAll('[part="next"]')).toHaveLength(1)
  })

  test('a range marks its ends and everything between them', async () => {
    const cal = await calendar(
      'mode="range" default-month="2026-08" default-value="2026-08-11,2026-08-14"',
    )
    expect(days(cal).filter((day) => day.hasAttribute('aria-selected'))).toHaveLength(4)
    expect(days(cal).filter((day) => day.hasAttribute('data-range-start'))).toHaveLength(1)
    expect(days(cal).filter((day) => day.hasAttribute('data-range-end'))).toHaveLength(1)
  })

  test('a range starts over on the third date', async () => {
    // Rather than extending, or replacing whichever end is nearer, which is a
    // guess at which one was meant.
    const cal = await calendar(
      'mode="range" default-month="2026-08" default-value="2026-08-11,2026-08-14"',
    )
    days(cal)
      .find((day) => day.getAttribute('aria-label')?.includes('August 20'))
      ?.click()
    expect(cal.value).toBe('2026-08-20')
  })

  test('multiple toggles, so a chosen date comes back out', async () => {
    const cal = await calendar(
      'mode="multiple" default-month="2026-08" default-value="2026-08-05,2026-08-06"',
    )
    days(cal)
      .find((day) => day.getAttribute('aria-label')?.includes('August 6'))
      ?.click()
    expect(cal.value).toBe('2026-08-05')
  })

  test('a weekday can be barred without naming every date', async () => {
    const cal = await calendar('default-month="2026-08" disable-days="0,6"')
    const saturday = days(cal).find((day) => day.getAttribute('aria-label')?.includes('August 15'))
    const wednesday = days(cal).find((day) => day.getAttribute('aria-label')?.includes('August 12'))
    expect(saturday?.getAttribute('aria-disabled')).toBe('true')
    expect(wednesday?.hasAttribute('aria-disabled')).toBe(false)
  })

  test('a single date can be barred by name', async () => {
    const cal = await calendar('default-month="2026-08" disable-dates="2026-08-17"')
    const holiday = days(cal).find((day) => day.getAttribute('aria-label')?.includes('August 17'))
    expect(holiday?.getAttribute('aria-disabled')).toBe('true')
  })

  test('a date outside the range stays in the grid and refuses selection', async () => {
    // Dropping it would leave a ragged week. It is marked instead.
    const cal = await calendar('default-month="2026-08" min="2026-08-10" max="2026-08-22"')
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

describe('date picker selection can be refused', () => {
  /* Same fault the carousel had: `value` was written and then announced, so a
     listener refusing a date was refusing one already chosen. Every other
     stateful component in the library announces first, through the helper whose
     own documentation calls itself the one audited path for this. */
  const press = (cal: DatePicker, label: string): void => {
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

describe('date picker as a form control', () => {
  /** The dates a submission would carry, in order. */
  const submitted = (cal: DatePicker): string[] => {
    const reported = formValue(cal as HTMLElement)
    if (reported === null || reported === undefined) {
      return []
    }
    return [...(reported as FormData).values()].map(String)
  }

  test('one date submits one entry', async () => {
    expect(
      submitted(await calendar('name="when" default-month="2026-08" default-value="2026-08-14"')),
    ).toEqual(['2026-08-14'])
  })

  test('several dates submit one entry each, not a joined string', async () => {
    /* `mode="multiple"` is genuinely several answers. A server reading
       `when=2026-08-04,2026-08-06` has to know to split it on a convention this
       library invented; one entry per date is what every other multi-valued
       control on the platform sends. */
    const cal = await calendar(
      'mode="multiple" name="when" default-month="2026-08" value="2026-08-04,2026-08-06"',
    )
    expect(submitted(cal)).toEqual(['2026-08-04', '2026-08-06'])
  })

  test('a range submits its two the same way, in order', async () => {
    const cal = await calendar(
      'mode="range" name="when" default-month="2026-08" value="2026-08-11,2026-08-14"',
    )
    expect(submitted(cal)).toEqual(['2026-08-11', '2026-08-14'])
  })

  test('nothing chosen submits nothing', async () => {
    expect(
      formValue((await calendar('name="when" default-month="2026-08"')) as HTMLElement),
    ).toBeNull()
  })

  test('no name submits nothing, which is what lets one sit inside something else', async () => {
    /* The mechanism a `DatePicker` will rest on, the same way `Select` holds
       the name and the `Listbox` in its panel does not. It has to be explicit
       here in a way it is not for a control reporting a plain string: a
       `FormData` carries its own names and its entries are appended whatever
       the element is called, so an unnamed calendar would otherwise submit
       empty-named dates. */
    expect(
      formValue(
        (await calendar('default-month="2026-08" default-value="2026-08-14"')) as HTMLElement,
      ),
    ).toBeNull()
  })

  test('disabled submits nothing, whatever is chosen', async () => {
    expect(
      formValue(
        (await calendar(
          'disabled name="when" default-month="2026-08" default-value="2026-08-14"',
        )) as HTMLElement,
      ),
    ).toBeNull()
  })

  test('a reset returns to the date the markup declared', async () => {
    const cal = (await calendar(
      'name="when" default-month="2026-08" default-value="2026-08-14"',
    )) as DatePicker & { formResetCallback(): void; updateComplete: Promise<boolean> }
    expect(cal.value).toBe('2026-08-14')

    cal.value = '2026-08-20'
    await cal.updateComplete
    expect(submitted(cal)).toEqual(['2026-08-20'])

    cal.formResetCallback()
    await cal.updateComplete
    expect(cal.value).toBe('2026-08-14')
    expect(submitted(cal)).toEqual(['2026-08-14'])
  })

  test('paging is announced, and refusing it leaves the month where it was', async () => {
    const cal = await calendar()
    cal.addEventListener('helix-navigate', (event) => event.preventDefault())
    next(cal)
    await (cal as DatePicker & { updateComplete: Promise<boolean> }).updateComplete
    expect(cal.month).toBe('2026-08')
  })

  test('the event names the month it would move to, not the one it is on', async () => {
    const cal = await calendar()
    let announced = ''
    cal.addEventListener('helix-navigate', (event) => {
      announced = (event as CustomEvent<{ value: string }>).detail.value
    })
    next(cal)
    expect(announced).toBe('2026-09')
  })

  test("a declared month is the consumer's, and the arrows only ask", async () => {
    /* The reason this is worth a spec of its own. `month` said in its own
       documentation that a consumer could drive the view, and the calendar
       wrote it on every page, so a consumer holding it in state was overwritten
       and never told which way to put it back. */
    const cal = await calendar('month="2026-08" default-value="2026-08-14"')
    let announced = ''
    cal.addEventListener('helix-navigate', (event) => {
      announced = (event as CustomEvent<{ value: string }>).detail.value
    })
    next(cal)
    await (cal as DatePicker & { updateComplete: Promise<boolean> }).updateComplete
    expect(announced).toBe('2026-09')
    expect(cal.month).toBe('2026-08')

    // And the consumer moving it is what moves it.
    cal.month = '2026-09'
    await (cal as DatePicker & { updateComplete: Promise<boolean> }).updateComplete
    expect(cal.month).toBe('2026-09')
  })

  test("a month nobody declared is the calendar's, and the arrows move it", async () => {
    const cal = await calendar()
    next(cal)
    await (cal as DatePicker & { updateComplete: Promise<boolean> }).updateComplete
    expect(cal.month).toBe('2026-09')
  })
})

describe('a day from a neighbouring month is filler', () => {
  const outside = (cal: DatePicker): HTMLElement[] =>
    days(cal).filter((one) => one.hasAttribute('data-outside'))

  test('clicking one chooses nothing', async () => {
    const cal = await calendar('default-month="2026-08"')
    const filler = outside(cal)[0] as HTMLElement
    expect(filler).toBeDefined()
    filler.click()
    await (cal as unknown as { updateComplete: Promise<unknown> }).updateComplete
    expect(cal.value).toBe('')
  })

  test('and a range never draws its end twice, which is what months="2" showed', async () => {
    /* September the 5th is a trailing cell in August's grid and a real cell in
       September's. Both used to carry the terminus, so one answer was two dark
       chips on the page. Asserted by counting, because the bug is the count. */
    const cal = await calendar('default-month="2026-08" months="2" mode="range"')
    ;(cal as unknown as { value: string }).value = '2026-08-19,2026-09-05'
    await (cal as unknown as { updateComplete: Promise<unknown> }).updateComplete

    const marked = (name: string): number =>
      days(cal).filter((one) => one.hasAttribute(name)).length
    expect(marked('data-range-start')).toBe(1)
    expect(marked('data-range-end')).toBe(1)

    // And no filler cell carries any of the range's state.
    for (const filler of outside(cal)) {
      expect(filler.hasAttribute('data-range-start')).toBe(false)
      expect(filler.hasAttribute('data-range-middle')).toBe(false)
      expect(filler.hasAttribute('data-range-end')).toBe(false)
      expect(filler.hasAttribute('aria-selected')).toBe(false)
    }
  })
})

describe('an invalid calendar says so where it can be heard', () => {
  const internals = (host: HTMLElement): ElementInternals =>
    (host as unknown as { internals: ElementInternals }).internals

  test('through internals, not an attribute the consumer never wrote', async () => {
    const cal = await calendar('default-month="2026-08" invalid')
    await (cal as unknown as { updateComplete: Promise<unknown> }).updateComplete
    expect(internals(cal).ariaInvalid).toBe('true')
  })

  test('and the grid says when there is no day to mark', async () => {
    /* `required` and unanswered is the commonest way a picker is invalid, and
       there is no chosen day to ring. The tier below writes the state because
       `:host(:not(:has(...)))` is invalid CSS and would be dropped at parse
       time, so the styled tier cannot ask this question itself. */
    const empty = await calendar('default-month="2026-08"')
    await (empty as unknown as { updateComplete: Promise<unknown> }).updateComplete
    expect(empty.shadowRoot?.querySelector('[part="grid"]')?.hasAttribute('data-unset')).toBe(true)

    const chosen = await calendar('default-month="2026-08" default-value="2026-08-14"')
    await (chosen as unknown as { updateComplete: Promise<unknown> }).updateComplete
    expect(chosen.shadowRoot?.querySelector('[part="grid"]')?.hasAttribute('data-unset')).toBe(
      false,
    )
  })
})
