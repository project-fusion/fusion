import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import {
  formValue,
  hasLayout,
  hasState,
  mount,
  part,
  registerDom,
} from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type InputDate = HTMLElement & {
  open: boolean
  toggleOpen(): boolean
  updateComplete: Promise<unknown>
  value: string
  valueAsDate: Date | null
}

const field = async (attrs = ''): Promise<InputDate> => {
  const host = (await mount(
    `<helix-headless-date-input label="Starts" ${attrs}></helix-headless-date-input>`,
  )) as InputDate
  await host.updateComplete
  return host
}

const control = (host: InputDate): HTMLInputElement => part(host, 'control') as HTMLInputElement
const picker = (host: InputDate): HTMLElement & { value: string } =>
  part(host, 'picker') as HTMLElement & { value: string }

/* Focus first, because typing into an unfocused field is not a thing that
   happens and the two are not equivalent here: the field renders when it is
   idle and holds the value while it is being edited, so a test that skips the
   focus is asserting against a state a browser never reaches. */
const type = async (host: InputDate, text: string): Promise<void> => {
  control(host).dispatchEvent(new FocusEvent('focus', { relatedTarget: null }))
  control(host).value = text
  control(host).dispatchEvent(new Event('input', { bubbles: true }))
  await host.updateComplete
}

describe('input date', () => {
  test('the calendar is the real one, not a grid written here', async () => {
    const host = await field()
    expect(picker(host).tagName).toBe('HELIX-HEADLESS-DATE-PICKER')
  })

  test('typing sets the value, so a reader who knows the date never uses the grid', async () => {
    /* Reaching the field opens the calendar, so what is asserted is not that
       the panel stays shut but that a reader who types never has to touch it. */
    const host = await field()
    await type(host, '2026-08-18')
    expect(host.value).toBe('2026-08-18')
    expect(picker(host).value).toBe('2026-08-18')
  })

  test('a half-typed date is kept but not handed to the calendar', async () => {
    // `2026-08-1` is not a date. Passing it on would move the month under a
    // reader mid-word.
    const host = await field()
    await type(host, '2026-08-1')
    expect(host.value).toBe('2026-08-1')
    expect(picker(host).value).toBe('')
  })

  test('and the calendar follows once the field says something whole', async () => {
    const host = await field()
    await type(host, '2026-08-18')
    expect(picker(host).value).toBe('2026-08-18')
  })

  /* The shape is not the test. `2026-02-31` matches `YYYY-MM-DD`, and a field
     that stopped there reported it as whole and handed it to a form while its
     own `valueAsDate` answered `null`: one element disagreeing with itself
     about one string. */
  test('a day the calendar does not have is not a whole date', async () => {
    const host = await field()
    await type(host, '2026-02-31')
    expect(host.value).toBe('2026-02-31')
    expect(host.valueAsDate).toBeNull()
    expect(picker(host).value).toBe('')
  })

  test('picking a date takes it and shuts the panel', async () => {
    // A single date has nothing more to say, unlike a multi-select list.
    const host = await field()
    host.toggleOpen()
    await host.updateComplete
    expect(host.open).toBe(true)

    picker(host).dispatchEvent(
      new CustomEvent('helix-before-change', {
        bubbles: true,
        composed: true,
        detail: { name: 'value', value: '2026-12-25' },
      }),
    )
    await host.updateComplete
    expect(host.value).toBe('2026-12-25')
    expect(host.open).toBe(false)
  })

  test('the calendar’s own change does not escape as a second event', async () => {
    // One control, one announcement, whichever half of it the reader used.
    const host = await field()
    const said: string[] = []
    host.addEventListener('helix-before-change', (event) => {
      said.push((event as CustomEvent<{ value: string }>).detail.value)
    })
    picker(host).dispatchEvent(
      new CustomEvent('helix-before-change', {
        bubbles: true,
        composed: true,
        detail: { name: 'value', value: '2026-12-25' },
      }),
    )
    await host.updateComplete
    expect(said).toEqual(['2026-12-25'])
  })

  test('bounds reach the calendar, which is what enforces them in the grid', async () => {
    const host = await field('min="2026-01-01" max="2026-12-31" first-day-of-week="1"')
    expect(picker(host).getAttribute('min')).toBe('2026-01-01')
    expect(picker(host).getAttribute('max')).toBe('2026-12-31')
    expect(picker(host).getAttribute('first-day-of-week')).toBe('1')
  })

  test('the trigger says what it opens, and whether it is open', async () => {
    const host = await field()
    const trigger = part(host, 'trigger') as HTMLElement
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    host.toggleOpen()
    await host.updateComplete
    expect((part(host, 'trigger') as HTMLElement).getAttribute('aria-expanded')).toBe('true')
  })

  test('declaring `value` seeds it, and the field still moves', async () => {
    /* Declaring the property is a seed and not a claim of ownership: control is
       an action, so the element applies it and a consumer refuses to take the
       decision. */
    const host = await field('value="2026-01-01"')
    let asked = ''
    host.addEventListener('helix-before-change', (event) => {
      asked = (event as CustomEvent<{ value: string }>).detail.value
    })
    await type(host, '2026-02-02')
    expect(asked).toBe('2026-02-02')
    expect(host.value).toBe('2026-02-02')
    // And what is on screen is the answer, since the element applied it.
    expect(control(host).value).toBe('2026-02-02')
  })

  test('the hint is described by the input, in the same tree', async () => {
    const host = await field('hint="Any weekday"')
    const described = control(host).getAttribute('aria-describedby')
    const scope = control(host).getRootNode() as ShadowRoot
    expect(scope.getElementById(described as string)?.textContent).toContain('Any weekday')
  })
})

