import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Slider = HTMLElement & { updateComplete: Promise<unknown>; value: string }

/** A step as a browser takes one for a key: the range's value, `input`, then `change`. */
const step = async (host: Slider, to: string): Promise<void> => {
  const control = host.shadowRoot?.querySelector('[part="control"]') as HTMLInputElement
  control.value = to
  control.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
  control.dispatchEvent(new Event('change', { bubbles: true }))
  await host.updateComplete
}

describe('a slider committing a step', () => {
  test('sends change for a step that stands', async () => {
    const host = (await mount(
      '<helix-headless-slider label="Volume" default-value="40"></helix-headless-slider>',
    )) as Slider
    await host.updateComplete
    let changes = 0
    host.addEventListener('change', () => {
      changes += 1
    })
    await step(host, '41')
    expect([host.value, changes]).toEqual(['41', 1])
  })

  test('sends no change for a step before-change refused, which left the value where it was', async () => {
    const host = (await mount(
      '<helix-headless-slider label="Volume" default-value="40"></helix-headless-slider>',
    )) as Slider
    await host.updateComplete
    let changes = 0
    host.addEventListener('helix-before-change', (event) => event.preventDefault())
    host.addEventListener('change', () => {
      changes += 1
    })
    await step(host, '41')
    expect([host.value, changes]).toEqual(['40', 0])
  })
})
