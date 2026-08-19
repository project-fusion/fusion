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