describe('input date opens on a press, and not on Tab', () => {
  const dateField = async (
    attrs = '',
  ): Promise<HTMLElement & { open: boolean; updateComplete: Promise<unknown> }> => {
    const host = (await mount(
      `<helix-headless-date-input label="Starts" ${attrs}></helix-headless-date-input>`,
    )) as HTMLElement & {
      open: boolean
      updateComplete: Promise<unknown>
    }
    await host.updateComplete
    return host
  }

  test('pressing into the field from outside brings the calendar up', async () => {
    const host = await dateField()
    const control = part(host, 'control') as HTMLInputElement
    control.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }))
    control.dispatchEvent(new FocusEvent('focus', { relatedTarget: null }))
    await host.updateComplete
    expect(host.open).toBe(true)
  })

  /* A reader tabbing through a form heard a dialog appear at every date they
     passed. */
  test('tabbing into the field leaves it shut', async () => {
    const host = await dateField()
    const control = part(host, 'control') as HTMLInputElement
    control.dispatchEvent(new FocusEvent('focus', { relatedTarget: null }))
    await host.updateComplete
    expect(host.open).toBe(false)
  })

  test('but a hand-off from inside does not, or picking a date reopens it', async () => {
    /* Choosing a day shuts the panel and puts the caret back in the field, so
       focus arriving from inside must not reopen it: opening on any focus at
       all brings the calendar straight back and the reader cannot get out. */
    const host = await dateField()
    const control = part(host, 'control') as HTMLInputElement
    const trigger = part(host, 'trigger') as HTMLElement
    control.dispatchEvent(new FocusEvent('focus', { relatedTarget: trigger }))
    await host.updateComplete
    expect(host.open).toBe(false)
  })

  test('and a disabled field stays shut', async () => {
    const host = await dateField('disabled')
    const control = part(host, 'control') as HTMLInputElement
    control.dispatchEvent(new FocusEvent('focus', { relatedTarget: null }))
    await host.updateComplete
    expect(host.open).toBe(false)
  })
})

