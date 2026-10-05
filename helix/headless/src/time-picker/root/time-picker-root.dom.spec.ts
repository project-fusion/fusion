import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Time = HTMLElement & { updateComplete: Promise<unknown>; value: string }

const picker = async (attrs = ''): Promise<Time> => {
  const host = (await mount(
    `<helix-headless-time-picker ${attrs}></helix-headless-time-picker>`,
  )) as Time
  await host.updateComplete
  return host
}

const options = (host: Time): HTMLElement[] =>
  [...(host.shadowRoot?.querySelectorAll('[part~="option"]') ?? [])] as HTMLElement[]

describe('time', () => {
  test('a day at a quarter hour is ninety-six rows', async () => {
    // The step is what makes it a list at all: at one minute it is one thousand
    // four hundred and forty, which is a listbox in name only.
    expect(options(await picker())).toHaveLength(96)
  })

  test('the step is honored, and counted from `min` rather than from midnight', async () => {
    /* A list starting at nine should step from nine, not offer 09:20 because
       that is where the twenty minute marks from midnight happen to land. */
    const host = await picker('min="09:00" max="10:00" step="20"')
    expect(options(host).map((one) => one.getAttribute('value'))).toEqual([
      '09:00',
      '09:20',
      '09:40',
      '10:00',
    ])
  })

  test('the value is 24 hour and what a row says is the locale', async () => {
    const gb = await picker('locale="en-GB" min="13:00" max="13:00"')
    expect(options(gb)[0]?.getAttribute('value')).toBe('13:00')
    expect(options(gb)[0]?.textContent?.trim()).toBe('13:00')

    const us = await picker('locale="en-US" min="13:00" max="13:00"')
    expect(options(us)[0]?.getAttribute('value')).toBe('13:00')
    // The clock a reader uses is a property of their locale, not of this element.
    expect(us.shadowRoot?.textContent).toContain('1:00')
  })

  /* The list inside announces its own `input`, composed, so it crossed out of
     the picker beside the picker's: two for one choice, found running the
     events example. */
  test('one choice is one `input`, however many lists it passed through', async () => {
    const host = await picker('min="09:00" max="10:00" step="30"')
    const heard: string[] = []
    host.addEventListener('input', () => heard.push('input'))
    ;(options(host)[1]?.shadowRoot?.querySelector('[part~="item"]') as HTMLElement | null)?.click()
    await host.updateComplete
    expect(host.value).toBe('09:30')
    expect(heard).toEqual(['input'])
  })

  test('bounds are inclusive at both ends', async () => {
    const host = await picker('min="09:00" max="09:30" step="15"')
    expect(options(host).map((one) => one.getAttribute('value'))).toEqual([
      '09:00',
      '09:15',
      '09:30',
    ])
  })

  test('choosing a time announces it under this element name', async () => {
    const host = await picker('min="09:00" max="09:15"')
    const said: string[] = []
    host.addEventListener('helix-before-change', (event) => {
      said.push((event as CustomEvent<{ value: string }>).detail.value)
    })
    part(host, 'list')?.dispatchEvent(
      new CustomEvent('helix-before-change', {
        bubbles: true,
        composed: true,
        detail: { name: 'time', value: '09:15' },
      }),
    )
    await host.updateComplete
    expect(said).toEqual(['09:15'])
  })

  test('the list is a real listbox, not a column written here', async () => {
    // It brings the keyboard, the typeahead and the scroll into view, which is
    // most of what a set of options is.
    expect(part(await picker(), 'list')?.tagName.toLowerCase()).toBe('helix-headless-listbox')
  })
})

