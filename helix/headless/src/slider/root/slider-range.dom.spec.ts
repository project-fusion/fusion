import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@helix-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Slider = HTMLElement & { value: string; updateComplete: Promise<unknown> }

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

describe('a slider with two thumbs', () => {
  test('is two real ranges, not one control drawn twice', async () => {
    /* There is no native two-thumb range, and the answer is not to stop using
       the platform's: each thumb keeps its own drag, arrow keys, Home and End
       and finger-sized hit area. */
    const host = await slider('range default-value="20,70"')
    const controls = thumbs(host)
    expect(controls.length).toBe(2)
    expect(controls.every((one) => one.type === 'range')).toBe(true)
  })

  test('and one thumb without it', async () => {
    expect(thumbs(await slider('default-value="40"')).length).toBe(1)
  })

  test('both span the whole range, so they read against the same track', async () => {
    /* Bounding the lower one by the upper reads well and breaks the drawing: an
       input's thumb sits at a fraction of its own range, so a lower thumb
       bounded at the upper paints against a shorter track and the two stop
       lining up. */
    const host = await slider('range min="0" max="200" default-value="50,150"')
    for (const control of thumbs(host)) {
      expect(control.min).toBe('0')
      expect(control.max).toBe('200')
    }
  })

  test('each thumb says which end it is', async () => {
    const host = await slider('range default-value="20,70"')
    expect(thumbs(host).map((one) => one.getAttribute('aria-label'))).toEqual([
      'Price minimum',
      'Price maximum',
    ])
  })

  test('the lower thumb stops at the upper rather than crossing it', async () => {
    const host = await slider('range default-value="20,70"')
    await move(host, 'start', '90')
    expect(host.value).toBe('70,70')
  })

  test('and the upper stops at the lower', async () => {
    const host = await slider('range default-value="20,70"')
    await move(host, 'end', '5')
    expect(host.value).toBe('20,20')
  })

  test('moving one leaves the other where it was', async () => {
    const host = await slider('range default-value="20,70"')
    await move(host, 'start', '35')
    expect(host.value).toBe('35,70')
  })

  test('with no pair it opens fully wide rather than pinned shut', async () => {
    /* An untouched range slider does not hold an empty string: the native input
       reports its own midpoint and the mixin takes it, so `value` came back as
       "50" here and reading that as the lower thumb put the filter half shut
       before anyone touched it. Only a pair is a pair. */
    const host = await slider('range min="10" max="90"')
    const controls = thumbs(host)
    expect(controls.map((one) => one.value)).toEqual(['10', '90'])
  })

  test('the readout says a span, because the value is one', async () => {
    const host = await slider('range default-value="20,70" show-value')
    expect(part(host, 'output')?.textContent?.trim()).toBe('20 to 70')
  })
})