describe('input date holds more than one', () => {
  const many = async (
    attrs: string,
  ): Promise<HTMLElement & { open: boolean; updateComplete: Promise<unknown>; value: string }> => {
    const host = (await mount(
      `<helix-headless-date-input label="Stay" ${attrs}></helix-headless-date-input>`,
    )) as HTMLElement & {
      open: boolean
      updateComplete: Promise<unknown>
      value: string
    }
    await host.updateComplete
    return host
  }

  test('the mode and the month count reach the calendar', async () => {
    const host = await many('mode="range" months="2"')
    const picker = part(host, 'picker')
    expect(picker?.getAttribute('mode')).toBe('range')
    expect(picker?.getAttribute('months')).toBe('2')
  })

  test('a range is two dates in one value, which is what a form submits', async () => {
    const host = await many('default-value="2026-08-04,2026-08-11" mode="range"')
    expect(
      part(host, 'picker')?.getAttribute('value') ??
        (part(host, 'picker') as unknown as { value: string }).value,
    ).toBe('2026-08-04,2026-08-11')
  })

  test('bounds are checked against every date, not against the list', async () => {
    /* A string comparison of `2026-08-04,2026-09-01` against a `max` would be
       comparing a bound to a list and would pass whatever the second date was. */
    const host = await many(
      'date-style="medium" default-value="2026-08-04,2026-09-01" locale="en-GB" max="2026-08-31" mode="range"',
    )
    const internals = (host as unknown as { internals: ElementInternals }).internals
    // The bound as the field writes a date, so the reader is told about the day they can see.
    expect(internals.validationMessage).toContain('31 Aug 2026')
  })

  test("each sentence the bubble raises is the page's to write, with its bound filled in", async () => {
    /* `feedback` replaces the message under the field and never reached the
       browser's own bubble, so a form in another language still raised these
       in English. */
    const late = await many(
      'date-style="iso" default-value="2026-09-01" max="2026-08-31" mode="multiple" range-overflow-message="Au plus tard le {max}."',
    )
    expect((late as unknown as { internals: ElementInternals }).internals.validationMessage).toBe(
      'Au plus tard le 2026-08-31.',
    )
    const wrong = await many(
      'default-value="not-a-date" mode="multiple" bad-input-message="Pas une date."',
    )
    expect((wrong as unknown as { internals: ElementInternals }).internals.validationMessage).toBe(
      'Pas une date.',
    )
  })

  test('an empty message is no message, and the control says its own', async () => {
    /* A page passing a translation before it has loaded passes the empty
       string, which read as the page's own words and waved the date through. */
    const wrong = await many('default-value="not-a-date" mode="multiple" bad-input-message=""')
    const internals = (wrong as unknown as { internals: ElementInternals }).internals
    expect(internals.validity.valid).toBe(false)
    expect(internals.validationMessage).not.toBe('')
  })

  test('and a range refuses a third date', async () => {
    const host = await many('default-value="2026-08-04,2026-08-11,2026-08-18" mode="range"')
    const internals = (host as unknown as { internals: ElementInternals }).internals
    expect(internals.validationMessage).toBe('A range is two dates.')
  })

  test('the panel stays up while more than one date is being chosen', async () => {
    /* A single date has nothing more to say. A range does: shutting the calendar
       after the first one is taking the control away mid-answer. */
    const host = await many('mode="range"')
    host.open = true
    await host.updateComplete
    part(host, 'picker')?.dispatchEvent(
      new CustomEvent('helix-before-change', {
        bubbles: true,
        composed: true,
        detail: { name: 'date', value: '2026-08-04' },
      }),
    )
    await host.updateComplete
    expect(host.open).toBe(true)
  })

  test('but shuts for a single date, as it always did', async () => {
    const host = await many('')
    host.open = true
    await host.updateComplete
    part(host, 'picker')?.dispatchEvent(
      new CustomEvent('helix-before-change', {
        bubbles: true,
        composed: true,
        detail: { name: 'date', value: '2026-08-04' },
      }),
    )
    await host.updateComplete
    expect(host.open).toBe(false)
  })
})