describe('time as wheels', () => {
  const wheels = async (attrs = ''): Promise<Time> => {
    const host = (await mount(
      `<helix-headless-time-picker variant="wheels" ${attrs}></helix-headless-time-picker>`,
    )) as Time
    await host.updateComplete
    return host
  }

  const column = (host: Time, which: string): HTMLElement =>
    host.shadowRoot?.querySelector(`[data-column="${which}"]`) as HTMLElement

  const values = (host: Time, which: string): (string | null)[] =>
    [...column(host, which).querySelectorAll('[part~="option"]')].map((one) =>
      one.getAttribute('value'),
    )

  test('a whole day is an hour column and a minute column, not ninety-six rows', async () => {
    const host = await wheels('locale="en-GB"')
    expect(host.shadowRoot?.querySelector('[part="list"]')).toBeNull()
    expect(values(host, 'hour')).toHaveLength(24)
    expect(values(host, 'minute')).toEqual(['0', '15', '30', '45'])
  })

  test('a meridiem column only where the locale writes one', async () => {
    // Asked of `Intl` rather than derived from a list of locales, because that
    // is exactly the question `resolvedOptions` answers.
    expect(column(await wheels('locale="en-GB"'), 'meridiem')).toBeNull()
    expect(values(await wheels('locale="en-US"'), 'meridiem')).toEqual(['AM', 'PM'])
  })

  test('the hour column reads one to twelve on a twelve hour clock, once each', async () => {
    // 13:00 and 01:00 are both "1", and offering it twice is offering a choice
    // that is not one.
    const host = await wheels('locale="en-US"')
    expect(values(host, 'hour')).toHaveLength(12)
    expect(values(host, 'hour')).toContain('12')
    expect(values(host, 'hour')).toContain('1')
  })

  test('the columns recombine into one value', async () => {
    const host = await wheels('default-value="09:15" locale="en-GB"')
    column(host, 'minute').dispatchEvent(
      new CustomEvent('helix-before-change', {
        bubbles: true,
        composed: true,
        detail: { name: 'minute', value: '45' },
      }),
    )
    await host.updateComplete
    expect(host.value).toBe('09:45')
  })

  test('and midnight and noon are the pair that does not follow the pattern', async () => {
    /* On a twelve hour clock 12 AM is midnight and 12 PM is noon, so the hour
       has to be recombined with the meridiem rather than read straight. */
    const host = await wheels('default-value="00:30" locale="en-US"')
    column(host, 'meridiem').dispatchEvent(
      new CustomEvent('helix-before-change', {
        bubbles: true,
        composed: true,
        detail: { name: 'meridiem', value: 'PM' },
      }),
    )
    await host.updateComplete
    expect(host.value).toBe('12:30')

    const noon = await wheels('default-value="12:30" locale="en-US"')
    column(noon, 'meridiem').dispatchEvent(
      new CustomEvent('helix-before-change', {
        bubbles: true,
        composed: true,
        detail: { name: 'meridiem', value: 'AM' },
      }),
    )
    await noon.updateComplete
    expect(noon.value).toBe('00:30')
  })

  test('the minute column offers what the step offers within that hour', async () => {
    const host = await wheels('default-value="09:00" max="17:00" min="09:00" step="20"')
    expect(values(host, 'minute')).toEqual(['0', '20', '40'])
  })
})

describe('time holds more than one', () => {
  const many = async (attrs: string): Promise<Time> => {
    const host = (await mount(
      `<helix-headless-time-picker ${attrs}></helix-headless-time-picker>`,
    )) as Time
    await host.updateComplete
    return host
  }

  const announce = async (host: Time, value: string): Promise<void> => {
    part(host, 'list')?.dispatchEvent(
      new CustomEvent('helix-before-change', {
        bubbles: true,
        composed: true,
        detail: { name: 'time', value },
      }),
    )
    await host.updateComplete
  }

  test('a mode puts the list in multiple, which is what marks more than one row', async () => {
    expect((part(await many('mode="range"'), 'list') as HTMLElement).hasAttribute('multiple')).toBe(
      true,
    )
    expect((part(await many(''), 'list') as HTMLElement).hasAttribute('multiple')).toBe(false)
  })

  test('a range keeps two and sorts them, whichever end was pressed first', async () => {
    const host = await many('mode="range"')
    await announce(host, '17:00,09:00')
    expect(host.value).toBe('09:00,17:00')
  })

  test('and a third pick starts over from that third one', async () => {
    /* The calendar's behavior, so a reader who has met one has met both.
       Working out which is newest by difference rather than by position, since
       a toggle removes as easily as it adds. */
    const host = await many('default-value="09:00,17:00" mode="range"')
    await announce(host, '09:00,17:00,12:00')
    expect(host.value).toBe('12:00')
  })

  test('the times inside a range are marked, without having been chosen', async () => {
    const host = await many('default-value="09:00,10:00" max="11:00" min="09:00" mode="range"')
    const marked = [...(host.shadowRoot?.querySelectorAll('[data-between]') ?? [])].map((one) =>
      one.getAttribute('value'),
    )
    // The ends are chosen rather than between, so they are not in this list.
    expect(marked).toEqual(['09:15', '09:30', '09:45'])
  })

  test('and are a part of their own too, which the ends are not', async () => {
    const host = await many('default-value="09:00,10:00" max="11:00" min="09:00" mode="range"')
    const named = [...(host.shadowRoot?.querySelectorAll('[part~="option-between"]') ?? [])].map(
      (one) => one.getAttribute('value'),
    )
    expect(named).toEqual(['09:15', '09:30', '09:45'])
  })

  test('a multiple keeps whatever the list announced', async () => {
    const host = await many('mode="multiple"')
    await announce(host, '09:00,12:00,15:00')
    expect(host.value).toBe('09:00,12:00,15:00')
  })

  test('a mode falls back to the list, because a wheel holds one value', async () => {
    // A range on wheels is two sets of wheels, which is two controls, and a
    // multiple is a set, which a wheel cannot hold by construction.
    const host = await many('variant="wheels" mode="range"')
    expect(part(host, 'list')).not.toBeNull()
    expect(host.shadowRoot?.querySelector('[part="column"]')).toBeNull()
  })
})

