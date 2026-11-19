import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'
import type { HelixHeadlessSpatialSurfaceChart } from './spatial-surface-chart-root.js'

/* The frame, after hydration. The table's reading is held by
 * `grid.pure.spec.ts`; what is here is what the frame publishes for a
 * renderer, what it draws until one has, and the keys. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

interface Plot extends HTMLElement {
  active: number
  rendererDrawn(on?: boolean): void
  field: { acrosses: number[]; cells: { label?: string; value?: number }[]; depths: number[] }
  requestActive(index: number, kind?: 'mouse' | 'pen' | 'touch'): void
  updateComplete: Promise<unknown>
}

/* Three hours across and two days in depth, with no reading for hour 2 of day 2. */
const table = `<table id="load" data-hidden-visually>
  <caption>Load</caption>
  <thead><tr><th>Slot</th><th>Hour</th><th>Day</th><th>Load</th></tr></thead>
  <tbody>
    <tr><th scope="row">Mon 0h</th><td>0</td><td>1</td><td>10</td></tr>
    <tr><th scope="row">Mon 1h</th><td>1</td><td>1</td><td>30</td></tr>
    <tr><th scope="row">Mon 2h</th><td>2</td><td>1</td><td>50</td></tr>
    <tr><th scope="row">Tue 0h</th><td>0</td><td>2</td><td>20</td></tr>
    <tr><th scope="row">Tue 1h</th><td>1</td><td>2</td><td>40</td></tr>
  </tbody>
</table>`

const plot = async (attributes = '') => {
  const host = (await mount(
    `<div>${table}<helix-headless-spatial-surface-chart for="load" ${attributes}><div class="box"></div></helix-headless-spatial-surface-chart></div>`,
  )) as HTMLElement
  const element = host.querySelector('helix-headless-spatial-surface-chart') as Plot
  await element.updateComplete
  return element
}

const key = (element: HTMLElement, name: string, shiftKey = false) =>
  part(element, 'plot')?.dispatchEvent(
    new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      composed: true,
      key: name,
      shiftKey,
    }),
  )

describe('the frame', () => {
  test('publishes the grid for a renderer, across first', async () => {
    const element = await plot()
    expect(element.field.acrosses).toEqual([0, 1, 2])
    expect(element.field.depths).toEqual([1, 2])
    expect(element.field.cells.map((cell) => cell.value)).toEqual([10, 20, 30, 40, 50, undefined])
  })

  test('draws the surface in 3D itself until a renderer has drawn, a face to each square of readings', async () => {
    const element = await plot()
    expect(part(element, 'drawing')?.localName).toBe('svg')
    expect(part(element, 'grid')?.getAttribute('d')).toMatch(/^M/)
    const faces = [...(element.shadowRoot?.querySelectorAll('[part="face"]') ?? [])]
    /* Two squares across one step in depth: the first whole, and the second
       missing hour 2 of day 2, so the triangle of its other three. */
    expect(faces).toHaveLength(2)
    const corners = faces.map((face) => (face.getAttribute('d')?.match(/L/g) ?? []).length + 1)
    expect(corners.sort()).toEqual([3, 4])
    const levels = faces.map((face) =>
      Number(/--spatial-surface-chart-level: ([\d.]+)/.exec(face.getAttribute('style') ?? '')?.[1]),
    )
    expect(levels.sort()).toEqual([0.375, 0.75])
    for (const face of faces) {
      expect(face.getAttribute('style')).toMatch(/--spatial-surface-chart-shade: [\d.]+/)
    }
    const fallback = part(element, 'fallback')
    element.rendererDrawn()
    await element.updateComplete
    expect(fallback?.hasAttribute('hidden')).toBe(true)
    expect(hasState(element, 'drawn')).toBe(true)
  })

  test('the plot is named, described by its summary, and takes focus', async () => {
    const element = await plot()
    const box = part(element, 'plot')
    expect(box?.getAttribute('aria-label')).toBe('Load')
    expect(box?.getAttribute('tabindex')).toBe('0')
    expect(part(element, 'summary')?.textContent).toBe(
      '5 readings of Load over Hour and Day, from 10 to 50.',
    )
  })

  test("the renderer's box is slotted into the plot", async () => {
    const element = await plot()
    const slot = part(element, 'plot')?.querySelector('slot')
    expect(slot?.assignedElements()[0]?.className).toBe('box')
  })
})

