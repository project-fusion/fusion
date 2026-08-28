import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

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
  [...(host.shadowRoot?.querySelectorAll('[part="option"]') ?? [])] as HTMLElement[]

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
    [...column(host, which).querySelectorAll('[part="option"]')].map((one) =>
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
    /* `disabled` reached the value at submit time and nothing else: rows still
       took a click and the keyboard still moved through them. Both halves are
       asserted, because either alone leaves the other broken. Told, so the list
       grays and leaves the tab order; refused, so no path writes a value. */
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
    [...(host.shadowRoot?.querySelectorAll('[part="option"][disabled]') ?? [])].map(
      (one) => one.getAttribute('value') ?? '',
    )

  test('a named time is offered and refused, rather than absent', async () => {
    /* Absent is what `min` and `max` do, and it is the wrong answer for a
       booking: a reader looking for 09:30 has to see that it exists and is
       taken, or they conclude the list is wrong. */
    const host = await picker('disable-times="09:30,11:00" max="12:00" min="09:00"')
    expect(barred(host)).toEqual(['09:30', '11:00'])
    // Still in the list, which is the half that says "taken" rather than "no".
    const shown = [...(host.shadowRoot?.querySelectorAll('[part="option"]') ?? [])].map((one) =>
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
