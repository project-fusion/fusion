import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'
import type { HelixHeadlessSpatialRibbonChart } from './spatial-ribbon-chart-root.js'

/* The frame, after hydration. The table's reading and the faces are held by
 * `ribbons.pure.spec.ts`; what is here is what the frame publishes, what it
 * draws until a renderer has, and the keys. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

interface Plot extends HTMLElement {
  active: number
  field: { categories: string[]; cells: { value?: number }[]; series: string[] }
  rendererDrawn(on?: boolean): void
  updateComplete: Promise<unknown>
}

const table = `<table id="latency" data-hidden-visually>
  <caption>Latency</caption>
  <thead><tr><th>Day</th><th>Frankfurt</th><th>Virginia</th></tr></thead>
  <tbody>
    <tr><th scope="row">Mon</th><td>120</td><td>95</td></tr>
    <tr><th scope="row">Tue</th><td>130</td><td>90</td></tr>
    <tr><th scope="row">Wed</th><td>110</td><td>99</td></tr>
  </tbody>
</table>`

const plot = async (attributes = '') => {
  const host = (await mount(
    `<div>${table}<helix-headless-spatial-ribbon-chart for="latency" ${attributes}><div></div></helix-headless-spatial-ribbon-chart></div>`,
  )) as HTMLElement
  const element = host.querySelector('helix-headless-spatial-ribbon-chart') as Plot
  await element.updateComplete
  return element
}

const key = (element: HTMLElement, name: string) =>
  part(element, 'plot')?.dispatchEvent(
    new KeyboardEvent('keydown', { bubbles: true, cancelable: true, composed: true, key: name }),
  )

describe('the frame', () => {
  test('publishes the readings, a place across and a series in depth', async () => {
    const element = await plot()
    expect(element.field.categories).toEqual(['Mon', 'Tue', 'Wed'])
    expect(element.field.series).toEqual(['Frankfurt', 'Virginia'])
    expect(element.field.cells.map((cell) => cell.value)).toEqual([120, 95, 130, 90, 110, 99])
  })

  test('draws a ribbon for each series in its color until a renderer has drawn', async () => {
    const element = await plot()
    const ribbons = [...(element.shadowRoot?.querySelectorAll('[part="ribbon"]') ?? [])]
    expect(ribbons).toHaveLength(2)
    const series = ribbons.map(
      (one) => /--chart-series-(\d+)/.exec(one.getAttribute('style') ?? '')?.[1],
    )
    expect(new Set(series)).toEqual(new Set(['1', '2']))
    for (const face of element.shadowRoot?.querySelectorAll('[part="face"]') ?? []) {
      expect(face.getAttribute('style')).toMatch(/--spatial-ribbon-chart-shade: [\d.]+/)
    }
    element.rendererDrawn()
    await element.updateComplete
    expect(part(element, 'fallback')?.hasAttribute('hidden')).toBe(true)
  })

  test('says what it shows in a sentence', async () => {
    const element = await plot()
    expect(part(element, 'summary')?.textContent).toBe(
      '6 readings in 2 series over 3 places, from 90 to 130.',
    )
  })

  test('the keys move across places and between series, and the reading is ringed', async () => {
    const element = await plot()
    key(element, 'Home')
    key(element, 'ArrowRight')
    key(element, 'ArrowDown')
    await element.updateComplete
    expect(element.active).toBe(3)
    expect(part(element, 'live')?.textContent).toContain('Tue')
    expect(part(element, 'live')?.textContent).toContain('Virginia')
    expect(part(element, 'ring')).not.toBeNull()
  })

  test('with no box, draws the ribbons alone, framed around them', async () => {
    const element = await plot('no-box')
    expect(part(element, 'grid')).toBeNull()
    expect(element.shadowRoot?.querySelectorAll('[part="ribbon"]')).toHaveLength(2)
  })
})

/* The chart grows when it is seen, and each frame is a step of the clock, so a
 * growth can be watched from the floor to its readings: a watcher the test
 * decides for, and a clock it moves. */
describe('growing in', () => {
  type Seen = { callback: IntersectionObserverCallback }
  let watchers: Seen[] = []
  let frames: (() => void)[] = []
  let clock = 0
  const real = {
    frame: globalThis.requestAnimationFrame,
    now: performance.now.bind(performance),
    watcher: globalThis.IntersectionObserver,
  }

  beforeEach(() => {
    watchers = []
    frames = []
    clock = 1000
    performance.now = () => clock
    globalThis.requestAnimationFrame = ((run: () => void) => frames.push(run)) as never
    globalThis.IntersectionObserver = class {
      readonly seen: Seen
      constructor(callback: IntersectionObserverCallback) {
        this.seen = { callback }
        watchers.push(this.seen)
      }
      observe(): void {}
      unobserve(): void {}
      takeRecords(): IntersectionObserverEntry[] {
        return []
      }
      disconnect(): void {
        watchers = watchers.filter((one) => one !== this.seen)
      }
    } as never
  })

  afterEach(() => {
    performance.now = real.now
    globalThis.requestAnimationFrame = real.frame
    globalThis.IntersectionObserver = real.watcher
    document.documentElement.removeAttribute('data-helix-motion')
  })

  const sees = (on: boolean): void => {
    for (const one of [...watchers]) {
      one.callback([{ isIntersecting: on } as IntersectionObserverEntry], {} as never)
    }
  }

  /* Frames until the readings stand: well past the longest growth. */
  const settle = async (element: HTMLElement & { updateComplete: Promise<unknown> }) => {
    for (let step = 0; step < 12; step += 1) {
      clock += 400
      for (const run of frames.splice(0)) {
        run()
      }
      await element.updateComplete
    }
  }

  test('waits on the floor until the chart is seen', async () => {
    const element = (await plot('grow')) as unknown as HelixHeadlessSpatialRibbonChart
    expect(element.shown.cells.every((cell) => cell.value === undefined || cell.value === 0)).toBe(
      true,
    )
  })

  test('grows in once the chart is seen, and stands at its readings', async () => {
    const element = (await plot('grow')) as unknown as HelixHeadlessSpatialRibbonChart
    sees(true)
    await settle(element)
    expect(element.shown).toEqual(element.field)
    expect(element.shown.cells.every((cell) => cell.value === undefined || cell.value === 0)).toBe(
      false,
    )
  })

  test('stands at its readings at once where the page has paused its motion', async () => {
    document.documentElement.setAttribute('data-helix-motion', 'paused')
    const element = (await plot('grow')) as unknown as HelixHeadlessSpatialRibbonChart
    expect(element.shown.cells.every((cell) => cell.value === undefined || cell.value === 0)).toBe(
      false,
    )
  })

  test('without grow, stands at its readings', async () => {
    const element = (await plot()) as unknown as HelixHeadlessSpatialRibbonChart
    expect(element.shown.cells.every((cell) => cell.value === undefined || cell.value === 0)).toBe(
      false,
    )
  })

  test('under grow-again, stands on the floor again once the chart has left the view', async () => {
    const element = (await plot('grow grow-again')) as unknown as HelixHeadlessSpatialRibbonChart
    sees(true)
    await settle(element)
    sees(false)
    await element.updateComplete
    expect(element.shown.cells.every((cell) => cell.value === undefined || cell.value === 0)).toBe(
      true,
    )
  })
})
