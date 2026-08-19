import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Time = HTMLElement & { updateComplete: Promise<unknown>; value: string }

const picker = async (attrs = ''): Promise<Time> => {
  const host = (await mount(`<helix-time ${attrs}></helix-time>`)) as Time
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

  test('the step is honoured, and counted from `min` rather than from midnight', async () => {
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
    host.addEventListener('helix-change', (event) => {
      said.push((event as CustomEvent<{ value: string }>).detail.value)
    })
    part(host, 'list')?.dispatchEvent(
      new CustomEvent('helix-change', {
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
    expect(part(await picker(), 'list')?.tagName.toLowerCase()).toBe('helix-listbox')
  })
})

describe('time as a spinner', () => {
  const spinner = async (attrs = ''): Promise<Time> => {
    const host = (await mount(`<helix-time appearance="spinner" ${attrs}></helix-time>`)) as Time
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
    const host = await spinner('locale="en-GB"')
    expect(host.shadowRoot?.querySelector('[part="list"]')).toBeNull()
    expect(values(host, 'hour')).toHaveLength(24)
    expect(values(host, 'minute')).toEqual(['0', '15', '30', '45'])
  })

  test('a meridiem column only where the locale writes one', async () => {
    // Asked of `Intl` rather than derived from a list of locales, because that
    // is exactly the question `resolvedOptions` answers.
    expect(column(await spinner('locale="en-GB"'), 'meridiem')).toBeNull()
    expect(values(await spinner('locale="en-US"'), 'meridiem')).toEqual(['AM', 'PM'])
  })

  test('the hour column reads one to twelve on a twelve hour clock, once each', async () => {
    // 13:00 and 01:00 are both "1", and offering it twice is offering a choice
    // that is not one.
    const host = await spinner('locale="en-US"')
    expect(values(host, 'hour')).toHaveLength(12)
    expect(values(host, 'hour')).toContain('12')
    expect(values(host, 'hour')).toContain('1')
  })

  test('the columns recombine into one value', async () => {
    const host = await spinner('default-value="09:15" locale="en-GB"')
    column(host, 'minute').dispatchEvent(
      new CustomEvent('helix-change', {
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
    const host = await spinner('default-value="00:30" locale="en-US"')
    column(host, 'meridiem').dispatchEvent(
      new CustomEvent('helix-change', {
        bubbles: true,
        composed: true,
        detail: { name: 'meridiem', value: 'PM' },
      }),
    )
    await host.updateComplete
    expect(host.value).toBe('12:30')

    const noon = await spinner('default-value="12:30" locale="en-US"')
    column(noon, 'meridiem').dispatchEvent(
      new CustomEvent('helix-change', {
        bubbles: true,
        composed: true,
        detail: { name: 'meridiem', value: 'AM' },
      }),
    )
    await noon.updateComplete
    expect(noon.value).toBe('00:30')
  })

  test('the minute column offers what the step offers within that hour', async () => {
    const host = await spinner('default-value="09:00" max="17:00" min="09:00" step="20"')
    expect(values(host, 'minute')).toEqual(['0', '20', '40'])
  })
})
