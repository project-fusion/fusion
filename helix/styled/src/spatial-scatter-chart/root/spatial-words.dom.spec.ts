import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, registerDom } from '@fusion.dev/helix-testing/dom'
import bar from '../../spatial-bar-chart/.examples/preview.html' with { type: 'text' }
import ribbon from '../../spatial-ribbon-chart/.examples/preview.html' with { type: 'text' }
import surface from '../../spatial-surface-chart/.examples/preview.html' with { type: 'text' }
import treemap from '../../spatial-treemap/.examples/preview.html' with { type: 'text' }
import scatter from '../.examples/preview.html' with { type: 'text' }

/* The drawing scales through its `viewBox`, and its words stand at the box's 12
   however far it scales. Measured November 1, 2026 in a 342 wide plot: ticks of 7.4
   on Scatter and Surface, 9.6 on Treemap, 9.7 on Ribbon, and 10.4 on Bar. */

beforeAll(async () => {
  registerDom()
  await Promise.all([
    import('../index.js'),
    import('../../spatial-bar-chart/index.js'),
    import('../../spatial-ribbon-chart/index.js'),
    import('../../spatial-surface-chart/index.js'),
    import('../../spatial-treemap/index.js'),
  ])
})

const run = hasLayout() ? test : (): void => {}

const CHARTS: Record<string, unknown> = {
  'helix-spatial-bar-chart': bar,
  'helix-spatial-ribbon-chart': ribbon,
  'helix-spatial-scatter-chart': scatter,
  'helix-spatial-surface-chart': surface,
  'helix-spatial-treemap': treemap,
}

describe('a spatial chart keeps its words readable in a narrow plot', () => {
  for (const [tag, file] of Object.entries(CHARTS)) {
    run(tag, async () => {
      await example(file)
      const chart = document.querySelector(tag) as HTMLElement & {
        updateComplete: Promise<unknown>
      }
      chart.style.inlineSize = '342px'
      for (let pass = 0; pass < 6; pass += 1) {
        await new Promise((resolve) => requestAnimationFrame(resolve))
        await chart.updateComplete
      }
      const words = [...(chart.shadowRoot?.querySelectorAll('text') ?? [])]
      expect(words.length).toBeGreaterThan(0)
      for (const word of words) {
        const matrix = word.getScreenCTM() as DOMMatrix
        const size =
          Number.parseFloat(getComputedStyle(word).fontSize) * Math.hypot(matrix.a, matrix.b)
        expect(size).toBeGreaterThanOrEqual(11.5)
      }
    })
  }
})
