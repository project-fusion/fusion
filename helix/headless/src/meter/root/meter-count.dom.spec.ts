import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Meter = HTMLElement & {
  showValue: boolean
  updateComplete: Promise<unknown>
  value: number
}

describe('a meter given a new value', () => {
  test('counts the number shown, hidden from screen readers, and speaks the new reading', async () => {
    const meter = (await mount(
      '<helix-headless-meter label="Storage"></helix-headless-meter>',
    )) as Meter
    meter.value = 40
    meter.showValue = true
    await meter.updateComplete
    meter.style.setProperty('--meter-count-duration', '320ms')
    const clock = { progress: 0.5 }
    meter.animate = (() =>
      ({
        cancel: () => {},
        effect: { getComputedTiming: () => ({ progress: clock.progress }) },
        playState: 'running',
      }) as unknown as Animation) as HTMLElement['animate']
    meter.value = 80
    await meter.updateComplete
    await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))
    await meter.updateComplete
    expect(part(meter, 'value')?.textContent?.trim()).toBe('60%')
    expect(part(meter, 'value')?.getAttribute('aria-hidden')).toBe('true')
    expect(meter.shadowRoot?.querySelector('[data-spoken]')?.textContent?.trim()).toBe('80%')
  })
})