describe('input date shows what it holds', () => {
  const field = async (
    attrs: string,
  ): Promise<HTMLElement & { open: boolean; updateComplete: Promise<unknown>; value: string }> => {
    const host = (await mount(
      `<helix-headless-date-input label="Dates" ${attrs}></helix-headless-date-input>`,
    )) as HTMLElement & {
      open: boolean
      updateComplete: Promise<unknown>
      value: string
    }
    await host.updateComplete
    return host
  }

  test('a range reads with a dash, because it is a span rather than a list', async () => {
    const host = await field('date-style="iso" default-value="2026-08-04,2026-08-11" mode="range"')
    expect((part(host, 'control') as HTMLInputElement).value).toBe('2026-08-04 – 2026-08-11')
  })

  test('and the dash reads back, so what is shown can be typed', async () => {
    const host = await field('date-style="iso" mode="range"')
    const control = part(host, 'control') as HTMLInputElement
    for (const typed of ['2026-08-04 – 2026-08-11', '2026-08-04 - 2026-08-11']) {
      control.value = typed
      control.dispatchEvent(new Event('input', { bubbles: true }))
      await host.updateComplete
      expect(host.value).toBe('2026-08-04,2026-08-11')
    }
  })

  test('a bare hyphen is not a separator, or a date comes apart into three numbers', async () => {
    const host = await field('date-style="iso" mode="range"')
    const control = part(host, 'control') as HTMLInputElement
    control.value = '2026-08-04'
    control.dispatchEvent(new Event('input', { bubbles: true }))
    await host.updateComplete
    expect(host.value).toBe('2026-08-04')
    expect((host as unknown as { internals: ElementInternals }).internals.validationMessage).toBe(
      '',
    )
  })

  test('a single date is shown as itself, with no dash anywhere near it', async () => {
    const host = await field('date-style="iso" default-value="2026-08-04"')
    expect((part(host, 'control') as HTMLInputElement).value).toBe('2026-08-04')
  })

  test('multiple holds its dates as tags, and the input is a draft', async () => {
    const host = await field(
      'date-style="iso" default-value="2026-08-04,2026-08-11" mode="multiple"',
    )
    const tags = [...(host.shadowRoot?.querySelectorAll('[part="date"]') ?? [])]
    expect(tags.map((one) => one.textContent?.trim())).toEqual(['2026-08-04', '2026-08-11'])
    // The value is a set being added to, so the input holds what is not in it yet.
    expect((part(host, 'control') as HTMLInputElement).value).toBe('')
  })

  test('typing a date and pressing Enter adds it', async () => {
    const host = await field('default-value="2026-08-04" mode="multiple"')
    const control = part(host, 'control') as HTMLInputElement
    control.value = '2026-08-11'
    control.dispatchEvent(new Event('input', { bubbles: true }))
    await host.updateComplete
    control.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }))
    await host.updateComplete
    expect(host.value).toBe('2026-08-04,2026-08-11')
    expect(control.value).toBe('')
  })

  test('and the same date twice is once', async () => {
    const host = await field('default-value="2026-08-04" mode="multiple"')
    const control = part(host, 'control') as HTMLInputElement
    control.value = '2026-08-04'
    control.dispatchEvent(new Event('input', { bubbles: true }))
    await host.updateComplete
    control.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }))
    await host.updateComplete
    expect(host.value).toBe('2026-08-04')
  })

  test('backspace on an empty draft takes the last one back', async () => {
    // The convention every tag field has: a mistake costs one key rather than a
    // hunt for a small control.
    const host = await field('default-value="2026-08-04,2026-08-11" mode="multiple"')
    const control = part(host, 'control') as HTMLInputElement
    control.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Backspace' }))
    await host.updateComplete
    expect(host.value).toBe('2026-08-04')
  })

  test('and a tag can be dismissed on its own', async () => {
    const host = await field('default-value="2026-08-04,2026-08-11,2026-08-18" mode="multiple"')
    const tag = host.shadowRoot?.querySelectorAll('[part="date"]')[1] as HTMLElement
    tag.dispatchEvent(new CustomEvent('helix-dismiss', { bubbles: true, composed: true }))
    await host.updateComplete
    expect(host.value).toBe('2026-08-04,2026-08-18')
  })

  test('each tag is removed by a control named for the date it shows', async () => {
    /* The date as written on the tag rather than as stored: a reader who sees
       "4 Aug 2026" and hears "Remove 2026-08-04" is left matching the two. And
       the name goes where the sentence puts it, so another language can put it
       first. */
    const host = await field(
      'date-style="medium" default-value="2026-08-04" locale="en-GB" mode="multiple" remove-label="Take {name} off"',
    )
    const tag = host.shadowRoot?.querySelector('[part="date"]')
    expect(tag?.getAttribute('dismiss-label')).toBe(`Take ${tag?.textContent?.trim()} off`)
    expect(tag?.getAttribute('dismiss-label')).not.toContain('2026-08-04')
  })
})

describe('input date can be written out', () => {
  const field = async (
    attrs: string,
  ): Promise<HTMLElement & { updateComplete: Promise<unknown>; value: string }> => {
    const host = (await mount(
      `<helix-headless-date-input label="Starts" ${attrs}></helix-headless-date-input>`,
    )) as HTMLElement & {
      updateComplete: Promise<unknown>
      value: string
    }
    await host.updateComplete
    return host
  }

  test('a date is written out by default, and the value stays ISO', async () => {
    const host = await field('default-value="2026-08-04" locale="en-GB"')
    expect((part(host, 'control') as HTMLInputElement).value).toBe('4 August 2026')
    expect(host.value).toBe('2026-08-04')
  })

  test('focusing it hands back the value, and blurring writes it out again', async () => {
    /* A rendering cannot be typed back, so the two are separated in time rather
       than chosen between: idle it reads, focused it holds the value. Nothing
       parses a rendering, and the field is never read-only. */
    const host = await field('default-value="2026-08-04" locale="en-GB"')
    const control = part(host, 'control') as HTMLInputElement
    expect(control.value).toBe('4 August 2026')
    expect(control.readOnly).toBe(false)

    control.dispatchEvent(new FocusEvent('focus', { relatedTarget: null }))
    await host.updateComplete
    expect(control.value).toBe('2026-08-04')

    control.dispatchEvent(new FocusEvent('blur'))
    await host.updateComplete
    expect(control.value).toBe('4 August 2026')
  })

  test('`iso` turns the rendering off, for a reader entering data', async () => {
    const host = await field('date-style="iso" default-value="2026-08-04"')
    expect((part(host, 'control') as HTMLInputElement).value).toBe('2026-08-04')
  })

  test('the locale is the calendar its months are named in', async () => {
    const host = await field('default-value="2026-08-04" locale="fr-FR"')
    expect((part(host, 'control') as HTMLInputElement).value).toBe('4 août 2026')
  })

  test('a date is written in UTC, or it renders as the day before', async () => {
    // The classic off-by-one: a date parsed in a zone behind Greenwich is the
    // previous day by the time it is formatted, and the field then disagrees
    // with the calendar under it.
    const host = await field('date-style="short" default-value="2026-08-04" locale="en-GB"')
    expect((part(host, 'control') as HTMLInputElement).value).toContain('04')
  })

  test('a range is written out on both sides of the dash', async () => {
    const host = await field(
      'date-style="medium" default-value="2026-08-04,2026-08-11" locale="en-GB" mode="range"',
    )
    expect((part(host, 'control') as HTMLInputElement).value).toBe('4 Aug 2026 – 11 Aug 2026')
  })

  test('and a multiple writes each tag out', async () => {
    const host = await field(
      'date-style="medium" default-value="2026-08-04,2026-08-11" locale="en-GB" mode="multiple"',
    )
    const tags = [...(host.shadowRoot?.querySelectorAll('[part="date"]') ?? [])]
    expect(tags.map((one) => one.textContent?.trim())).toEqual(['4 Aug 2026', '11 Aug 2026'])
  })
})

