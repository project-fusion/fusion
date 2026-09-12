import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

/* What the bands look like against one another, and what a pointer reads.
   Run them with `bun run specs:browser area-chart`. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const geometry = hasLayout() ? test : (): void => {}

const TABLE = `<table id="visits" data-hidden-visually>
  <caption>Visits by source</caption>
  <thead><tr><th scope="col">Month</th><th scope="col">Search</th><th scope="col">Direct</th></tr></thead>
  <tbody>
    <tr><th scope="row">Jan</th><td data-value="30">30</td><td data-value="10">10</td></tr>
    <tr><th scope="row">Feb</th><td data-value="40">40</td><td data-value="20">20</td></tr>
    <tr><th scope="row">Mar</th><td data-value="50">50</td><td data-value="30">30</td></tr>
  </tbody>
</table>`

type Chart = HTMLElement & { updateComplete: Promise<unknown> }

const frames = async (host: Chart): Promise<void> => {
  for (let pass = 0; pass < 3; pass++) {
    await new Promise((resolve) => requestAnimationFrame(resolve))
    await host.updateComplete
  }
}

const chart = async (): Promise<Chart> => {
  await mount(
    `<div style="inline-size: 30rem">${TABLE}<helix-area-chart for="visits"></helix-area-chart></div>`,
  )
  const host = document.querySelector('helix-area-chart') as Chart
  await frames(host)
  return host
}

const all = (host: HTMLElement, name: string): SVGGraphicsElement[] => [
  ...(host.shadowRoot?.querySelectorAll<SVGGraphicsElement>(`[part="${name}"]`) ?? []),
]

describe('the bands', () => {
  geometry('are opaque, so no band shows another through it', async () => {
    /* Each band is drawn as everything under its edge and covered by the next,
       so a translucent one would show the band behind it as a third color. */
    const host = await chart()
    for (const area of all(host, 'area')) {
      const style = getComputedStyle(area)
      expect(style.opacity).toBe('1')
      expect(style.fillOpacity).toBe('1')
      expect(style.fill).not.toContain('/ 0.')
    }
  })

  geometry('are lighter than the edge drawn on top of them', async () => {
    /* As pixels, because the fill computes to `color(srgb …)` and the stroke to
       `rgb(…)`, and two notations are two strings whatever the colors are. */
    const pixel = (color: string): number => {
      const canvas = document.createElement('canvas')
      canvas.width = 1
      canvas.height = 1
      const context = canvas.getContext('2d') as CanvasRenderingContext2D
      context.fillStyle = color
      context.fillRect(0, 0, 1, 1)
      const [r = 0, g = 0, b = 0] = context.getImageData(0, 0, 1, 1).data
      return r + g + b
    }
    const host = await chart()
    const [area] = all(host, 'area')
    const [line] = all(host, 'line')
    const fill = pixel(getComputedStyle(area as Element).fill)
    const edge = pixel(getComputedStyle(line as Element).stroke)
    expect(fill - edge).toBeGreaterThan(60)
  })

  geometry('fill the plot to the total at its highest reading', async () => {
    const host = await chart()
    const plot = (part(host, 'plot') as HTMLElement).getBoundingClientRect()
    const top = all(host, 'area')[0]?.getBoundingClientRect()
    expect(Math.abs((top?.top ?? 0) - plot.top)).toBeLessThan(2)
    expect(Math.abs((top?.bottom ?? 0) - plot.bottom)).toBeLessThan(2)
  })
})

describe('a pointer', () => {
  geometry('resting on a reading shows every part and the total', async () => {
    const host = await chart()
    const plot = (part(host, 'plot') as HTMLElement).getBoundingClientRect()
    host.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        clientX: plot.left + plot.width * 0.5,
        clientY: plot.top + plot.height / 2,
        composed: true,
        pointerType: 'mouse',
      }),
    )
    await frames(host)
    expect(part(host, 'tooltip-label')?.textContent).toBe('Feb')
    const cells = [...(host.shadowRoot?.querySelectorAll('[part="tooltip-cell"]') ?? [])].map(
      (cell) => cell.textContent?.replace(/\s+/g, ' ').trim(),
    )
    expect(cells).toEqual(['Search 40', 'Direct 20', 'Total 60'])
    expect(all(host, 'guide')).toHaveLength(1)
  })
})