describe('time is off', () => {
  const picker = async (attrs = ''): Promise<Time> => {
    const host = (await mount(
      `<helix-headless-time-picker ${attrs}></helix-headless-time-picker>`,
    )) as Time
    await host.updateComplete
    return host
  }

  test('a disabled picker takes nothing, and says so to the list it renders', async () => {
    /* Both halves, because either alone leaves the other broken: told, so the
       list grays and leaves the tab order; refused, so no path writes a value.
       A `disabled` that reaches only the submitted value leaves rows taking a
       click and the keyboard moving through them. */
    const host = await picker('default-value="09:00" disabled')
    const list = part(host, 'list') as HTMLElement
    expect(list.hasAttribute('disabled')).toBe(true)

    list.dispatchEvent(
      new CustomEvent('helix-before-change', {
        bubbles: true,
        composed: true,
        detail: { name: 'time', value: '17:00' },
      }),
    )
    await host.updateComplete
    expect(host.value).toBe('09:00')
  })

  test('and the wheels refuse on the same terms, which is a separate path in', async () => {
    // `moveColumn` rebuilds the value from three columns and never reaches
    // `handleChange`, so a guard on one says nothing about the other.
    const host = await picker('variant="wheels" default-value="09:00" disabled')
    const column = host.shadowRoot?.querySelector('[part="column"]') as HTMLElement
    expect(column.hasAttribute('disabled')).toBe(true)

    column.dispatchEvent(
      new CustomEvent('helix-before-change', {
        bubbles: true,
        composed: true,
        detail: { name: 'time', value: '17' },
      }),
    )
    await host.updateComplete
    expect(host.value).toBe('09:00')
  })
})

