import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import {
  formValue,
  hasLayout,
  hasState,
  mount,
  part,
  registerDom,
  slotted,
} from '@fusion.dev/helix-testing/dom'

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
  ...(cal.shadowRoot?.querySelectorAll<HTMLElement>('[part~="cell"]') ?? []),
]

/** Presses the forward arrow, which is the only way a reader pages. */
const next = (cal: DatePicker): void => {
  cal.shadowRoot?.querySelector<HTMLElement>('[part="next"]')?.click()
}

const stop = (cal: DatePicker): string | null =>
  cal.shadowRoot?.querySelector('[part~="cell"][tabindex="0"]')?.getAttribute('aria-label') ?? null

/* From the grid, which is where a reader's presses come from.
 *
 * Dispatched at the host instead, a press is indistinguishable from one on the
 * previous and next buttons that live there too: Enter on "next month" reads as
 * "choose the focused day" and is then `preventDefault`ed, so the month never
 * moves. The handler asks where the press came from, and so does this. */
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

  /* Measured before this: with no value the stop sat on the 1st of the
     month, where the APG date picker and React Aria put it on today. */
  test('with nothing chosen, the stop is on today, and on the 1st of a month without it', async () => {
    const today = new Date()
    const named = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'long' }).format(today)
    expect(stop(await calendar('locale="en-US"'))).toContain(named)
    expect(stop(await calendar('locale="en-US" default-month="2001-03"'))).toContain('March 1')
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

  /* The week runs from the right on a right-to-left page, so the left arrow
     points at tomorrow. It went to yesterday, the cell to its right. Home and
     End and the page keys are about the week and the month, not a side, and
     keep their meaning. */
  describe('on a right-to-left page', () => {
    afterEach(() => {
      document.documentElement.removeAttribute('dir')
    })

    test('the left arrow is the next day and the right the day before', async () => {
      document.documentElement.dir = 'rtl'
      const cal = await calendar()
      await press(cal, 'ArrowLeft')
      expect(stop(cal)).toContain('August 15')
      await press(cal, 'ArrowRight')
      await press(cal, 'ArrowRight')
      expect(stop(cal)).toContain('August 13')
    })

    test('while Home, End and the page keys mean what they did', async () => {
      document.documentElement.dir = 'rtl'
      const cal = await calendar()
      await press(cal, 'Home')
      expect(stop(cal)).toContain('August 9')
      await press(cal, 'End')
      expect(stop(cal)).toContain('August 15')
      await press(cal, 'PageDown')
      expect(stop(cal)).toContain('September 15')
    })
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
    cal.addEventListener('helix-before-change', (event) => {
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

  test('and says so in part names: the band on the cells, the solid mark on the two ends', async () => {
    const cal = await calendar(
      'mode="range" default-month="2026-08" default-value="2026-08-11,2026-08-14"',
    )
    const named = (name: string): string[] =>
      [...(cal.shadowRoot?.querySelectorAll(`[part~="${name}"]`) ?? [])].map(
        (one) => one.textContent?.trim() ?? '',
      )
    expect(named('cell-range-start')).toEqual(['11'])
    expect(named('cell-range-middle')).toEqual(['12', '13'])
    expect(named('cell-range-end')).toEqual(['14'])
    expect(named('day-selected')).toEqual(['11', '14'])
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
    cal.addEventListener('helix-before-change', () => {
      fired = true
    })
    blocked?.click()
    expect(fired).toBe(false)
    expect(cal.value).toBe('')
  })
})

describe('date picker selection can be refused', () => {
  /* `value` written and then announced leaves a listener refusing a date it
     already holds. Announce first, as every other stateful component does. */
  const press = (cal: DatePicker, label: string): void => {
    const day = days(cal).find((one) => one.getAttribute('aria-label')?.includes(label))
    if (!day) {
      throw new Error(`the fixture no longer renders ${label}`)
    }
    day.click()
  }

  test('a listener that refuses leaves the date where it was', async () => {
    const cal = await calendar()
    cal.addEventListener('helix-before-change', (event) => event.preventDefault())
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
    cal.addEventListener('helix-before-change', (event) => {
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
    cal.addEventListener('helix-before-navigate', (event) => event.preventDefault())
    next(cal)
    await (cal as DatePicker & { updateComplete: Promise<boolean> }).updateComplete
    expect(cal.month).toBe('2026-08')
  })

  test('the event names the month it would move to, not the one it is on', async () => {
    const cal = await calendar()
    let announced = ''
    cal.addEventListener('helix-before-navigate', (event) => {
      announced = (event as CustomEvent<{ value: string }>).detail.value
    })
    next(cal)
    expect(announced).toBe('2026-09')
  })

  test('helix-navigate follows once the month has moved, and not for a refused one', async () => {
    const cal = await calendar()
    const heard: string[] = []
    cal.addEventListener('helix-navigate', (event) => {
      heard.push(`${(event as CustomEvent<{ value: string }>).detail.value}@${cal.month}`)
    })
    next(cal)
    await (cal as DatePicker & { updateComplete: Promise<boolean> }).updateComplete
    cal.addEventListener('helix-before-navigate', (event) => event.preventDefault())
    next(cal)
    await (cal as DatePicker & { updateComplete: Promise<boolean> }).updateComplete
    expect(heard).toEqual(['2026-09@2026-09'])
  })

  test('a declared month is a seed, and the arrows still move it', async () => {
    /* `month` says a consumer can drive the view, so a calendar writing it on
       every page would overwrite a consumer holding it in state and never tell
       them which way to put it back. */
    const cal = await calendar('month="2026-08" default-value="2026-08-14"')
    let announced = ''
    cal.addEventListener('helix-before-navigate', (event) => {
      announced = (event as CustomEvent<{ value: string }>).detail.value
    })
    next(cal)
    await (cal as DatePicker & { updateComplete: Promise<boolean> }).updateComplete
    expect(announced).toBe('2026-09')
    expect(cal.month).toBe('2026-09')

    // And the consumer may still correct it.
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

describe('a day from a neighboring month is filler', () => {
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
       September's, so a terminus on both draws two dark chips for one answer.
       Asserted by counting, because the fault is the count. */
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

  describe('the marks on the month controls', () => {
    test('the caret is a fallback, so a page can hand over its own icon set', async () => {
      const host = await mount(
        '<helix-headless-date-picker default-month="2026-08"><span slot="previous-icon">back</span><span slot="next-icon">on</span></helix-headless-date-picker>',
      )
      await (host as unknown as { updateComplete: Promise<unknown> }).updateComplete
      expect(slotted(host, 'previous-icon').length).toBe(1)
      expect(slotted(host, 'next-icon').length).toBe(1)
    })

    test('and draws its own where nothing is handed over', async () => {
      const host = await calendar('default-month="2026-08"')
      await (host as unknown as { updateComplete: Promise<unknown> }).updateComplete
      expect(slotted(host, 'previous-icon').length).toBe(0)
      expect(part(host, 'previous-mark')).not.toBeNull()
      expect(part(host, 'next-mark')).not.toBeNull()
    })

    test('a run of months carries one of each, not one per month', async () => {
      /* A second `<slot name="previous-icon">` in the same root is assigned
         nothing, so a duplicate would leave a calendar with an unreplaced mark
         and no error. The controls are drawn on the first month and the last,
         which is what keeps the names unique. */
      const host = await calendar('default-month="2026-08" months="2"')
      await (host as unknown as { updateComplete: Promise<unknown> }).updateComplete
      for (const name of ['previous-icon', 'next-icon']) {
        expect(host.shadowRoot?.querySelectorAll(`slot[name="${name}"]`).length).toBe(1)
      }
    })
  })
})

describe('a date picker drawn from outside', () => {
  /* Each state the grid draws is also a part name on the box it is drawn on,
     because nothing can follow `::part()` with `[aria-selected]`. */
  const named = (cal: DatePicker, name: string): string[] =>
    [...(cal.shadowRoot?.querySelectorAll(`[part~="${name}"]`) ?? [])].map(
      (one) => one.textContent?.trim() ?? '',
    )

  test('the chosen day is a part of its own, and moves when the choice does', async () => {
    const cal = (await calendar()) as DatePicker & { updateComplete: Promise<unknown> }
    expect(named(cal, 'day-selected')).toEqual(['14'])
    cal.value = '2026-08-20'
    await cal.updateComplete
    expect(named(cal, 'day-selected')).toEqual(['20'])
  })

  test('a neighboring month’s days and a barred day say so', async () => {
    const cal = await calendar('default-month="2026-08" min="2026-08-03"')
    const outside = days(cal).filter((one) => one.hasAttribute('data-outside'))
    expect(named(cal, 'day-outside')).toHaveLength(outside.length)
    expect(outside.length).toBeGreaterThan(0)
    expect(named(cal, 'day-disabled')).toContain('2')
    expect(named(cal, 'day-disabled')).not.toContain('3')
  })

  test('today is a part of its own, on the one day that is today', async () => {
    const cal = await calendar('')
    const today = days(cal).filter((one) => one.hasAttribute('data-today'))
    expect(named(cal, 'day-today')).toEqual(today.map((one) => one.textContent?.trim() ?? ''))
    expect(today).toHaveLength(1)
  })
})

describe('a read-only calendar', () => {
  /* Read-only is a value a reader may take and may not change, which for a grid
     of days means every press is refused and the value stands.
   *
   * **The refusal is the whole of it, and that is worth stating.** Nothing in
   * the render changes: the days keep their tab stops, no cell is
   * `aria-disabled`, and the grid carries no `aria-readonly`, so a reader using
   * the keyboard is told nothing and finds out by pressing. The behavior is
   * asserted here because it is what exists; the silence is recorded rather
   * than asserted, since a spec cannot hold a component to something it does
   * not do. */
  test('refuses a press and keeps the value it was given', async () => {
    const cal = await calendar('default-month="2026-08" default-value="2026-08-14" readonly')
    const day = days(cal).find((one) => one.textContent?.trim() === '20') as HTMLElement
    day.click()
    await (cal as unknown as { updateComplete: Promise<unknown> }).updateComplete
    expect(cal.value).toBe('2026-08-14')
  })

  test('and the same press moves an ordinary calendar, which is the control', async () => {
    const cal = await calendar('default-month="2026-08" default-value="2026-08-14"')
    const day = days(cal).find((one) => one.textContent?.trim() === '20') as HTMLElement
    day.click()
    await (cal as unknown as { updateComplete: Promise<unknown> }).updateComplete
    expect(cal.value).toBe('2026-08-20')
  })
})

describe('a date picker brought back by the browser', () => {
  test('restores from the value it saved, not from its form data', async () => {
    /* Several dates submit as several entries, and without a state beside
       them the browser saved the form data as the state and handed it back,
       where the value is split as a string and threw. */
    const form = await mount(
      '<form><helix-headless-date-picker name="d" value="2026-08-04"></helix-headless-date-picker></form>',
    )
    const picker = form.firstElementChild as HTMLElement & {
      formStateRestoreCallback(state: unknown, mode: string): void
      updateComplete: Promise<boolean>
      value: string
    }
    await picker.updateComplete
    picker.formStateRestoreCallback(formValue(picker), 'restore')
    await picker.updateComplete
    expect(typeof picker.value).toBe('string')
  })
})

describe("a date picker in the page's words", () => {
  test('its required and unreadable sentences are properties', async () => {
    const empty = (await mount(
      '<helix-headless-date-picker required value-missing-message="Choisissez une date."></helix-headless-date-picker>',
    )) as HTMLElement & { internals: ElementInternals; updateComplete: Promise<boolean> }
    await empty.updateComplete
    expect(empty.internals.validationMessage).toBe('Choisissez une date.')
    const wrong = (await mount(
      '<helix-headless-date-picker value="not-a-date" bad-input-message="Pas une date."></helix-headless-date-picker>',
    )) as HTMLElement & { internals: ElementInternals; updateComplete: Promise<boolean> }
    await wrong.updateComplete
    expect(wrong.internals.validationMessage).toBe('Pas une date.')
  })
})

describe('a date picker in a disabled fieldset', () => {
  /* Measured before this: the handlers read `disabled`, the control's own
     attribute, so inside `<fieldset disabled>` Enter chose a day and Next moved
     the month. */
  test('takes no key, no press and no tab stop', async () => {
    document.body.innerHTML = `<fieldset disabled><helix-headless-date-picker
      default-month="2026-08" default-value="2026-08-14"></helix-headless-date-picker></fieldset>`
    const cal = document.querySelector('helix-headless-date-picker') as DatePicker & {
      formDisabledCallback(disabled: boolean): void
      updateComplete: Promise<unknown>
    }
    // happy-dom does not run the fieldset's half, so it is called as a browser would.
    cal.formDisabledCallback(true)
    await cal.updateComplete
    await press(cal, 'ArrowRight')
    await press(cal, 'Enter')
    expect(cal.value).toBe('2026-08-14')
    expect(stop(cal)).toBeNull()
    expect(cal.shadowRoot?.querySelector('[part="next"]')?.hasAttribute('disabled')).toBe(true)
  })
})

describe('the bounds of a date picker', () => {
  type Checked = DatePicker & {
    internals: ElementInternals
    updateComplete: Promise<unknown>
  }

  /* `disabled` took Next out of the tab order under the reader's focus, and
     focus fell to the page's body on the press that reached `max`. Lightbox
     keeps its controls focusable at its ends the same way. */
  test('take Previous and Next out of use at the months they end in, and keep them focusable', async () => {
    const cal = (await calendar(
      'default-month="2026-08" min="2026-08-03" max="2026-08-20"',
    )) as Checked
    for (const name of ['previous', 'next']) {
      const control = cal.shadowRoot?.querySelector<HTMLButtonElement>(`[part="${name}"]`)
      expect([name, control?.getAttribute('aria-disabled'), control?.disabled]).toEqual([
        name,
        'true',
        false,
      ])
      control?.click()
      await cal.updateComplete
      expect(cal.month).toBe('2026-08')
    }
  })

  test('and the press that reaches the last month keeps focus where it was', async () => {
    const cal = (await calendar('default-month="2026-07" max="2026-08-20"')) as Checked
    const forward = cal.shadowRoot?.querySelector<HTMLButtonElement>('[part="next"]')
    forward?.focus()
    forward?.click()
    await cal.updateComplete
    expect(cal.month).toBe('2026-08')
    expect(forward?.disabled).toBe(false)
    expect(forward?.getAttribute('aria-disabled')).toBe('true')
    expect(cal.shadowRoot?.activeElement).toBe(forward ?? null)
  })

  test('stop the keys, so a reader cannot page into a month with nothing in it', async () => {
    // Measured before this: Shift+PageDown reached a September a year past `max`.
    const cal = await calendar(
      'default-month="2026-08" default-value="2026-08-14" min="2026-08-03" max="2026-09-20"',
    )
    await press(cal, 'PageDown', true)
    expect(cal.month).toBe('2026-09')
    expect(stop(cal)).toContain('September 20, 2026')
  })

  test('make a value outside them invalid, with the bound it is past', async () => {
    const early = (await calendar('min="2026-01-01" default-value="2020-01-01"')) as Checked
    await early.updateComplete
    expect(early.internals.validity.rangeUnderflow).toBe(true)
    const late = (await calendar(
      'max="2026-01-01" default-value="2026-03-01" range-overflow-message="Too late: {max}"',
    )) as Checked
    await late.updateComplete
    expect(late.internals.validity.rangeOverflow).toBe(true)
    expect(late.internals.validationMessage.startsWith('Too late: ')).toBe(true)
  })

  /* Date Input reported a range ending before it starts, and a calendar
     handed the same pair from a script reported it valid. */
  test('make a range that ends before it starts invalid, as Date Input does', async () => {
    const backward = (await calendar(
      'mode="range" default-value="2026-06-03,2026-05-09" locale="en-US"',
    )) as Checked
    await backward.updateComplete
    expect(backward.internals.validity.rangeUnderflow).toBe(true)
    expect(backward.internals.validationMessage).toBe('Choose an end on or after June 3, 2026.')
    const forward = (await calendar(
      'mode="range" default-value="2026-05-09,2026-06-03"',
    )) as Checked
    await forward.updateComplete
    expect(forward.internals.validity.valid).toBe(true)
  })

  test('and a barred day or one off the step invalid too', async () => {
    const barred = (await calendar(
      'disable-dates="2026-08-12" default-value="2026-08-12"',
    )) as Checked
    await barred.updateComplete
    expect(barred.internals.validity.valid).toBe(false)
    const off = (await calendar('min="2026-08-03" step="7" default-value="2026-08-04"')) as Checked
    await off.updateComplete
    expect(off.internals.validity.stepMismatch).toBe(true)
  })
})

describe('the lists a date picker is given', () => {
  // Every other list a consumer writes takes spaces as well as commas.
  test('are split on spaces as well as commas', async () => {
    const cal = await calendar('default-month="2026-08" disable-days="0 6"')
    const saturday = days(cal).find((day) => day.getAttribute('aria-label')?.includes('August 15'))
    expect(saturday?.getAttribute('aria-disabled')).toBe('true')
  })
})

describe('what a date picker tells a screen reader', () => {
  test('the month heading is a live region, so paging is heard', async () => {
    const cal = await calendar()
    expect(cal.shadowRoot?.querySelector('[part="heading"]')?.getAttribute('aria-live')).toBe(
      'polite',
    )
  })

  test('a day from a neighboring month is unavailable, since it takes no press', async () => {
    const cal = await calendar('default-month="2026-08"')
    const filler = days(cal).find((one) => one.hasAttribute('data-outside'))
    expect(filler?.getAttribute('aria-disabled')).toBe('true')
  })
})

describe('where the tab stop goes', () => {
  /* Measured before this: after a date was typed into Date Input, Tab into the
     grid landed on the day picked before, while the selected day was another. */
  test('to the selected day when the value moves from outside', async () => {
    const cal = (await calendar('default-month="2026-08"')) as DatePicker & {
      updateComplete: Promise<unknown>
    }
    days(cal)
      .find((day) => day.getAttribute('aria-label')?.includes('August 20'))
      ?.click()
    await cal.updateComplete
    cal.value = '2026-08-05'
    await cal.updateComplete
    expect(stop(cal)).toContain('August 5, 2026')
  })

  /* Measured before this: with `min` past the first of the month, Tab into the
     grid landed on the first, which is unavailable. */
  test('to the first day that can be chosen, in either mode', async () => {
    const range = await calendar('mode="range" default-month="2026-03-01" min="2026-03-03"')
    expect(stop(range)).toBe('Tuesday, March 3, 2026')
    const single = await calendar(
      'default-month="2026-08" min="2026-08-10" disable-dates="2026-08-10"',
    )
    expect(stop(single)).toBe('Tuesday, August 11, 2026')
  })
})

describe('the first day of the week', () => {
  const firstHeader = (cal: DatePicker): string =>
    cal.shadowRoot?.querySelector('[part="weekday"]')?.textContent?.trim() ?? ''

  test('follows `locale` where nothing sets it', async () => {
    const supported = typeof (new Intl.Locale('de-DE') as { getWeekInfo?: unknown }).getWeekInfo
    const cal = await calendar('default-month="2026-08" locale="en-GB"')
    if (supported === 'function') {
      expect(firstHeader(cal)).toBe('Mon')
    }
    const us = await calendar('default-month="2026-08" locale="en-US"')
    expect(firstHeader(us)).toBe('Sun')
  })

  test('and `first-day-of-week` still wins', async () => {
    const cal = await calendar('default-month="2026-08" locale="en-GB" first-day-of-week="0"')
    expect(firstHeader(cal)).toBe('Sun')
  })
})

describe('a read-only grid', () => {
  test('says so, so a reader knows the dates cannot be changed', async () => {
    const cal = await calendar('readonly default-month="2026-08"')
    expect(cal.shadowRoot?.querySelector('[part="grid"]')?.getAttribute('aria-readonly')).toBe(
      'true',
    )
  })
})

/* Only in a real engine, which gives a form-associated host its labels and
   reflects element references. The group was named "Date Picker" whatever the
   page's `<label for>` said. */
if (hasLayout()) {
  describe('a date picker a page labels', () => {
    test('is a group named by that label', async () => {
      const label = await mount(
        '<label for="due">Due</label><helix-headless-date-picker id="due"></helix-headless-date-picker>',
      )
      const picker = label.parentElement?.querySelector(
        'helix-headless-date-picker',
      ) as unknown as HTMLElement & {
        internals: ElementInternals
        updateComplete: Promise<unknown>
      }
      await picker.updateComplete
      const names = (picker.internals as ElementInternals & { ariaLabelledByElements: Element[] })
        .ariaLabelledByElements
      expect(names.map((one) => one.textContent)).toEqual(['Due'])
    })
  })
}

describe('a rule and a drawing for each day', () => {
  /* React Aria takes isDateUnavailable and cell children; Helix took lists of
     dates and weekdays and drew the number alone. */
  test('isDateUnavailable bars the dates it refuses, in the grid and the verdict', async () => {
    const cal = (await calendar('default-month="2026-08"')) as DatePicker & {
      isDateUnavailable?: (date: string) => boolean
      updateComplete: Promise<unknown>
      internals: ElementInternals
    }
    cal.isDateUnavailable = (date) => date.endsWith('-13')
    await cal.updateComplete
    const thirteenth = days(cal).find((day) =>
      day.getAttribute('aria-label')?.includes('August 13'),
    )
    expect(thirteenth?.getAttribute('aria-disabled')).toBe('true')
    cal.value = '2026-08-13'
    await cal.updateComplete
    expect(cal.internals.validity.badInput).toBe(true)
  })

  test('dayContent draws what each day shows, and the cell is still named by its date', async () => {
    const cal = (await calendar('default-month="2026-08"')) as DatePicker & {
      dayContent?: (date: string) => unknown
      updateComplete: Promise<unknown>
    }
    cal.dayContent = (date) => `${Number(date.slice(8))}·$`
    await cal.updateComplete
    const fourth = days(cal).find((day) => day.getAttribute('aria-label')?.includes('August 4'))
    expect(fourth?.querySelector('[part~="day"]')?.textContent?.trim()).toBe('4·$')
  })
})

describe('the months and the years', () => {
  /* A birth date forty years back was four hundred and eighty presses of
     Previous; Zag's picker steps back to the months and the years. */
  type Viewing = DatePicker & { updateComplete: Promise<unknown>; view: string }
  const root = (cal: DatePicker): ShadowRoot =>
    (cal as unknown as { renderRoot: ShadowRoot }).renderRoot
  const periods = (cal: DatePicker): HTMLElement[] => [
    ...root(cal).querySelectorAll<HTMLElement>('[part~="period"]'),
  ]
  const key = async (cal: Viewing, name: string): Promise<void> => {
    root(cal)
      .querySelector('[part="periods"]')
      ?.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          composed: true,
          key: name,
        }),
      )
    await cal.updateComplete
  }

  test('the heading is text until max-view asks for more', async () => {
    const plain = await calendar()
    expect(root(plain).querySelector('[part="heading-button"]')).toBeNull()
    const stepping = await calendar('default-month="2026-08" max-view="year"')
    expect(
      root(stepping).querySelector('[part="heading-button"]')?.getAttribute('aria-label'),
    ).toBe('August 2026. Choose a month')
  })

  test('the heading shows the months, and a month shows its days', async () => {
    const cal = (await calendar('default-month="2026-08" max-view="month"')) as Viewing
    const moved: string[] = []
    cal.addEventListener('helix-before-navigate', (event) => {
      moved.push((event as CustomEvent<{ value: string }>).detail.value)
    })
    root(cal).querySelector<HTMLElement>('[part="heading-button"]')?.click()
    await cal.updateComplete
    expect(cal.view).toBe('month')
    expect(periods(cal)).toHaveLength(12)
    expect(periods(cal).find((one) => one.getAttribute('tabindex') === '0')?.textContent).toBe(
      'Aug',
    )
    expect(root(cal).querySelector('[part="heading-button"]')).toBeNull()
    periods(cal)[2]?.click()
    await cal.updateComplete
    expect(cal.view).toBe('day')
    expect(cal.month).toBe('2026-03')
    expect(moved).toEqual(['2026-03'])
  })

  test('the keys move through the months and into the next year, and Escape goes back', async () => {
    const cal = (await calendar('default-month="2026-11" view="month"')) as Viewing
    await key(cal, 'ArrowDown')
    const stop = (): string | undefined =>
      periods(cal)
        .find((one) => one.getAttribute('tabindex') === '0')
        ?.getAttribute('aria-label') ?? undefined
    expect(stop()).toBe('Feb 2027')
    await key(cal, 'Home')
    expect(stop()).toBe('Jan 2027')
    let escaped = 0
    document.addEventListener(
      'keydown',
      () => {
        escaped += 1
      },
      { once: true },
    )
    await key(cal, 'Escape')
    expect(cal.view).toBe('day')
    expect(escaped).toBe(0)
  })

  test('the years show a page of twelve, and a year shows its months', async () => {
    const cal = (await calendar('default-month="2026-08" max-view="year" view="month"')) as Viewing
    root(cal).querySelector<HTMLElement>('[part="heading-button"]')?.click()
    await cal.updateComplete
    expect(cal.view).toBe('year')
    expect(periods(cal).map((one) => one.textContent)).toEqual(
      Array.from({ length: 12 }, (_, at) => String(2016 + at)),
    )
    root(cal).querySelector<HTMLElement>('[part="previous"]')?.click()
    await cal.updateComplete
    expect(periods(cal)[0]?.textContent).toBe('2004')
    periods(cal)[0]?.click()
    await cal.updateComplete
    expect(cal.view).toBe('month')
    expect(root(cal).querySelector('[part="periods"]')?.getAttribute('aria-label')).toBe('2004')
  })

  test('a year chosen keeps the month in view, or the nearest month the bounds allow', async () => {
    const focused = (cal: Viewing): string | null | undefined =>
      periods(cal)
        .find((one) => one.getAttribute('tabindex') === '0')
        ?.getAttribute('aria-label')
    const cal = (await calendar('default-month="2026-08" max-view="year" view="year"')) as Viewing
    periods(cal)
      .find((one) => one.textContent === '2020')
      ?.click()
    await cal.updateComplete
    expect(cal.view).toBe('month')
    expect(focused(cal)).toBe('Aug 2020')
    const bounded = (await calendar(
      'default-month="2026-08" max-view="year" view="year" max="2027-03-15"',
    )) as Viewing
    periods(bounded)
      .find((one) => one.textContent === '2027')
      ?.click()
    await bounded.updateComplete
    expect(focused(bounded)).toBe('Mar 2027')
  })

  test('a date in year 1 is a date, shown in a month of year 1', async () => {
    const cal = (await calendar('value="0001-08-04"')) as Viewing
    expect(cal.month).toBe('0001-08')
    expect((cal as unknown as { validity: ValidityState }).validity.valid).toBe(true)
  })

  /* The year controls took the same `disabled` as the month ones and dropped
     focus the same way. */
  test('a year past the bounds leaves its control focusable and refuses a press', async () => {
    const cal = (await calendar('default-month="2026-08" view="month" max="2026-12-31"')) as Viewing
    const forward = root(cal).querySelector<HTMLButtonElement>('[part="next"]')
    expect(forward?.getAttribute('aria-disabled')).toBe('true')
    expect(forward?.disabled).toBe(false)
    forward?.click()
    await cal.updateComplete
    expect(root(cal).querySelector('[part="periods"]')?.getAttribute('aria-label')).toBe('2026')
    expect(root(cal).querySelector('[part="previous"]')?.hasAttribute('aria-disabled')).toBe(false)
  })

  test('a month outside the bounds is offered as unavailable and refuses a press', async () => {
    const cal = (await calendar('default-month="2026-08" min="2026-04-10" view="month"')) as Viewing
    expect(periods(cal)[2]?.getAttribute('aria-disabled')).toBe('true')
    expect(periods(cal)[3]?.hasAttribute('aria-disabled')).toBe(false)
    periods(cal)[2]?.click()
    await cal.updateComplete
    expect(cal.view).toBe('month')
  })
})

/** An element inside a page section written in `lang`, which names no locale of its own. */
const inLang = async <T extends HTMLElement>(lang: string, markup: string): Promise<T> => {
  document.body.innerHTML = `<div lang="${lang}">${markup}</div>`
  const element = document.body.firstElementChild?.firstElementChild as T & {
    updateComplete: Promise<unknown>
  }
  await element.updateComplete
  return element
}

describe('a date picker in a page written in another language', () => {
  /* Measured before this: inside lang="de" the calendar named its days in
     English and started its weeks on Sunday. */
  test('names its days in that language and starts the week where it does', async () => {
    const host = await inLang<DatePicker>(
      'de-DE',
      '<helix-headless-date-picker label="Datum" default-month="2026-08"></helix-headless-date-picker>',
    )
    /* August 1 2026 is a Saturday: the grid opens on Monday, July 27. */
    expect(days(host)[0]?.getAttribute('aria-label')).toContain('27. Juli 2026')
    const own = await inLang<DatePicker>(
      'de-DE',
      '<helix-headless-date-picker label="Date" locale="en-US" default-month="2026-08"></helix-headless-date-picker>',
    )
    expect(days(own)[0]?.getAttribute('aria-label')).toContain('July 26, 2026')
  })
})

describe('a date picker’s own message', () => {
  /* Measured before this: a calendar standing alone had a flag and no way to
     say why, so a form showed nothing a reader could act on. */
  test('`feedback` is shown under it, is its verdict, and marks it invalid', async () => {
    const host = (await calendar(
      'default-month="2026-08" default-value="2026-08-15" feedback="Pick a weekday"',
    )) as DatePicker & { internals: ElementInternals; validationMessage: string }
    expect(part(host, 'feedback')?.textContent).toBe('Pick a weekday')
    expect(host.validationMessage).toBe('Pick a weekday')
    expect(host.internals.ariaInvalid).toBe('true')
    expect(hasState(host, 'invalid')).toBe(true)
  })
})

describe('a date picker in a calendar other than the Gregorian', () => {
  const heading = (cal: DatePicker): string => part(cal, 'heading')?.textContent?.trim() ?? ''
  const written = (locale: string, iso: string, options: Intl.DateTimeFormatOptions): string =>
    new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' }).format(
      new Date(`${iso}T00:00:00Z`),
    )

  /* Measured before this: in fa-IR the heading read Mehr 1405 over the days of
     October 2026, and the cell showing 26 was named Mehr 4. */
  test('a calendar with months of its own is written in Gregorian, so heading and days agree', async () => {
    for (const lang of ['fa-IR', 'en-US-u-ca-islamic-umalqura', 'he-IL-u-ca-hebrew']) {
      const cal = await inLang<DatePicker>(
        lang,
        '<helix-headless-date-picker label="Date" default-month="2026-10"></helix-headless-date-picker>',
      )
      const gregorian = calendarOf(lang)
      expect(heading(cal)).toBe(
        written(gregorian, '2026-10-01', { month: 'long', year: 'numeric' }),
      )
      const sixth = days(cal).find((cell) => cell.textContent?.trim() === '6')
      expect(sixth?.getAttribute('aria-label')).toBe(
        written(gregorian, '2026-10-06', { dateStyle: 'full' }),
      )
    }
  })

  test('a calendar whose months are the Gregorian months is kept', async () => {
    const thai = await inLang<DatePicker>(
      'th-TH',
      '<helix-headless-date-picker label="Date" default-month="2026-10"></helix-headless-date-picker>',
    )
    expect(heading(thai)).toContain('2569')
    const era = await inLang<DatePicker>(
      'ja-JP-u-ca-japanese',
      '<helix-headless-date-picker label="Date" default-month="2026-10"></helix-headless-date-picker>',
    )
    expect(heading(era)).toContain('令和8年')
  })

  test('`calendar` picks one of the five, and the value stays ISO', async () => {
    const cal = (await calendar(
      'locale="en-US" calendar="buddhist" default-month="2026-10" default-value="2026-10-06"',
    )) as DatePicker & { calendar?: string; updateComplete: Promise<unknown> }
    expect(heading(cal)).toBe(
      written('en-US-u-ca-buddhist', '2026-10-01', { month: 'long', year: 'numeric' }),
    )
    expect(heading(cal)).toContain('2569')
    expect(cal.value).toBe('2026-10-06')
    cal.calendar = 'roc'
    await cal.updateComplete
    expect(heading(cal)).toContain('115')
    const thai = await inLang<DatePicker>(
      'th-TH',
      '<helix-headless-date-picker label="Date" calendar="gregory" default-month="2026-10"></helix-headless-date-picker>',
    )
    expect(heading(thai)).toContain('2026')
  })
})

/** A locale written in the Gregorian calendar. */
const calendarOf = (lang: string): string =>
  new Intl.Locale(lang, { calendar: 'gregory' }).toString()

/* React Aria names each weekday column in full, reads today in a time zone of
   your choosing, and marks the weekend; Zag's calendar takes content above and
   under the grid. */
describe('the columns, the weekend, today, and content around the calendar', () => {
  test('each weekday column shows the short name and says the full one', async () => {
    const cal = await calendar('locale="en-US" default-month="2026-08"')
    const headers = [...(cal.shadowRoot?.querySelectorAll('[part="weekday"]') ?? [])]
    expect(headers[0]?.textContent?.trim()).toBe('Sun')
    expect(headers[0]?.getAttribute('aria-label')).toBe('Sunday')
  })

  test("marks the weekend days of the calendar's language", async () => {
    const cal = await calendar('locale="en-US" default-month="2026-08"')
    const cells = days(cal).filter((cell) => !cell.hasAttribute('data-outside'))
    const weekend = cells
      .filter((cell) => cell.hasAttribute('data-weekend'))
      .map((cell) => cell.textContent?.trim())
    expect(weekend.slice(0, 2)).toEqual(['1', '2'])
    const day = cells[0]?.querySelector('[part~="day"]')
    expect(day?.getAttribute('part')).toContain('day-weekend')
  })

  test('reads today in `time-zone`', async () => {
    const cal = (await calendar('default-month="2026-08"')) as DatePicker & {
      timeZone: string
      updateComplete: Promise<unknown>
    }
    const now = new Date()
    const at = (zone: string): string =>
      new Intl.DateTimeFormat('en-CA', { timeZone: zone }).format(now)
    for (const zone of ['Pacific/Kiritimati', 'Pacific/Pago_Pago']) {
      cal.timeZone = zone
      ;(cal as unknown as { month: string }).month = at(zone).slice(0, 7)
      await cal.updateComplete
      const today = cal.shadowRoot?.querySelector('[part~="cell"][aria-current="date"]')
      expect(today?.textContent?.trim()).toBe(String(Number(at(zone).slice(8, 10))))
    }
  })

  test('takes content above and under the calendar in the header and footer slots', async () => {
    const cal = (await mount(
      '<helix-headless-date-picker label="Date" default-month="2026-08"><p slot="header">Arrival</p><button slot="footer">Today</button></helix-headless-date-picker>',
    )) as DatePicker
    expect(slotted(cal, 'header').length).toBe(1)
    expect(slotted(cal, 'footer').length).toBe(1)
  })
})

/* React Aria draws a Persian, Hebrew or Islamic calendar's own months. Here a
   calendar with months of its own was written over Gregorian months. */
describe('a date picker drawing a calendar with months of its own', () => {
  const heading = (cal: DatePicker): string => part(cal, 'heading')?.textContent?.trim() ?? ''
  const written = (calendar: string, iso: string, options: Intl.DateTimeFormatOptions): string =>
    new Intl.DateTimeFormat(`en-US-u-ca-${calendar}`, { ...options, timeZone: 'UTC' }).format(
      new Date(`${iso}T00:00:00Z`),
    )
  const inMonth = (cal: DatePicker): HTMLElement[] =>
    days(cal).filter((cell) => !cell.hasAttribute('data-outside'))

  test('draws the Persian month a date is in, numbered as that calendar numbers it', async () => {
    const cal = (await calendar(
      'locale="en-US" calendar="persian" default-value="2026-10-06"',
    )) as DatePicker & { updateComplete: Promise<unknown> }
    expect(heading(cal)).toBe(written('persian', '2026-10-06', { month: 'long', year: 'numeric' }))
    const cells = inMonth(cal)
    expect(cells.length).toBe(30)
    expect(cells[0]?.textContent?.trim()).toBe('1')
    expect(cells[0]?.getAttribute('aria-label')).toBe(
      written('persian', '2026-09-23', { dateStyle: 'full' }),
    )
    expect(
      cells.find((cell) => cell.getAttribute('aria-selected') === 'true')?.textContent?.trim(),
    ).toBe('14')
    expect(cal.month).toBe('2026-09-23')
  })

  test('pages by its months, with Next, and says the month by its first day', async () => {
    const cal = (await calendar(
      'locale="en-US" calendar="persian" default-value="2026-10-06"',
    )) as DatePicker & { updateComplete: Promise<unknown> }
    const heard: string[] = []
    cal.addEventListener('helix-before-navigate', (event) =>
      heard.push((event as CustomEvent<{ value: string }>).detail.value),
    )
    next(cal)
    await cal.updateComplete
    expect(heard).toEqual(['2026-10-23'])
    expect(heading(cal)).toBe(written('persian', '2026-10-23', { month: 'long', year: 'numeric' }))
    expect(inMonth(cal)[0]?.getAttribute('aria-label')).toBe(
      written('persian', '2026-10-23', { dateStyle: 'full' }),
    )
  })

  test('opens on the month `month` names by its first day, and draws the Hebrew leap month', async () => {
    const cal = await calendar('locale="en-US" calendar="hebrew" default-month="2027-02-08"')
    expect(heading(cal)).toBe(written('hebrew', '2027-02-08', { month: 'long', year: 'numeric' }))
    expect(heading(cal)).toContain('Adar I')
  })

  /* Measured before this: under a calendar with months of its own the
     heading stayed text, the months and years views being Gregorian only. */
  test("shows the calendar's own months and years from the heading", async () => {
    const cal = (await calendar(
      'locale="en-US" calendar="persian" max-view="year" default-month="2026-09-23"',
    )) as DatePicker & { updateComplete: Promise<unknown> }
    const periods = (): string[] =>
      [...(cal.shadowRoot?.querySelectorAll('[part~="period"]') ?? [])].map(
        (one) => one.textContent?.trim() ?? '',
      )
    ;(part(cal, 'heading-button') as HTMLElement).click()
    await cal.updateComplete
    expect(periods()).toHaveLength(12)
    expect(periods()[0]).toBe(written('persian', '2026-03-21', { month: 'short' }))
    expect(periods()[6]).toBe(written('persian', '2026-09-23', { month: 'short' }))
    expect(cal.shadowRoot?.querySelector('[part~="period-selected"]')?.textContent?.trim()).toBe(
      written('persian', '2026-09-23', { month: 'short' }),
    )
    ;(part(cal, 'heading-button') as HTMLElement).click()
    await cal.updateComplete
    expect(periods()).toContain(written('persian', '2026-09-23', { year: 'numeric' }))
    // A year, then a month, shows that month's days.
    const years = [...(cal.shadowRoot?.querySelectorAll<HTMLElement>('[part~="period"]') ?? [])]
    years
      .find(
        (one) => one.textContent?.trim() === written('persian', '2027-09-23', { year: 'numeric' }),
      )
      ?.click()
    await cal.updateComplete
    cal.shadowRoot?.querySelectorAll<HTMLElement>('[part~="period"]')[0]?.click()
    await cal.updateComplete
    expect(cal.month).toBe('2027-03-21')
    expect(heading(cal)).toBe(written('persian', '2027-03-21', { month: 'long', year: 'numeric' }))
  })

  test('draws a Hebrew leap year as thirteen months, and keys move through them', async () => {
    const cal = (await calendar(
      'locale="en-US" calendar="hebrew" max-view="month" default-month="2027-02-08"',
    )) as DatePicker & { updateComplete: Promise<unknown> }
    ;(part(cal, 'heading-button') as HTMLElement).click()
    await cal.updateComplete
    const periods = [...(cal.shadowRoot?.querySelectorAll<HTMLElement>('[part~="period"]') ?? [])]
    expect(periods).toHaveLength(13)
    expect(cal.shadowRoot?.querySelectorAll('[part="period-row"]')).toHaveLength(5)
    expect(periods.map((one) => one.textContent?.trim())).toContain('Adar II')
    const stop = (): string =>
      cal.shadowRoot?.querySelector('[part~="period"][tabindex="0"]')?.textContent?.trim() ?? ''
    expect(stop()).toBe('Adar I')
    const grid = cal.shadowRoot?.querySelector('[part="periods"]') as HTMLElement
    for (const key of ['ArrowRight', 'ArrowRight']) {
      grid.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, composed: true, key }))
      await cal.updateComplete
    }
    expect(stop()).toBe('Nisan')
    // Down from the last row goes on into the next year, which has twelve.
    for (const key of ['ArrowDown', 'ArrowDown']) {
      grid.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, composed: true, key }))
      await cal.updateComplete
    }
    expect(stop()).toBe('Tishri')
  })

  test('pages a year with Shift to the month of the same name', async () => {
    const cal = (await calendar(
      'locale="en-US" calendar="hebrew" default-month="2026-03-19" default-value="2026-03-28"',
    )) as DatePicker & { updateComplete: Promise<unknown> }
    expect(heading(cal)).toContain('Nisan')
    await press(cal, 'PageDown', true)
    await cal.updateComplete
    expect(heading(cal)).toContain('Nisan')
    expect(heading(cal)).toContain('5787')
  })

  test('and stops Previous at `min` as it does in Gregorian months', async () => {
    const cal = await calendar(
      'locale="en-US" calendar="persian" default-month="2026-09-23" min="2026-09-23"',
    )
    expect(part(cal, 'previous')?.getAttribute('aria-disabled')).toBe('true')
    const later = await calendar(
      'locale="en-US" calendar="persian" default-month="2026-09-23" min="2026-09-22"',
    )
    expect(part(later, 'previous')?.hasAttribute('aria-disabled')).toBe(false)
  })
})