describe('input date can cap its tags', () => {
  const field = async (
    attrs: string,
  ): Promise<HTMLElement & { updateComplete: Promise<unknown>; value: string }> => {
    const host = (await mount(
      `<helix-headless-date-input label="Dates" mode="multiple" ${attrs}></helix-headless-date-input>`,
    )) as HTMLElement & {
      updateComplete: Promise<unknown>
      value: string
    }
    await host.updateComplete
    return host
  }

  test('every date gets a tag by default, because a cap that guesses is worse', async () => {
    // How many fit depends on the width of the field and the length of what is
    // in it, and this element knows neither.
    const host = await field('default-value="2026-08-04,2026-08-11,2026-08-18"')
    expect(host.shadowRoot?.querySelectorAll('[part="date"]')).toHaveLength(3)
    expect(host.shadowRoot?.querySelector('[part="rest"]')).toBeNull()
  })

  test('a cap shows that many and counts the rest', async () => {
    const host = await field(
      'default-value="2026-08-04,2026-08-11,2026-08-18,2026-08-25" max-tags="2"',
    )
    expect(host.shadowRoot?.querySelectorAll('[part="date"]')).toHaveLength(2)
    expect(part(host, 'rest')?.textContent?.trim()).toBe('+2')
  })

  test('and counts nothing when the cap is not reached', async () => {
    // A row that silently stops is a field that appears to have lost what was
    // put in it, so the count is the point; a count of zero is not.
    const host = await field('default-value="2026-08-04" max-tags="3"')
    expect(host.shadowRoot?.querySelector('[part="rest"]')).toBeNull()
  })

  test('the value keeps every date, whatever is shown', async () => {
    const host = await field('default-value="2026-08-04,2026-08-11,2026-08-18" max-tags="1"')
    expect(host.value).toBe('2026-08-04,2026-08-11,2026-08-18')
  })
})

describe('input date keeps the tag row readable', () => {
  const many = async (
    attrs: string,
  ): Promise<HTMLElement & { updateComplete: Promise<unknown> }> => {
    const host = (await mount(
      `<helix-headless-date-input label="Dates" mode="multiple" ${attrs}></helix-headless-date-input>`,
    )) as HTMLElement & {
      updateComplete: Promise<unknown>
    }
    await host.updateComplete
    return host
  }

  test('the placeholder goes once anything is held', async () => {
    /* It exists to say what goes in an empty field. Beside two tags and a count
       it reads as a fourth item: "August 4, August 11, +2, YYYY-MM-DD" is
       four things where a reader sees one sentence. */
    const empty = await many('')
    expect(part(empty, 'control')?.getAttribute('placeholder')).toBe('YYYY-MM-DD')
    const held = await many('default-value="2026-08-04"')
    expect(part(held, 'control')?.hasAttribute('placeholder')).toBe(false)
  })

  test('and the count sits with the tags it counts, before the field', async () => {
    /* Not after the field, where it reads as a note about the row: pushed right
       the count lands against the trigger with the whole width of the field
       between it and the tags, so it reads as part of the trigger rather than
       as a fact about the set. The caret follows the set, which is the tags and
       their count. */
    const host = await many('default-value="2026-08-04,2026-08-11,2026-08-18" max-tags="2"')
    const nodes = [...(part(host, 'field')?.children ?? [])]
    const at = (name: string) => nodes.findIndex((one) => one.getAttribute('part') === name)
    expect(at('rest')).toBeLessThan(at('control'))
    expect(part(host, 'rest')?.textContent?.trim()).toBe('+1')
  })

  test('a single-date field keeps its placeholder, since nothing is held as a tag', async () => {
    const host = (await mount(
      '<helix-headless-date-input label="d"></helix-headless-date-input>',
    )) as HTMLElement & {
      updateComplete: Promise<unknown>
    }
    await host.updateComplete
    expect(part(host, 'control')?.getAttribute('placeholder')).toBe('YYYY-MM-DD')
  })
})