describe('times can be taken out of the list by name', () => {
  const picker = async (attrs = ''): Promise<Time> => {
    const host = (await mount(
      `<helix-headless-time-picker ${attrs}></helix-headless-time-picker>`,
    )) as Time
    await host.updateComplete
    return host
  }

  const barred = (host: Time): string[] =>
    [...(host.shadowRoot?.querySelectorAll('[part~="option"][disabled]') ?? [])].map(
      (one) => one.getAttribute('value') ?? '',
    )

  test('a named time is offered and refused, rather than absent', async () => {
    /* Absent is what `min` and `max` do, and it is the wrong answer for a
       booking: a reader looking for 09:30 has to see that it exists and is
       taken, or they conclude the list is wrong. */
    const host = await picker('disable-times="09:30,11:00" max="12:00" min="09:00"')
    expect(barred(host)).toEqual(['09:30', '11:00'])
    // Still in the list, which is the half that says "taken" rather than "no".
    const shown = [...(host.shadowRoot?.querySelectorAll('[part~="option"]') ?? [])].map((one) =>
      one.getAttribute('value'),
    )
    expect(shown).toContain('09:30')
  })

  test('and a barred time is refused even when something announces it directly', async () => {
    const host = await picker('default-value="09:00" disable-times="09:30" max="12:00" min="09:00"')
    part(host, 'list')?.dispatchEvent(
      new CustomEvent('helix-before-change', {
        bubbles: true,
        composed: true,
        detail: { name: 'time', value: '09:30' },
      }),
    )
    await host.updateComplete
    expect(host.value).toBe('09:00')
  })

  test('the wheels refuse it too, which they reach by their own path', async () => {
    /* `moveColumn` rebuilds the value from three columns, so a reader on 09:00
       moving the hour to 10 lands on 10:00 without any option in the hour
       column having been disabled. */
    const host = await picker(
      'variant="wheels" default-value="09:00" disable-times="10:00" max="12:00" min="09:00" step="60"',
    )
    const hour = host.shadowRoot?.querySelector('[data-column="hour"]') as HTMLElement
    hour.dispatchEvent(
      new CustomEvent('helix-before-change', {
        bubbles: true,
        composed: true,
        detail: { name: 'time', value: '10' },
      }),
    )
    await host.updateComplete
    expect(host.value).toBe('09:00')
  })

  test('an hour is only closed when every time in it is', async () => {
    // One free minute is a reason to open the wheel, not to close it.
    const host = await picker(
      'variant="wheels" disable-times="10:00,10:15,10:30,10:45,11:00" max="11:59" min="10:00"',
    )
    const shut = [...(host.shadowRoot?.querySelectorAll('[data-column="hour"] [disabled]') ?? [])]
      .map((one) => one.getAttribute('value'))
      .sort()
    expect(shut).toEqual(['10'])
  })
})

describe('a time picker drawn from outside', () => {
  /* The options are in this element's shadow root, so a stylesheet reaches a
     chosen row only through the name the option gives it and this element
     forwards. */
  test('the chosen time’s row carries its state as a part name, forwarded', async () => {
    const host = await picker('default-value="09:30"')
    const chosen = options(host).find((one) => one.getAttribute('value') === '09:30')
    const other = options(host).find((one) => one.getAttribute('value') === '09:45')
    const row = (one?: HTMLElement): string =>
      one?.shadowRoot?.querySelector('[part~="item"]')?.getAttribute('part') ?? ''
    expect(row(chosen)).toContain('item-selected')
    expect(row(other)).not.toContain('item-selected')
    expect(chosen?.getAttribute('exportparts')).toContain('item-selected: option-item-selected')
  })
})

describe('a time picker opens on its answer', () => {
  /* The headless tier draws no bound on the list, and a list with none has
     nothing to scroll, so the spec writes the one every sheet drawing it does.
     `::part()` because it is the published door, and a document rule beats a
     shadow one. */
  const BOUND = `helix-headless-time-picker::part(list-items) {
    display: block;
    max-block-size: 14rem;
    overflow-y: auto;
  }
  helix-headless-time-picker::part(option) {
    display: block;
  }`

  test('a list holding a time shows that time, rather than midnight', async () => {
    if (!hasLayout()) {
      return
    }
    const sheet = document.createElement('style')
    sheet.textContent = BOUND
    document.head.append(sheet)
    try {
      const host = await picker('default-value="09:30"')
      const items = part(part(host, 'list') as HTMLElement, 'items') as HTMLElement
      const chosen = options(host).find((one) => one.getAttribute('value') === '09:30')
      /* It brings itself there once its rows exist, which is after its own
         first update, so the check waits on the rows too. */
      await Promise.all(
        options(host).map((one) => (one as Partial<Time>).updateComplete ?? Promise.resolve()),
      )
      await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))
      const box = items.getBoundingClientRect()
      const row = (chosen as HTMLElement).getBoundingClientRect()
      expect(items.scrollTop).toBeGreaterThan(0)
      expect(row.top).toBeGreaterThanOrEqual(box.top)
      expect(row.bottom).toBeLessThanOrEqual(box.bottom)
    } finally {
      sheet.remove()
    }
  })
})

