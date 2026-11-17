import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type SlidingNumber = HTMLElement & { value?: number; updateComplete: Promise<unknown> }

const figures = (host: HTMLElement): string[] =>
  [...(host.shadowRoot?.querySelectorAll<HTMLElement>('[part="digit"]') ?? [])].map((digit) =>
    digit.style.getPropertyValue('--_figure'),
  )

describe('sliding number', () => {
  test('gives each digit a column holding its figure, and reads the number once', async () => {
    const host = (await mount('<helix-sliding-number></helix-sliding-number>')) as SlidingNumber
    host.value = 1284
    await host.updateComplete
    expect(figures(host)).toEqual(['1', '2', '8', '4'])
    expect(host.shadowRoot?.querySelector('[part="character"]')?.textContent).toBe(',')
    expect(host.shadowRoot?.querySelector('[data-spoken]')?.textContent).toBe('1,284')
    expect(host.shadowRoot?.querySelector('[part="value"]')?.getAttribute('aria-hidden')).toBe(
      'true',
    )
  })

  test('keeps each column by its place from the end, so the units stay the units', async () => {
    const host = (await mount('<helix-sliding-number></helix-sliding-number>')) as SlidingNumber
    host.value = 99
    await host.updateComplete
    const units = host.shadowRoot?.querySelectorAll('[part="digit"]')[1]
    host.value = 100
    await host.updateComplete
    const columns = host.shadowRoot?.querySelectorAll('[part="digit"]')
    expect(columns?.[2]).toBe(units)
    expect(figures(host)).toEqual(['1', '0', '0'])
  })

  test('draws nothing where the value is not a number', async () => {
    const host = (await mount('<helix-sliding-number></helix-sliding-number>')) as SlidingNumber
    expect(host.shadowRoot?.querySelector('[part="value"]')).toBe(null)
  })
})