describe('an invalid date field marks the calendar too', () => {
  test('the panel is where the answer is, so the answer is where the mark goes', async () => {
    /* The field turns its own border red, and the calendar it opens is a grid
       with no border to turn: what only it can do is ring the day. Both halves
       come from one state, so a reader who opens the panel to fix the error is
       not looking at a calendar that says everything is fine. */
    const host = (await mount(
      `<helix-headless-date-input feedback="Pick a weekday" label="When"></helix-headless-date-input>`,
    )) as HTMLElement & { updateComplete: Promise<unknown> }
    await host.updateComplete
    expect(hasState(host, 'invalid')).toBe(true)
    expect(part(host, 'picker')?.hasAttribute('invalid')).toBe(true)
  })

  test('and drops it when the message goes', async () => {
    const host = (await mount(
      `<helix-headless-date-input label="When"></helix-headless-date-input>`,
    )) as HTMLElement & { updateComplete: Promise<unknown> }
    await host.updateComplete
    expect(part(host, 'picker')?.hasAttribute('invalid')).toBe(false)
  })
})

/**
 * How many months the panel shows where the window has no room for them all.
 *
 * **The window is narrowed where placement reads it**, because a spec page
 * cannot be resized from inside. Floating UI measures the viewport from
 * `visualViewport`, so a 390-wide one is a phone's window to everything that
 * decides where the panel goes and how much room it has, and deleting the own
 * property hands the real one back. `matchMedia` is stubbed the same way
 * elsewhere, for the same reason.
 */
if (hasLayout()) {
  describe('months, where the window is narrow', () => {
    const narrow = (width: number): void => {
      const real = window.visualViewport
      /* An `EventTarget`, because the page listens on the real one. */
      Object.defineProperty(window, 'visualViewport', {
        configurable: true,
        value: Object.assign(new EventTarget(), {
          height: real?.height ?? window.innerHeight,
          offsetLeft: 0,
          offsetTop: 0,
          pageLeft: 0,
          pageTop: 0,
          scale: 1,
          width,
        }),
      })
    }

    afterEach(() => {
      delete (window as { visualViewport?: unknown }).visualViewport
    })

    const shown = (host: InputDate): number =>
      picker(host).shadowRoot?.querySelectorAll('[part~="month"]').length ?? 0

    /* Side by side, as a sheet would put them: with none the months stack,
       a stack of two fits a phone, and two is then the right answer. */
    const beside = async (): Promise<InputDate> => {
      const host = (await mount(
        `<helix-headless-date-input label="Starts" months="2"></helix-headless-date-input>
        <style>
          helix-headless-date-input::part(picker-months) {
            display: grid;
            grid-template-columns: repeat(var(--date-picker-column-count), 18rem);
          }
        </style>`,
      )) as InputDate
      await host.updateComplete
      return host
    }

    const placed = async (host: InputDate): Promise<void> => {
      await host.updateComplete
      /* `computePosition` resolves after the update and the month count
         follows it, so two frames and the update that asked for. */
      await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))
      await host.updateComplete
      await (picker(host) as unknown as { updateComplete: Promise<unknown> }).updateComplete
    }

    test('two months at a desktop width, as asked', async () => {
      const host = await beside()
      host.toggleOpen()
      await placed(host)
      expect(shown(host)).toBe(2)
    })

    test('one at a phone’s, inside the window, and both again once there is room', async () => {
      narrow(390)
      const host = await beside()
      host.toggleOpen()
      await placed(host)
      expect(shown(host)).toBe(1)
      const surface = (part(host, 'surface') as HTMLElement).getBoundingClientRect()
      expect(surface.left).toBeGreaterThanOrEqual(0)
      expect(surface.right).toBeLessThanOrEqual(390)

      delete (window as { visualViewport?: unknown }).visualViewport
      window.dispatchEvent(new Event('resize'))
      await placed(host)
      expect(shown(host)).toBe(2)
    })
  })
}

describe('input date holding several, in its form', () => {
  test('sends one entry per date, the way the calendar beside it does', async () => {
    const host = await field('default-value="2026-08-04,2026-08-11" mode="multiple" name="d"')
    expect((formValue(host) as FormData).getAll('d')).toEqual(['2026-08-04', '2026-08-11'])
  })

  test('and nothing without a name, which a form would send as empty-named dates', async () => {
    const host = await field('default-value="2026-08-04,2026-08-11" mode="multiple"')
    expect(formValue(host)).toBeNull()
  })
})

