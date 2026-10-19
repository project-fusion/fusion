import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import {
  hasLayout,
  idle,
  mount,
  part,
  readyToMove,
  registerDom,
  settled,
} from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* The stylesheet the element adopts, as text. happy-dom resolves no cascade,
   so what can be held here is that a rule exists rather than that it applied. */
const sheet = (): string => {
  const declared = (customElements.get('helix-line-chart') as unknown as { styles: unknown }).styles
  return (Array.isArray(declared) ? declared : [declared])
    .flat(Number.POSITIVE_INFINITY)
    .map((one) => String((one as { cssText?: string }).cssText ?? ''))
    .join('\n')
}

/** The declarations of every rule written for `selector` outside a starting style. */
const resting = (selector: string): string[] =>
  sheet()
    .replace(/@starting-style\s*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '')
    .split(`${selector} {`)
    .slice(1)
    .map((one) => one.split('}')[0] ?? '')

/** A path's length on screen, in CSS pixels, through whatever stretches it. */
const onScreen = (path: SVGPathElement): number => {
  const matrix = path.getScreenCTM() as DOMMatrix
  const total = path.getTotalLength()
  let length = 0
  let last: DOMPoint | undefined
  for (let step = 0; step <= 500; step += 1) {
    const point = path.getPointAtLength((total * step) / 500).matrixTransform(matrix)
    length += last ? Math.hypot(point.x - last.x, point.y - last.y) : 0
    last = point
  }
  return length
}

const run = hasLayout() ? test : (): void => {}

/* The line draws in behind a dash a thousand pixels long, and the stroke is
   `non-scaling-stroke`, so the dash is in screen pixels. Left at rest, it cut
   every line longer than that: twelve months alternating 10 and 90 at 900
   pixels wide are 2,071 pixels of line, and July to November were not drawn.
   Run the browser half with `bun run specs:browser line-chart`. */
describe('the draw-in', () => {
  test('sets the dash in the starting style alone, so a line at rest has none', () => {
    const rules = resting('[part~="line"]')
    expect(rules.length).toBeGreaterThan(0)
    for (const body of rules) {
      expect(body).not.toContain('stroke-dasharray:')
    }
    expect(sheet()).toContain('stroke-dasharray var(--helix-duration-slow) step-end allow-discrete')
  })

  run('leaves a line longer than the dash whole once it has drawn', async () => {
    const host = (await mount(
      '<helix-line-chart label="Monthly" style="display: block; inline-size: 900px"></helix-line-chart>',
    )) as HTMLElement & { data: unknown; updateComplete: Promise<unknown> }
    /* After the element settles, so the line arrives with its transitions on
       and draws in. */
    await readyToMove(host)
    const months = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ')
    host.data = {
      columns: ['Month', 'Sales'],
      rows: months.map((month, index) => [month, index % 2 ? 90 : 10]),
    }
    await host.updateComplete
    const line = part(host, 'line') as SVGPathElement
    expect(getComputedStyle(line).strokeDasharray).not.toBe('none')
    await settled(line)
    expect(onScreen(line)).toBeGreaterThan(1000)
    expect(getComputedStyle(line).strokeDasharray).toBe('none')
  })
})

/** Where each drawn name's text lands across the page, from the text itself. */
const names = (host: HTMLElement): Array<{ left: number; right: number; text: string }> =>
  [...(host.shadowRoot?.querySelectorAll('[part~="label"]') ?? [])].map((one) => {
    const range = document.createRange()
    range.selectNodeContents(one)
    const box = range.getBoundingClientRect()
    return { left: box.left, right: box.right, text: one.textContent ?? '' }
  })

/** Whether no two names touch, read across the page from its left. */
const apart = (drawn: Array<{ left: number; right: number }>): boolean =>
  [...drawn]
    .sort((a, b) => a.left - b.left)
    .every((one, place, all) => place === 0 || one.left >= (all[place - 1]?.right ?? 0))

/* Ten thousand readings put ten thousand names in a grid of equal columns,
   each under a tenth of a pixel wide. Run the browser half with
   `bun run specs:browser line-chart`. */
describe('the names under the plot', () => {
  const long = async (width: number, dir = 'ltr'): Promise<HTMLElement> => {
    const host = (
      await mount(
        `<div dir="${dir}"><helix-line-chart label="Load" style="display: grid; inline-size: ${width}px"></helix-line-chart></div>`,
      )
    ).querySelector('helix-line-chart') as HTMLElement & { data: unknown }
    host.data = {
      columns: ['At', 'Load'],
      rows: Array.from({ length: 10_000 }, (_, at) => [`p${at}`, at % 97]),
    }
    await idle()
    return host
  }

  run('are the names that fit, none touching, with the first and the last', async () => {
    for (const width of [900, 390]) {
      const host = await long(width)
      const drawn = names(host)
      const row = (part(host, 'labels') as HTMLElement).getBoundingClientRect()
      expect(drawn.length).toBeLessThan(width / 20)
      expect(apart(drawn)).toBe(true)
      expect([drawn[0]?.text, drawn.at(-1)?.text]).toEqual(['p0', 'p9999'])
      expect(Math.min(...drawn.map((one) => one.left))).toBeGreaterThanOrEqual(row.left)
      expect(Math.max(...drawn.map((one) => one.right))).toBeLessThanOrEqual(row.right)
    }
  })

  run('are worked out again when the chart is resized', async () => {
    const host = await long(900)
    const wide = names(host).length
    host.style.inlineSize = '300px'
    await idle()
    expect(names(host).length).toBeLessThan(wide)
    expect(apart(names(host))).toBe(true)
  })

  run('start at the right on a right-to-left page, where the drawing starts', async () => {
    const host = await long(600, 'rtl')
    const drawn = names(host)
    expect(drawn[0]?.text).toBe('p0')
    expect(drawn[0]?.left).toBeGreaterThan(drawn.at(-1)?.right ?? Number.POSITIVE_INFINITY)
    expect(apart(drawn)).toBe(true)
  })

  run('are every name in its own slot where every name fits', async () => {
    const host = (await mount(
      '<helix-line-chart label="Months" style="display: grid; inline-size: 600px"></helix-line-chart>',
    )) as HTMLElement & { data: unknown }
    const months = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ')
    host.data = { columns: ['Month', 'Sales'], rows: months.map((month, at) => [month, at]) }
    await idle()
    expect(names(host).map((one) => one.text)).toEqual(months)
    const plot = (part(host, 'plot') as HTMLElement).getBoundingClientRect()
    const [first] = names(host)
    /* Centered under its reading, at the middle of the first twelfth. */
    expect(((first?.left ?? 0) + (first?.right ?? 0)) / 2 - plot.left).toBeCloseTo(600 / 24, 0)
  })
})