describe('the contours', () => {
  test('under contours, the lines at each height inside the readings are drawn on the surface, each after its square', async () => {
    const element = await plot()
    expect(element.shadowRoot?.querySelectorAll('[part="contour"]')).toHaveLength(0)
    element.setAttribute('contours', '')
    await element.updateComplete
    const contours = [...(element.shadowRoot?.querySelectorAll('[part="contour"]') ?? [])]
    expect(contours.length).toBeGreaterThan(0)
    for (const contour of contours) {
      expect(contour.getAttribute('style')).toMatch(/--spatial-surface-chart-level: [\d.]+/)
    }
    /* Each straight after a face, so the faces in front cover it as they cover that face. */
    for (const contour of contours) {
      const before = contour.previousElementSibling?.getAttribute('part')
      expect(before === 'face' || before === 'contour').toBe(true)
    }
  })
})

describe('the keys', () => {
  test('the left and right arrows move across, and the down and up arrows in depth', async () => {
    const element = await plot()
    key(element, 'Home')
    await element.updateComplete
    expect(element.active).toBe(0)
    key(element, 'ArrowRight')
    await element.updateComplete
    expect(element.active).toBe(2)
    key(element, 'ArrowDown')
    await element.updateComplete
    expect(element.active).toBe(3)
    expect(part(element, 'live')?.textContent).toContain('Tue 1h')
  })

  test('a place with no reading is said as open', async () => {
    const element = await plot()
    key(element, 'End')
    await element.updateComplete
    expect(element.active).toBe(5)
    expect(part(element, 'live')?.textContent).toBe('Hour 2, Day 2: no reading')
  })

  test('a reading sent names the row of the table, or none for an open place', async () => {
    const element = await plot()
    const heard: number[] = []
    element.addEventListener('helix-reading-change', (event) =>
      heard.push((event as CustomEvent).detail.index),
    )
    key(element, 'ArrowRight')
    await element.updateComplete
    key(element, 'End')
    await element.updateComplete
    expect(heard).toEqual([0, -1])
  })

  test('Shift with an arrow asks the view to turn, and moves no reading', async () => {
    const element = await plot()
    const turns: unknown[] = []
    element.addEventListener('helix-plot-turn', (event) =>
      turns.push((event as CustomEvent).detail),
    )
    key(element, 'ArrowRight', true)
    key(element, 'ArrowDown', true)
    await element.updateComplete
    expect(turns).toEqual([
      { across: 1, up: 0 },
      { across: 0, up: -1 },
    ])
    expect(element.active).toBe(-1)
  })

  test('a press in the drawing puts the reading on that place, and the change is told', async () => {
    const element = await plot()
    const kinds: string[] = []
    element.addEventListener('helix-plot-change', (event) =>
      kinds.push((event as CustomEvent).detail.kind),
    )
    element.requestActive(4)
    await element.updateComplete
    expect(element.active).toBe(4)
    expect(kinds).toContain('focus')
  })
})

describe('the tooltip', () => {
  test('shows the reading’s row where the renderer draws it, and none for an open place', async () => {
    const element = (await plot()) as Plot & { placeReading(at?: { x: number; y: number }): void }
    element.rendererDrawn()
    element.placeReading({ x: 0.2, y: 0.6 })
    element.requestActive(3)
    await element.updateComplete
    expect(part(element, 'tooltip-label')?.textContent).toBe('Tue 1h')
    element.requestActive(5)
    await element.updateComplete
    expect(part(element, 'tooltip-anchor')).toBeNull()
  })
})

describe('nothing to plot', () => {
  test('a table with no readings says so, and the plot is a picture', async () => {
    const host = (await mount(
      `<div><table id="none"><caption>None</caption><tbody></tbody></table><helix-headless-spatial-surface-chart for="none"></helix-headless-spatial-surface-chart></div>`,
    )) as HTMLElement
    const element = host.querySelector('helix-headless-spatial-surface-chart') as Plot
    await element.updateComplete
    expect(part(element, 'plot')?.getAttribute('role')).toBe('img')
    expect(part(element, 'empty')?.textContent?.trim()).toBe('No readings')
  })
})