describe('the events a date input sends', () => {
  const heard = (host: InputDate): string[] => {
    const log: string[] = []
    for (const name of ['input', 'change']) {
      host.addEventListener(name, () => log.push(name))
    }
    return log
  }

  /* Measured before this: typing 2026-09-03 sent ten `change` events, one per
     keystroke, half of them for dates that did not exist yet. */
  test('typing sends `input`, and `change` once the reader is done', async () => {
    const host = await field()
    const log = heard(host)
    await type(host, '2026-09-0')
    await type(host, '2026-09-03')
    expect(log).toEqual(['input', 'input'])
    control(host).dispatchEvent(new Event('change'))
    expect(log).toEqual(['input', 'input', 'change'])
  })

  test('a date picked in the calendar sends both, being a finished choice', async () => {
    const host = await field('default-value="2026-08-14"')
    const log = heard(host)
    ;(picker(host) as unknown as { requestValue(next: string): boolean }).requestValue('2026-08-20')
    await host.updateComplete
    expect(host.value).toBe('2026-08-20')
    expect(log).toEqual(['input', 'change'])
  })
})

describe('a date input that refuses a pick', () => {
  /* Measured before this: the field kept its date while the calendar moved to
     the refused one, and showed it as chosen on reopening. */
  test('leaves the calendar on the date the field holds', async () => {
    const host = await field('default-value="2026-08-14"')
    host.addEventListener('helix-before-change', (event) => event.preventDefault())
    ;(picker(host) as unknown as { requestValue(next: string): boolean }).requestValue('2026-08-20')
    await host.updateComplete
    expect(host.value).toBe('2026-08-14')
    expect(picker(host).value).toBe('2026-08-14')
  })
})

describe('a date input and the dates its calendar bars', () => {
  type Checked = InputDate & { internals: ElementInternals }

  test('a barred day typed or seeded is invalid', async () => {
    const host = (await field(
      'disable-days="0 6" disable-dates="2026-08-12" default-value="2026-08-12"',
    )) as Checked
    expect(host.internals.validity.valid).toBe(false)
    expect(host.internals.validationMessage).toBe('Choose a date that is available.')
    host.value = '2026-08-15'
    await host.updateComplete
    expect(host.internals.validity.valid).toBe(false)
    host.value = '2026-08-13'
    await host.updateComplete
    expect(host.internals.validity.valid).toBe(true)
  })

  test('and so is a date off the step', async () => {
    const host = (await field('min="2026-08-03" step="7" default-value="2026-08-04"')) as Checked
    expect(host.internals.validity.valid).toBe(false)
  })
})

describe('the calendar a date input opens', () => {
  test('is named and labeled in the words the field is given', async () => {
    const host = await field(
      'calendar-label="Kalender" previous-label="Vorheriger Monat" next-label="Nächster Monat"',
    )
    const calendar = picker(host)
    expect(calendar.getAttribute('label')).toBe('Kalender')
    expect(
      calendar.shadowRoot?.querySelector('[part="previous"]')?.getAttribute('aria-label'),
    ).toBe('Vorheriger Monat')
    expect(calendar.shadowRoot?.querySelector('[part="next"]')?.getAttribute('aria-label')).toBe(
      'Nächster Monat',
    )
  })

  test('takes the icons slotted on the field', async () => {
    const host = await field()
    host.innerHTML = '<span slot="previous-icon">‹</span><span slot="next-icon">›</span>'
    await new Promise((resolve) => setTimeout(resolve))
    await host.updateComplete
    const slots = [...picker(host).querySelectorAll('slot')].map((one) => one.getAttribute('slot'))
    expect(slots).toEqual(['previous-icon', 'next-icon'])
  })

  /* A forwarded slot is assigned even while it is empty, and an assigned slot
     hides the calendar's own caret, so the months showed no caret at all. */
  test('leaves the calendar its own carets while the field has no icons', async () => {
    const host = await field()
    const slots = [...picker(host).querySelectorAll('slot')].map((one) => one.hasAttribute('slot'))
    expect(slots).toEqual([false, false])
  })

  /* Measured before this: Enter on the trigger opened the calendar and left
     focus on the trigger, three Tab presses from the selected day. */
  test('takes focus to the selected day when the trigger opens it', async () => {
    const host = await field('default-value="2026-08-14"')
    ;(part(host, 'trigger') as HTMLElement).click()
    await host.updateComplete
    await (picker(host) as unknown as { updateComplete: Promise<unknown> }).updateComplete
    expect(host.open).toBe(true)
    expect(picker(host).shadowRoot?.activeElement?.getAttribute('aria-label')).toContain(
      'August 14, 2026',
    )
  })
})

