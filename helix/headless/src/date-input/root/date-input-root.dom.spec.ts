import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@helix-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type InputDate = HTMLElement & {
  open: boolean
  toggleOpen(): boolean
  updateComplete: Promise<unknown>
  value: string
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
    /* It used to assert the panel stayed shut, which stopped being true when
       focus was made to open it: reaching the field opens the calendar now, and
       the claim worth keeping is that a reader who types never has to touch it. */
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

  test('picking a date takes it and shuts the panel', async () => {
    // A single date has nothing more to say, unlike a multi-select list.
    const host = await field()
    host.toggleOpen()
    await host.updateComplete
    expect(host.open).toBe(true)

    picker(host).dispatchEvent(
      new CustomEvent('helix-change', {
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
    host.addEventListener('helix-change', (event) => {
      said.push((event as CustomEvent<{ value: string }>).detail.value)
    })
    picker(host).dispatchEvent(
      new CustomEvent('helix-change', {
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
    /* Asserted the opposite until 26 Aug 2026, when declaring the property was a
       claim of ownership and the element announced without moving. Control is
       an action now: it applies, and a consumer refuses to take the decision.
       See 294. */
    const host = await field('value="2026-01-01"')
    let asked = ''
    host.addEventListener('helix-change', (event) => {
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

describe('input date opens on focus', () => {
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

  test('reaching the field from outside brings the calendar up', async () => {
    const host = await dateField()
    const control = part(host, 'control') as HTMLInputElement
    control.dispatchEvent(new FocusEvent('focus', { relatedTarget: null }))
    await host.updateComplete
    expect(host.open).toBe(true)
  })

  test('but a hand-off from inside does not, or picking a date reopens it', async () => {
    /* Choosing a day shuts the panel and puts the caret back in the field. The
       first version of this opened on any focus at all, so the calendar came
       straight back and the reader could not get out of it. */
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
    const host = await many('default-value="2026-08-04,2026-09-01" max="2026-08-31" mode="range"')
    const internals = (host as unknown as { internals: ElementInternals }).internals
    expect(internals.validationMessage).toContain('2026-08-31')
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
      new CustomEvent('helix-change', {
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
      new CustomEvent('helix-change', {
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
    /* It sat after the field, on the reasoning that at the end it is a note
       about the row. Rendered against the combobox it is not: pushed right the
       count lands against the trigger with the whole width of the field between
       it and the tags, so it reads as part of the trigger rather than as a fact
       about the set. The caret still follows the set, the set now being the tags
       and their count. */
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
    expect(host.hasAttribute('data-invalid')).toBe(true)
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