describe('a drag', () => {
  const pointer = (type: string, x: number, y: number) =>
    new PointerEvent(type, {
      bubbles: true,
      button: 0,
      clientX: x,
      clientY: y,
      composed: true,
      pointerId: 1,
      pointerType: 'mouse',
    })

  test('across the drawing turns the view, and a press that hardly moves does not', async () => {
    const element = await plot()
    const drawing = part(element, 'drawing') as Element
    const before = part(element, 'grid')?.getAttribute('d')
    drawing.dispatchEvent(pointer('pointerdown', 100, 100))
    drawing.dispatchEvent(pointer('pointermove', 102, 101))
    drawing.dispatchEvent(pointer('pointerup', 102, 101))
    await element.updateComplete
    expect(part(element, 'grid')?.getAttribute('d')).toBe(before)
    drawing.dispatchEvent(pointer('pointerdown', 100, 100))
    drawing.dispatchEvent(pointer('pointermove', 160, 120))
    drawing.dispatchEvent(pointer('pointerup', 160, 120))
    await element.updateComplete
    expect(part(element, 'grid')?.getAttribute('d')).not.toBe(before)
  })

  test('the click that ends a drag presses nothing', async () => {
    const element = await plot()
    const presses: unknown[] = []
    element.addEventListener('helix-reading-press', (event) => presses.push(event))
    /* With a reading on the chart, which a click on the plot presses. */
    ;(element as unknown as { requestActive(index: number): void }).requestActive(0)
    await element.updateComplete
    const drawing = part(element, 'drawing') as Element
    drawing.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    expect(presses).toHaveLength(1)
    drawing.dispatchEvent(pointer('pointerdown', 100, 100))
    drawing.dispatchEvent(pointer('pointermove', 160, 120))
    drawing.dispatchEvent(pointer('pointerup', 160, 120))
    drawing.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    expect(presses).toHaveLength(1)
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

  const install = (): void => {
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
  }

  const restore = (): void => {
    performance.now = real.now
    globalThis.requestAnimationFrame = real.frame
    globalThis.IntersectionObserver = real.watcher
    document.documentElement.removeAttribute('data-helix-motion')
  }

  /* Installed and put back by each test, never by `beforeEach` and
     `afterEach`: the browser harness runs a file's hooks around every test in
     the family, so a clock left to a hook stood in for the page's frames in
     every other spec, and each one waited on a frame that never came. */
  const clocked = (name: string, body: () => Promise<void> | void): void => {
    test(name, async () => {
      install()
      try {
        await body()
      } finally {
        restore()
      }
    })
  }

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

  clocked('waits on the floor until the chart is seen', async () => {
    const element = (await plot('grow')) as unknown as HelixHeadlessSpatialSurfaceChart
    expect(
      element.shown.cells.every(
        (cell) => cell.value === undefined || cell.value === element.field.lowest,
      ),
    ).toBe(true)
  })

  clocked('grows in once the chart is seen, and stands at its readings', async () => {
    const element = (await plot('grow')) as unknown as HelixHeadlessSpatialSurfaceChart
    sees(true)
    await settle(element)
    expect(element.shown).toEqual(element.field)
    expect(
      element.shown.cells.every(
        (cell) => cell.value === undefined || cell.value === element.field.lowest,
      ),
    ).toBe(false)
  })

  clocked('stands at its readings at once where the page has paused its motion', async () => {
    document.documentElement.setAttribute('data-helix-motion', 'paused')
    const element = (await plot('grow')) as unknown as HelixHeadlessSpatialSurfaceChart
    expect(
      element.shown.cells.every(
        (cell) => cell.value === undefined || cell.value === element.field.lowest,
      ),
    ).toBe(false)
  })

  clocked('without grow, stands at its readings', async () => {
    const element = (await plot()) as unknown as HelixHeadlessSpatialSurfaceChart
    expect(
      element.shown.cells.every(
        (cell) => cell.value === undefined || cell.value === element.field.lowest,
      ),
    ).toBe(false)
  })

  clocked(
    'under grow-again, stands on the floor again once the chart has left the view',
    async () => {
      const element = (await plot('grow grow-again')) as unknown as HelixHeadlessSpatialSurfaceChart
      sees(true)
      await settle(element)
      sees(false)
      await element.updateComplete
      expect(
        element.shown.cells.every(
          (cell) => cell.value === undefined || cell.value === element.field.lowest,
        ),
      ).toBe(true)
    },
  )
})
