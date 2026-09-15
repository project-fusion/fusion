import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, part, registerDom } from '@fusion.dev/helix-testing/dom'
import sheet from '../.examples/preview.css' with { type: 'text' }
import preview from '../.examples/preview.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Chart = HTMLElement & {
  pointer: { set(at: number): void }
  updateComplete: Promise<unknown>
}

/* Browser only: what is asserted is where the preview's own sheet puts things. */
const run = hasLayout() ? test : (): void => {}

/**
 * A reading's bubble, flipped below the tallest bar by the top of the window.
 *
 * Every chart hangs its bubble above the reading and draws it through
 * `drawTooltip`, and the preview drew its point through
 * `::part(tooltip-arrow)`, which could name no edge from outside: the sheet
 * pinned the bottom one. A chart at the top of a page has no room above its
 * tallest bar, the bubble flips below it, and the point hung off the far side
 * pointing down at nothing. The sheet draws the shape now and the controller
 * puts it on the edge facing the reading.
 */
describe('the preview’s reading bubble, flipped below the bar', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('dir')
  })

  for (const direction of ['ltr', 'rtl']) {
    run(`points up at the reading from the middle of its top edge, ${direction}`, async () => {
      document.documentElement.dir = direction
      await example(preview, sheet)
      const host = document.querySelector('helix-headless-bar-chart') as Chart
      /* The reading nearest the top of the window, which is the tallest bar. */
      const mark = (): DOMRect | undefined =>
        host.shadowRoot?.querySelector('#helix-chart-mark')?.getBoundingClientRect()
      let tallest = 0
      let highest = Number.POSITIVE_INFINITY
      for (let at = 0; at < 4; at += 1) {
        host.pointer.set(at)
        await host.updateComplete
        const top = mark()?.top ?? Number.POSITIVE_INFINITY
        if (top < highest) {
          highest = top
          tallest = at
        }
      }
      host.pointer.set(tallest)
      await idle()
      const tip = part(host, 'tooltip-anchor') as HTMLElement
      const bubble = part(tip, 'tooltip') as HTMLElement
      const arrow = part(tip, 'arrow') as HTMLElement
      const anchor = mark() as DOMRect
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
