import { beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

/* The frame, after hydration. The table's reading is held by
 * `grid.pure.spec.ts`; what is here is what the frame publishes for a
 * renderer, what it draws until one has, and the keys. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

interface Plot extends HTMLElement {
  active: number
  drawn(on?: boolean): void
  field: { acrosses: number[]; cells: { label?: string; value?: number }[]; depths: number[] }
  requestActive(index: number): void
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

const plot = async () => {
  const host = (await mount(
    `<div>${table}<helix-headless-spatial-surface-chart for="load"><div class="box"></div></helix-headless-spatial-surface-chart></div>`,
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

  test('draws the grid flat until a renderer has drawn, each place by its height', async () => {
    const element = await plot()
    const fallback = part(element, 'fallback')
    expect(fallback?.getAttribute('style')).toContain('--spatial-surface-chart-columns: 3')
    const cells = [...(element.shadowRoot?.querySelectorAll('[part~="cell"]') ?? [])]
    expect(cells).toHaveLength(6)
    /* The first day at the back, on top, as the renderer first shows it: day 1, then day 2. */
    expect(cells[0]?.getAttribute('style')).toContain('--spatial-surface-chart-level: 0')
    expect(cells[2]?.getAttribute('style')).toContain('--spatial-surface-chart-level: 1')
    expect(cells[5]?.hasAttribute('style')).toBe(false)
    element.drawn()
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
