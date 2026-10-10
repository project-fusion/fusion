import { beforeAll, describe, expect, test } from 'bun:test'
import {
  hasLayout,
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