describe('Enter in a date input', () => {
  test('submits a form with no button and no other field', async () => {
    document.body.innerHTML =
      '<form><helix-headless-date-input name="d" label="Starts"></helix-headless-date-input></form>'
    const host = document.querySelector('helix-headless-date-input') as InputDate
    await host.updateComplete
    let submitted = 0
    document.querySelector('form')?.addEventListener('submit', (event) => {
      event.preventDefault()
      submitted += 1
    })
    control(host).dispatchEvent(
      new KeyboardEvent('keypress', { bubbles: true, cancelable: true, key: 'Enter' }),
    )
    expect(submitted).toBe(1)
  })
})

describe('input date hands its calendar a rule, a drawing and the months', () => {
  test('a date isDateUnavailable refuses is barred when typed', async () => {
    const host = (await field()) as InputDate & {
      isDateUnavailable?: (date: string) => boolean
      internals: ElementInternals
    }
    host.isDateUnavailable = (date) => date === '2026-08-13'
    await type(host, '2026-08-13')
    expect(host.internals.validity.badInput).toBe(true)
    expect(host.internals.validationMessage).toBe('Choose a date that is available.')
    const calendar = picker(host) as HTMLElement & {
      isDateUnavailable?: (date: string) => boolean
    }
    expect(calendar.isDateUnavailable?.('2026-08-13')).toBe(true)
  })

  test('max-view, the view labels and dayContent reach the calendar', async () => {
    const host = (await field(
      'max-view="year" year-view-label="{heading}: Jahre"',
    )) as InputDate & {
      dayContent?: (date: string) => unknown
    }
    const draw = (date: string): string => date.slice(8)
    host.dayContent = draw
    await host.updateComplete
    const calendar = picker(host) as unknown as {
      dayContent?: unknown
      maxView?: string
      yearViewLabel: string
    }
    expect(calendar.maxView).toBe('year')
    expect(calendar.yearViewLabel).toBe('{heading}: Jahre')
    expect(calendar.dayContent).toBe(draw)
  })
})

describe('segmented', () => {
  const segments = (host: HTMLElement): HTMLElement[] => [
    ...(host.shadowRoot?.querySelectorAll<HTMLElement>('[part~="segment"]') ?? []),
  ]
  const press = async (host: InputDate, at: HTMLElement, key: string): Promise<void> => {
    at.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, composed: true, key }),
    )
    await host.updateComplete
  }

  test('the field is a segment for each part of the date, in the order of `locale`', async () => {
    const host = await field('segmented locale="de-DE" default-value="2026-08-04"')
    expect(part(host, 'control')).toBeNull()
    expect(segments(host).map((one) => one.textContent?.trim())).toEqual(['04', '08', '2026'])
    expect(part(host, 'segments')?.getAttribute('role')).toBe('group')
  })

  test('a key in a segment moves the value, which the form and the calendar hold', async () => {
    const host = await field('segmented name="d" default-value="2026-08-04"')
    await press(host, segments(host)[0] as HTMLElement, 'ArrowUp')
    expect(host.value).toBe('2026-09-04')
    expect(formValue(host)).toBe('2026-09-04')
    expect(picker(host).value).toBe('2026-09-04')
  })

  test('a date picked in the calendar is what the segments show', async () => {
    const host = await field('segmented default-value="2026-08-04"')
    picker(host).dispatchEvent(
      new CustomEvent('helix-before-change', {
        bubbles: true,
        cancelable: true,
        composed: true,
        detail: { value: '2026-10-21' },
      }),
    )
    await host.updateComplete
    expect(segments(host).map((one) => one.textContent?.trim())).toEqual(['10', '21', '2026'])
  })

  test('a date the field bars is invalid, as a typed one is', async () => {
    const host = (await field(
      'segmented min="2026-08-01" default-value="2026-08-04"',
    )) as InputDate & {
      internals: ElementInternals
    }
    await press(host, segments(host)[1] as HTMLElement, 'Home')
    expect(host.value).toBe('2026-08-01')
    expect(host.internals.validity.valid).toBe(true)
    await press(host, segments(host)[0] as HTMLElement, 'ArrowDown')
    expect(host.value).toBe('2026-07-01')
    expect(host.internals.validity.badInput).toBe(true)
  })

  test('a range and a multiple keep the line of text, which writes several dates', async () => {
    const host = await field('segmented mode="range"')
    expect(part(host, 'control')).not.toBeNull()
    expect(part(host, 'segments')).toBeNull()
  })
})
