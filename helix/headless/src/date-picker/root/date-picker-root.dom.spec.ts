import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import {
  formValue,
  hasLayout,
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

  test('a declared month is a seed, and the arrows still move it', async () => {
    /* `month` says a consumer can drive the view, so a calendar writing it on
       every page would overwrite a consumer holding it in state and never tell
       them which way to put it back. */
    const cal = await calendar('month="2026-08" default-value="2026-08-14"')
    let announced = ''
    cal.addEventListener('helix-navigate', (event) => {
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

  test('take Previous and Next out of use at the months they end in', async () => {
    const cal = await calendar('default-month="2026-08" min="2026-08-03" max="2026-08-20"')
    expect(cal.shadowRoot?.querySelector('[part="previous"]')?.hasAttribute('disabled')).toBe(true)
    expect(cal.shadowRoot?.querySelector('[part="next"]')?.hasAttribute('disabled')).toBe(true)
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
