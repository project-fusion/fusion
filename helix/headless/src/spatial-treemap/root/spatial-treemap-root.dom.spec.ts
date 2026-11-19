import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'
import type { HelixHeadlessSpatialTreemap } from './spatial-treemap-root.js'

/* The frame, after hydration. The floor's sharing out and the order of
 * painting are held by `blocks.pure.spec.ts`; what is here is what the frame
 * publishes, what it draws until a renderer has, and the keys. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

interface Plot extends HTMLElement {
  active: number
  field: {
    blocks: { label: string; row: number }[]
    groups: string[]
    height: string
    size: string
  }
  rendererDrawn(on?: boolean): void
  updateComplete: Promise<unknown>
}

const table = `<table id="services" data-hidden-visually>
  <caption>Services</caption>
  <thead><tr><th>Service</th><th>Team</th><th>Requests</th><th>Errors</th></tr></thead>
  <tbody>
    <tr><th scope="row">Search</th><td>Platform</td><td>40</td><td>2</td></tr>
    <tr><th scope="row">Billing</th><td>Payments</td><td>25</td><td>9</td></tr>
    <tr><th scope="row">Auth</th><td>Platform</td><td>20</td><td>1</td></tr>
    <tr><th scope="row">Refunds</th><td>Payments</td><td>5</td><td>3</td></tr>
  </tbody>
</table>`

const plot = async (attributes = '') => {
  const host = (await mount(
    `<div>${table}<helix-headless-spatial-treemap for="services" group-by="Team" ${attributes}><div></div></helix-headless-spatial-treemap></div>`,
  )) as HTMLElement
  const element = host.querySelector('helix-headless-spatial-treemap') as Plot
  await element.updateComplete
  return element
}

const key = (element: HTMLElement, name: string) =>
  part(element, 'plot')?.dispatchEvent(
    new KeyboardEvent('keydown', { bubbles: true, cancelable: true, composed: true, key: name }),
  )

describe('the frame', () => {
  test('publishes a block for each row, its size, its height, and its group', async () => {
    const element = await plot()
    expect(element.field.blocks.map((block) => block.label)).toEqual([
      'Search',
      'Billing',
      'Auth',
      'Refunds',
    ])
    expect(element.field.groups).toEqual(['Platform', 'Payments'])
    expect([element.field.size, element.field.height]).toEqual(['Requests', 'Errors'])
  })

  test("draws each block in its group's color until a renderer has drawn", async () => {
    const element = await plot()
    const blocks = [...(element.shadowRoot?.querySelectorAll('[part~="block"]') ?? [])]
    expect(blocks).toHaveLength(4)
    const colorOf = (label: string) => {
      const index = element.field.blocks.findIndex((block) => block.label === label)
      const block = blocks.find((one) => one.getAttribute('data-index') === String(index))
      return /--chart-series-(\d+)/.exec(block?.getAttribute('style') ?? '')?.[1]
    }
    expect(colorOf('Search')).toBe('1')
    expect(colorOf('Auth')).toBe('1')
    expect(colorOf('Billing')).toBe('2')
    for (const face of element.shadowRoot?.querySelectorAll('[part="face"]') ?? []) {
      expect(face.getAttribute('style')).toMatch(/--spatial-treemap-shade: [\d.]+/)
    }
    element.rendererDrawn()
    await element.updateComplete
    expect(part(element, 'fallback')?.hasAttribute('hidden')).toBe(true)
  })

  test('says what it shows in a sentence', async () => {
    const element = await plot()
    expect(part(element, 'summary')?.textContent).toBe('4 items in 2 groups, sized from 5 to 40.')
  })

  test('the keys walk the items in the table’s order, and the item is ringed', async () => {
    const element = await plot()
    key(element, 'Home')
    key(element, 'ArrowRight')
    await element.updateComplete
    expect(element.active).toBe(1)
    expect(part(element, 'live')?.textContent).toContain('Billing')
    expect(part(element, 'ring')?.previousElementSibling?.getAttribute('data-index')).toBe('1')
    expect(part(element, 'ring-behind')?.getAttribute('d')).toBe(
      part(element, 'ring')?.getAttribute('d') ?? '',
    )
    expect(part(element, 'ring-behind')?.nextElementSibling?.localName).toBe('foreignObject')
    key(element, 'End')
    await element.updateComplete
    expect(part(element, 'live')?.textContent).toContain('Refunds')
  })

  test('a press names the row it was read from', async () => {
    const element = await plot()
    const pressed: number[] = []
    element.addEventListener('helix-reading-press', (event) =>
      pressed.push((event as CustomEvent<{ index: number }>).detail.index),
    )
    key(element, 'Home')
    key(element, 'ArrowRight')
    key(element, 'Enter')
    await element.updateComplete
    expect(pressed).toEqual([1])
  })

  test('with no box, draws the blocks alone', async () => {
    const element = await plot('no-box')
    expect(part(element, 'grid')).toBeNull()
    expect(element.shadowRoot?.querySelectorAll('[part~="block"]')).toHaveLength(4)
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
    const element = (await plot('grow')) as unknown as HelixHeadlessSpatialTreemap
    expect(element.shown.blocks.every((block) => block.grown === 0)).toBe(true)
  })

  test('grows in once the chart is seen, and stands at its readings', async () => {
    const element = (await plot('grow')) as unknown as HelixHeadlessSpatialTreemap
    sees(true)
    await settle(element)
    expect(element.shown).toEqual(element.field)
    expect(element.shown.blocks.every((block) => block.grown === 0)).toBe(false)
  })

  test('stands at its readings at once where the page has paused its motion', async () => {
    document.documentElement.setAttribute('data-helix-motion', 'paused')
    const element = (await plot('grow')) as unknown as HelixHeadlessSpatialTreemap
    expect(element.shown.blocks.every((block) => block.grown === 0)).toBe(false)
  })

  test('without grow, stands at its readings', async () => {
    const element = (await plot()) as unknown as HelixHeadlessSpatialTreemap
    expect(element.shown.blocks.every((block) => block.grown === 0)).toBe(false)
  })

  test('under grow-again, stands on the floor again once the chart has left the view', async () => {
    const element = (await plot('grow grow-again')) as unknown as HelixHeadlessSpatialTreemap
    sees(true)
    await settle(element)
    sees(false)
    await element.updateComplete
    expect(element.shown.blocks.every((block) => block.grown === 0)).toBe(true)
  })
})