describe('a grid of times that refuses or insists', () => {
  /* The two form-control properties this class writes out rather than taking
     from `MixinField`, because it is composed into a field that already has a
     label and a feedback region.
   *
   * **Neither changes the render, which is the thing to know about them.** A
   * read-only grid draws the same rows with the same tab stops, and a required
   * one carries no `aria-required`, so the fact reaches a reader only through
   * the validity the surrounding field reports. What is asserted is therefore
   * the behavior each has, since that is the whole of what each does. */
  test('read-only refuses a press and keeps the time it was given', async () => {
    const host = await picker('readonly default-value="09:00"')
    expect((host as Time & { requestValue: (next: string) => boolean }).requestValue('10:30')).toBe(
      false,
    )
    await host.updateComplete
    expect(host.value).toBe('09:00')
  })

  test('and the same request moves an ordinary grid, which is the control', async () => {
    const host = await picker('default-value="09:00"')
    expect((host as Time & { requestValue: (next: string) => boolean }).requestValue('10:30')).toBe(
      true,
    )
    await host.updateComplete
    expect(host.value).toBe('10:30')
  })

  test('required and empty is reported as missing, and a chosen time clears it', async () => {
    /* The message and the anchor are what a form's own report shows, so the
       verdict has to be on this element rather than on the field around it. */
    const host = await picker('required')
    const internals = (host as Time & { internals: ElementInternals }).internals
    expect(internals.validity.valid).toBe(false)
    expect(internals.validationMessage).toBe('Choose a time.')
    ;(host as Time & { requestValue: (next: string) => boolean }).requestValue('10:30')
    await host.updateComplete
    expect(internals.validity.valid).toBe(true)
  })

  test('and a grid nobody insisted on is valid while empty', async () => {
    const host = await picker('')
    expect((host as Time & { internals: ElementInternals }).internals.validity.valid).toBe(true)
  })
})

describe('the wheels stay inside the bounds', () => {
  const turn = async (host: Time, which: string, value: string): Promise<void> => {
    host.shadowRoot?.querySelector(`[data-column="${which}"]`)?.dispatchEvent(
      new CustomEvent('helix-before-change', {
        bubbles: true,
        composed: true,
        detail: { value },
      }),
    )
    await host.updateComplete
  }

  /* Measured before this: from 16:45, the hour 5 built 17:45 against a max of
     17:00, and AM built 05:45 against a min of 09:00, and both were valid. */
  test('a turn that would leave them lands on the nearest time on offer', async () => {
    const attrs = 'variant="wheels" locale="en-US" min="09:00" max="17:00" default-value="16:45"'
    const late = await picker(attrs)
    await turn(late, 'hour', '5')
    expect(late.value).toBe('17:00')
    const early = await picker(attrs)
    await turn(early, 'meridiem', 'AM')
    expect(early.value).toBe('09:00')
  })
})

describe('a time outside what the picker offers', () => {
  type Checked = Time & { internals: ElementInternals }

  test('is invalid, with the bound it is past', async () => {
    const late = (await picker('max="17:00" default-value="18:00"')) as Checked
    expect(late.internals.validity.rangeOverflow).toBe(true)
    const early = (await picker('min="09:00" default-value="08:00"')) as Checked
    expect(early.internals.validity.rangeUnderflow).toBe(true)
  })

  test('and so is a barred one, or one off the step', async () => {
    const barred = (await picker('disable-times="10:00 11:00" default-value="10:00"')) as Checked
    expect(barred.internals.validity.valid).toBe(false)
    const off = (await picker('default-value="09:07"')) as Checked
    expect(off.internals.validity.stepMismatch).toBe(true)
    const fine = (await picker('default-value="09:15"')) as Checked
    expect(fine.internals.validity.valid).toBe(true)
  })
})

describe('the words on the wheels', () => {
  const column = (host: Time, which: string): HTMLElement =>
    host.shadowRoot?.querySelector(`[data-column="${which}"]`) as HTMLElement

  test('are properties, and the halves of the day are the locale’s', async () => {
    const host = await picker(
      'variant="wheels" locale="ko-KR" hour-label="시" minute-label="분" meridiem-label="오전 또는 오후"',
    )
    expect(column(host, 'hour').getAttribute('aria-label')).toBe('시')
    expect(column(host, 'minute').getAttribute('aria-label')).toBe('분')
    const halves = [...column(host, 'meridiem').querySelectorAll('[part~="option"]')]
    expect(halves.map((one) => one.getAttribute('value'))).toEqual(['AM', 'PM'])
    expect(halves.map((one) => one.textContent?.trim())).toEqual(['오전', '오후'])
  })
})

