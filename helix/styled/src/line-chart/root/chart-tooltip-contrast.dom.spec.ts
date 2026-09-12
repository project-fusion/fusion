import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, registerDom } from '@fusion.dev/helix-testing/dom'

/* The words in a chart's reading bubble, against the bubble they sit on, for
   every chart that takes `shared/chart/tooltip.css`.

   Here because nothing else can see them. `check:css:contrast` photographs
   examples at rest and a tooltip is drawn only while a pointer rests on a
   reading, so when Line, Donut and the first Area and Scatter painted a column's
   name in `foreground-muted`, a page color, on the bubble's `surface-inverse`,
   the names came to 3.12:1 in light and 2.37:1 in dark and every check passed.
   Run them with `bun run specs:browser line-chart`. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../area-chart/index.js')
  await import('../../bar-chart/index.js')
  await import('../../donut-chart/index.js')
  await import('../../scatter-chart/index.js')
})

const run = hasLayout() ? test : (): void => {}

const CHARTS = [
  'helix-area-chart',
  'helix-bar-chart',
  'helix-donut-chart',
  'helix-line-chart',
  'helix-scatter-chart',
]

/* Two numeric columns, so the scatter has something across and up and the
   stacked charts have two parts. */
const TABLE = `<table id="readings">
  <caption>Readings</caption>
  <thead><tr><th scope="col">Month</th><th scope="col">Visits</th><th scope="col">Signups</th></tr></thead>
  <tbody>
    <tr><th scope="row">Jan</th><td data-value="3">3</td><td data-value="5">5</td></tr>
    <tr><th scope="row">Feb</th><td data-value="4">4</td><td data-value="6">6</td></tr>
    <tr><th scope="row">Mar</th><td data-value="6">6</td><td data-value="9">9</td></tr>
  </tbody>
</table>`

type Chart = HTMLElement & {
  pointer: { set: (at: number) => void }
  updateComplete: Promise<unknown>
}

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

const ratio = (ink: number[], ground: number[]): number => {
  const [high = 0, low = 0] = [luminance(ink), luminance(ground)].sort((a, b) => b - a)
  return (high + 0.05) / (low + 0.05)
}

const frames = async (host: Chart): Promise<void> => {
  for (let pass = 0; pass < 4; pass++) {
    await new Promise((resolve) => requestAnimationFrame(resolve))
    await host.updateComplete
  }
}

/* The scatter answers the point a pointer is nearest rather than a slot, so it
   is asked the way a reader asks it; the rest are told which reading. */
const open = async (tag: string): Promise<Chart> => {
  await mount(`<div style="inline-size: 30rem">${TABLE}<${tag} for="readings"></${tag}></div>`)
  const host = document.querySelector(tag) as Chart
  await frames(host)
  const point = host.shadowRoot?.querySelector('[part="point"]')
  if (point) {
    const box = point.getBoundingClientRect()
    host.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        clientX: box.left + box.width / 2,
        clientY: box.top + box.height / 2,
        composed: true,
        pointerType: 'mouse',
      }),
    )
  } else {
    host.pointer.set(0)
  }
  await frames(host)
  return host
}

describe('the words in a chart’s reading bubble', () => {
  for (const scheme of ['light', 'dark']) {
    run(`clear 4.5:1 against the bubble in ${scheme}`, async () => {
      document.documentElement.style.colorScheme = scheme
      /* Collected rather than asserted one at a time, so a failure names every
         chart and part that fell short, with what it came to. */
      const short: string[] = []
      try {
        for (const tag of CHARTS) {
          const host = await open(tag)
          const anchor = host.shadowRoot?.querySelector('[part="tooltip-anchor"]')
          const bubble = anchor?.shadowRoot?.querySelector('[part="tooltip"]')
          expect(bubble).toBeTruthy()
          const ground = paint(getComputedStyle(bubble as Element).backgroundColor)
          for (const name of ['tooltip-label', 'tooltip-name', 'tooltip-value']) {
            const words = host.shadowRoot?.querySelector(`[part="${name}"]`) as Element
            const style = getComputedStyle(words)
            const opacity = Number(style.opacity)
            const ink = paint(style.color).map(
              (channel, index) => channel * opacity + (ground[index] ?? 0) * (1 - opacity),
            )
            const measured = ratio(ink, ground)
            if (measured < 4.5) {
              short.push(`${tag} ${name} ${measured.toFixed(2)}:1`)
            }
          }
        }
        expect(short).toEqual([])
      } finally {
        document.documentElement.style.colorScheme = ''
      }
    })
  }
})
