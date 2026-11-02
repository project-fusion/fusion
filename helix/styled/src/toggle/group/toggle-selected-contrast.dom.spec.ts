import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, registerDom } from '@fusion.dev/helix-testing/dom'

/* The selected segment against its groove in dark, where the shadow that lifts it
   in light does not show. Measured November 1, 2026: `overlay` on `sunken` was
   1.06:1, fainter than the hover wash on an unselected segment at 1.38:1. The press wash is 1.84:1. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../tabs/index.js')
})

const run = hasLayout() ? test : (): void => {}

/** A color as painted over a ground, as channels from 0 to 255. */
const paint = (color: string, ground = 'rgb(255, 255, 255)'): number[] => {
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  const context = canvas.getContext('2d') as CanvasRenderingContext2D
  context.fillStyle = ground
  context.fillRect(0, 0, 1, 1)
  context.fillStyle = color
  context.fillRect(0, 0, 1, 1)
  return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3)
}

const luminance = (channels: number[]): number => {
  const [r = 0, g = 0, b = 0] = channels.map((one) => {
    const s = one / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

const ratio = (one: number[], other: number[]): number => {
  const [high = 0, low = 0] = [luminance(one), luminance(other)].sort((a, b) => b - a)
  return (high + 0.05) / (low + 0.05)
}

const fill = (element: Element | null | undefined): string =>
  getComputedStyle(element as Element).backgroundColor

const MARKUP = `<div data-color-mode="dark">
  <helix-toggle-group id="toggles" default-value="a">
    <helix-toggle value="a">One</helix-toggle>
    <helix-toggle value="b">Two</helix-toggle>
  </helix-toggle-group>
  <helix-tabs id="tabs" marker="segmented" default-value="a">
    <helix-tab value="a">One</helix-tab>
    <helix-tab value="b">Two</helix-tab>
    <helix-tab-panel value="a">x</helix-tab-panel>
    <helix-tab-panel value="b">y</helix-tab-panel>
  </helix-tabs>
</div>`

describe('a selected segment in dark stands off its groove', () => {
  for (const [id, groove] of [
    ['toggles', 'track'],
    ['tabs', 'tabs'],
  ] as const) {
    run(id, async () => {
      const root = await mount(MARKUP)
      const host = root.querySelector(`#${id}`) as HTMLElement & {
        updateComplete: Promise<unknown>
      }
      await host.updateComplete
      const shadow = host.shadowRoot
      const ground = paint(fill(shadow?.querySelector(`[part="${groove}"]`)))
      const mark = paint(
        fill(shadow?.querySelector('[part="indicator"]')),
        `rgb(${ground.join(' ')})`,
      )
      expect(ratio(mark, ground)).toBeGreaterThanOrEqual(1.5)
    })
  }

  run('a selected tab paints nothing over the mark', async () => {
    const root = await mount(MARKUP)
    const tab = root.querySelector('helix-tab[value="a"]') as HTMLElement & {
      updateComplete: Promise<unknown>
    }
    await tab.updateComplete
    expect(fill(tab.shadowRoot?.querySelector('[part="tab"]'))).toBe('rgba(0, 0, 0, 0)')
  })
})