describe('the name of a time picker', () => {
  test('is the host’s aria-label where it has one', async () => {
    const host = await picker('aria-label="Slot"')
    expect(part(host, 'list')?.getAttribute('aria-label')).toBe('Slot')
  })

  test('and the words its aria-labelledby names', async () => {
    const host = (await mount(
      '<helix-headless-time-picker aria-labelledby="named"></helix-headless-time-picker><span id="named">Opening</span>',
    )) as Time
    await host.updateComplete
    expect(part(host, 'list')?.getAttribute('aria-label')).toBe('Opening')
  })
})

describe('focus on a time picker', () => {
  test('goes to the first wheel where there is no list', async () => {
    const host = await picker('variant="wheels" locale="en-GB"')
    host.focus()
    expect(host.shadowRoot?.activeElement?.getAttribute('data-column')).toBe('hour')
  })
})

describe('a clock and a precision of your choosing', () => {
  /* Web Awesome's time input has seconds, and both peers let a page set the
     clock; Helix had neither. */
  const wheels = async (attrs = ''): Promise<Time> => {
    const host = (await mount(
      `<helix-headless-time-picker variant="wheels" ${attrs}></helix-headless-time-picker>`,
    )) as Time
    await host.updateComplete
    return host
  }
  const column = (host: Time, which: string): HTMLElement =>
    host.shadowRoot?.querySelector(`[data-column="${which}"]`) as HTMLElement

  test('hour-cycle writes the twenty-four hour clock in a locale that writes twelve', async () => {
    const list = await picker('locale="en-US" hour-cycle="h23" min="13:00" max="13:00"')
    expect(options(list)[0]?.textContent?.trim()).toBe('13:00')
    const host = await wheels('locale="en-US" hour-cycle="h23"')
    expect(column(host, 'meridiem')).toBeNull()
    expect(column(host, 'hour').querySelectorAll('[part~="option"]')).toHaveLength(24)
  })

  test('and the twelve hour clock in one that writes twenty-four', async () => {
    const host = await wheels('locale="en-GB" hour-cycle="h12"')
    expect(column(host, 'meridiem')).not.toBeNull()
  })

  test('seconds add a wheel, and step counts seconds', async () => {
    const host = await wheels('seconds step="15" default-value="09:15:30" locale="en-GB"')
    const seconds = [...column(host, 'second').querySelectorAll('[part~="option"]')].map((one) =>
      one.getAttribute('value'),
    )
    expect(seconds).toEqual(['0', '15', '30', '45'])
    column(host, 'second').dispatchEvent(
      new CustomEvent('helix-before-change', {
        bubbles: true,
        composed: true,
        detail: { value: '45' },
      }),
    )
    await host.updateComplete
    expect(host.value).toBe('09:15:45')
  })

  test('a list with seconds writes them on every row and in the value', async () => {
    const host = await picker('seconds step="30" min="09:00:00" max="09:01:00" locale="en-US"')
    expect(options(host).map((one) => one.getAttribute('value'))).toEqual([
      '09:00:00',
      '09:00:30',
      '09:01:00',
    ])
    expect(options(host)[1]?.textContent?.trim()).toBe('9:00:30 AM')
  })

  test('Left and Right move between the wheels, and stop at the ends', async () => {
    const host = await wheels('locale="en-GB" default-value="09:15"')
    const hour = column(host, 'hour') as HTMLElement & { focus(): void }
    const minute = column(host, 'minute')
    let focused: Element | null = null
    minute.focus = () => {
      focused = minute
    }
    const right = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      composed: true,
      key: 'ArrowRight',
    })
    hour.dispatchEvent(right)
    expect(right.defaultPrevented).toBe(true)
    expect(focused).toBe(minute)
    const past = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      composed: true,
      key: 'ArrowRight',
    })
    minute.dispatchEvent(past)
    expect(past.defaultPrevented).toBe(false)
  })
})
