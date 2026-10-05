import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, part, registerDom } from '@fusion.dev/helix-testing/dom'
import sheet from '../.examples/preview.css' with { type: 'text' }
import preview from '../.examples/preview.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* Browser only: what is asserted is where the preview's own sheet puts things. */
const run = hasLayout() ? test : (): void => {}

/**
 * A cell's bubble, flipped below a strip at the top of the window.
 *
 * A heatmap asks for the top, and a strip is a row of small cells that is
 * often the first thing on a status page, so the bubble flips below it more
 * often than not. The preview pinned `::part(tooltip-arrow)` to the bottom
 * edge, the only one it could name from outside, and the point hung off the
 * far side of a bubble below the strip. The sheet draws the shape now and the
 * controller puts it on the edge facing the cell.
 */
describe('the preview’s cell bubble, flipped below the strip', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('dir')
  })

  for (const direction of ['ltr', 'rtl']) {
    run(`points up at the cell from the middle of its top edge, ${direction}`, async () => {
      document.documentElement.dir = direction
      await example(preview, sheet)
      const host = document.querySelector('helix-headless-heatmap') as HTMLElement
      const cell = host.shadowRoot?.querySelectorAll('[part~="cell"]')[4] as HTMLElement
      // A mouse: a touch does not open the bubble.
      cell.dispatchEvent(
        new PointerEvent('pointerover', { bubbles: true, composed: true, pointerType: 'mouse' }),
      )
      await idle()
      const tip = part(host, 'tooltip-anchor') as HTMLElement
      const bubble = part(tip, 'tooltip') as HTMLElement
      const arrow = part(tip, 'arrow') as HTMLElement
      const mark = host.shadowRoot?.querySelector('#helix-chart-mark') as HTMLElement
      const anchor = mark.getBoundingClientRect()
      expect(anchor.top).toBeLessThan(40)
      expect(getComputedStyle(arrow).rotate).toBe('45deg')
      expect(bubble.getAttribute('data-placement')).toBe('bottom')
      const edge = bubble.getBoundingClientRect()
      const point = arrow.getBoundingClientRect()
      expect(edge.top).toBeGreaterThanOrEqual(anchor.bottom)
      expect(Math.abs(point.top + point.height / 2 - edge.top)).toBeLessThanOrEqual(1)
      expect(
        Math.abs(point.left + point.width / 2 - (anchor.left + anchor.width / 2)),
      ).toBeLessThanOrEqual(1)
    })
  }
})
