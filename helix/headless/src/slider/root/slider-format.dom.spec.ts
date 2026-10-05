import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Slider = HTMLElement & {
  formatter?: (value: number) => string
  updateComplete: Promise<unknown>
  value: string
}

const slider = async (attrs = ''): Promise<Slider> => {
  const host = (await mount(
    `<helix-headless-slider label="Price" ${attrs}></helix-headless-slider>`,
  )) as Slider
  await host.updateComplete
  return host
}

const thumbs = (host: Slider): HTMLInputElement[] => [
  ...(host.shadowRoot as ShadowRoot).querySelectorAll<HTMLInputElement>('[part="control"]'),
]

const move = async (host: Slider, which: 'end' | 'start', to: string): Promise<void> => {
  const control = thumbs(host).find((one) => one.dataset.thumb === which) as HTMLInputElement
  control.value = to
  control.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
  await host.updateComplete
}

describe('a formatted slider', () => {
  /* React Aria's formatOptions and Web Awesome's valueFormatter: the value a
     reader hears and sees is the currency, not the bare number. */
  test('format-options writes the value a reader hears and the readout shows', async () => {
    const host = await slider(
      `value="20" show-value locale="en-US" format-options='{"style":"currency","currency":"USD","maximumFractionDigits":0}'`,
    )
    expect(thumbs(host)[0]?.getAttribute('aria-valuetext')).toBe('$20')
    expect(part(host, 'output')?.textContent).toBe('$20')
  })

  test('value-text wraps the formatted value in a sentence', async () => {
    const host = await slider(
      `value="0.4" min="0" max="1" step="0.1" value-text="{value} of the budget" format-options='{"style":"percent"}' locale="en-US"`,
    )
    expect(thumbs(host)[0]?.getAttribute('aria-valuetext')).toBe('40% of the budget')
  })

  test('a formatter writes words, on the thumb and on the marker labels', async () => {
    const host = await slider('min="1" max="3" value="2" markers="3" marker-labels')
    host.formatter = (value) => ['Low', 'Medium', 'High'][value - 1] ?? String(value)
    await host.updateComplete
    expect(thumbs(host)[0]?.getAttribute('aria-valuetext')).toBe('Medium')
    const labels = [...(host.shadowRoot?.querySelectorAll('[part="marker-label"]') ?? [])]
    expect(labels.map((label) => label.textContent)).toEqual(['Low', 'Medium', 'High'])
  })

  test('without either, the value is the bare number, as before', async () => {
    const host = await slider('value="20" show-value')
    expect(thumbs(host)[0]?.hasAttribute('aria-valuetext')).toBe(false)
    expect(part(host, 'output')?.textContent).toBe('20')
  })
})

describe('a minimum distance between thumbs', () => {
  /* Zag's minStepsBetweenThumbs. */
  test('a thumb pushed closer stops that many steps away, and says so', async () => {
    const host = await slider('range default-value="20,60" step="5" min-steps-between-thumbs="2"')
    await move(host, 'start', '58')
    expect(host.value).toBe('50,60')
    await move(host, 'end', '20')
    expect(host.value).toBe('50,60')
    const [start, end] = thumbs(host)
    expect(start?.getAttribute('aria-valuemax')).toBe('50')
    expect(end?.getAttribute('aria-valuemin')).toBe('60')
  })
})