describe('a calendar holding several dates', () => {
  type Live = DatePicker & {
    internals: ElementInternals
    updateComplete: Promise<unknown>
  }
  const grid = (cal: DatePicker): Element | null | undefined =>
    cal.shadowRoot?.querySelector('[part="grid"]')
  const selection = (cal: DatePicker): string =>
    cal.shadowRoot?.querySelector('[part="selection"]')?.textContent?.trim() ?? ''
  const cell = (cal: DatePicker, day: number): HTMLElement =>
    days(cal).filter((one) => !one.hasAttribute('data-outside'))[day - 1] as HTMLElement

  /* Measured before this: `mode="range"` with a week chosen drew seven cells
     with `aria-selected` in a grid without `aria-multiselectable`, and said
     nothing of a range. */
  test('says it can hold several, and which range it holds', async () => {
    const cal = await calendar(
      'locale="en-US" mode="range" default-month="2026-08" default-value="2026-08-04,2026-08-10"',
    )
    expect(grid(cal)?.getAttribute('aria-multiselectable')).toBe('true')
    expect(grid(cal)?.getAttribute('aria-describedby')).toBe('selection')
    expect(selection(cal)).toBe('Selected range: August 4, 2026 to August 10, 2026')
    const single = await calendar(
      'locale="en-US" default-month="2026-08" default-value="2026-08-14"',
    )
    expect(grid(single)?.hasAttribute('aria-multiselectable')).toBe(false)
    expect(selection(single)).toBe('Selected date: August 14, 2026')
    const several = await calendar(
      'locale="en-US" mode="multiple" default-month="2026-08" default-value="2026-08-04,2026-08-06"',
    )
    expect(grid(several)?.getAttribute('aria-multiselectable')).toBe('true')
    expect(selection(several)).toBe('2 dates selected')
  })

  test('says nothing while nothing is chosen', async () => {
    const cal = await calendar('mode="range" default-month="2026-08"')
    expect(selection(cal)).toBe('')
    expect(grid(cal)?.hasAttribute('aria-describedby')).toBe(false)
  })

  test('draws a waiting range to the day the pointer is on, before it is chosen', async () => {
    const cal = (await calendar(
      'locale="en-US" mode="range" default-month="2026-08" default-value="2026-08-04"',
    )) as Live
    expect(hasState(cal, 'range-pending')).toBe(true)
    expect(selection(cal)).toBe('Range starts August 4, 2026. Choose the day it ends.')
    cell(cal, 8).dispatchEvent(new Event('pointerenter'))
    await cal.updateComplete
    const preview = days(cal).filter((one) => one.hasAttribute('data-range-preview'))
    expect(preview).toHaveLength(5)
    expect(preview[0]?.hasAttribute('data-range-start')).toBe(true)
    expect(preview[4]?.hasAttribute('data-range-end')).toBe(true)
    // Drawn and unchosen: only the end already chosen is selected.
    expect(preview.filter((one) => one.getAttribute('aria-selected') === 'true')).toHaveLength(1)
    grid(cal)?.dispatchEvent(new Event('pointerleave'))
    await cal.updateComplete
    expect(days(cal).some((one) => one.hasAttribute('data-range-preview'))).toBe(false)
    cell(cal, 8).click()
    await cal.updateComplete
    expect(cal.value).toBe('2026-08-04,2026-08-08')
    expect(hasState(cal, 'range-pending')).toBe(false)
    expect(days(cal).some((one) => one.hasAttribute('data-range-preview'))).toBe(false)
  })

  test('and to the day the keys move to', async () => {
    const cal = (await calendar(
      'mode="range" default-month="2026-08" default-value="2026-08-04"',
    )) as Live
    await press(cal, 'ArrowRight')
    await press(cal, 'ArrowRight')
    await cal.updateComplete
    expect(days(cal).filter((one) => one.hasAttribute('data-range-preview'))).toHaveLength(3)
  })
})

describe('a calendar says which view it shows', () => {
  test('as a state, for the months and for the years', async () => {
    const cal = (await calendar('default-month="2026-08" max-view="year"')) as DatePicker & {
      internals: ElementInternals
      updateComplete: Promise<unknown>
    }
    expect(hasState(cal, 'month-view')).toBe(false)
    cal.shadowRoot?.querySelector<HTMLElement>('[part="heading-button"]')?.click()
    await cal.updateComplete
    expect(hasState(cal, 'month-view')).toBe(true)
    cal.shadowRoot?.querySelector<HTMLElement>('[part="heading-button"]')?.click()
    await cal.updateComplete
    expect(hasState(cal, 'year-view')).toBe(true)
    expect(hasState(cal, 'month-view')).toBe(false)
  })
})

describe('a calendar with no date chosen', () => {
  test('is blank, as a state', async () => {
    const cal = (await calendar('default-month="2026-08"')) as DatePicker & {
      internals: ElementInternals
      updateComplete: Promise<unknown>
      value: string
    }
    expect(hasState(cal, 'blank')).toBe(true)
    cal.value = '2026-08-04'
    await cal.updateComplete
    expect(hasState(cal, 'blank')).toBe(false)
  })
})
