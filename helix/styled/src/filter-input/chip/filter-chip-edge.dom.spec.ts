import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, registerDom } from '@fusion.dev/helix-testing/dom'

/* The chip's edge against its own fill. Measured in Chromium on November 1, 2026:
   `color-border` on the sunken fill was 1.03:1 in light, which draws no edge. The
   step from the fill is 1.27:1 in light and 1.16:1 in dark. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const run = hasLayout() ? test : (): void => {}

/** A color as painted, as channels from 0 to 255. */
const paint = (color: string): number[] => {
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  const context = canvas.getContext('2d') as CanvasRenderingContext2D
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

describe('a filter chip draws an edge against its fill', () => {
  for (const [mode, least] of [
    ['light', 1.2],
    ['dark', 1.15],
  ] as const) {
    run(mode, async () => {
      const root = await mount(
        `<div data-color-mode="${mode}"><helix-filter-chip label="Owner">Ada</helix-filter-chip></div>`,
      )
      const chip = root.querySelector('helix-filter-chip') as HTMLElement & {
        updateComplete: Promise<unknown>
      }
      await chip.updateComplete
      const style = getComputedStyle(chip)
      expect(
        ratio(paint(style.borderTopColor), paint(style.backgroundColor)),
      ).toBeGreaterThanOrEqual(least)
    })
  }

  run('the border hook still sets the edge', async () => {
    const chip = await mount(
      '<helix-filter-chip label="Owner" style="--filter-input-chip-border-color: rgb(1, 2, 3)">Ada</helix-filter-chip>',
    )
    expect(getComputedStyle(chip).borderTopColor).toBe('rgb(1, 2, 3)')
  })
})
