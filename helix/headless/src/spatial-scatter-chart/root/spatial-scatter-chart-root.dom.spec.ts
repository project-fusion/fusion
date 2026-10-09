import { beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

/* The frame, after hydration. The table's reading is held by
 * `field.pure.spec.ts`; what is here is what the frame publishes for a
 * renderer, what it draws until one has, and the keys. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

interface Plot extends HTMLElement {
  active: number
  rendererDrawn(on?: boolean): void
  field: { groups: string[]; points: { label: string; x: number }[] }
  requestActive(index: number, kind?: 'mouse' | 'pen' | 'touch'): void
  updateComplete: Promise<unknown>
}

const table = `<table id="people" data-hidden-visually>
  <caption>People</caption>
  <thead><tr><th>Name</th><th>Team</th><th>Age</th><th>Tenure</th><th>Score</th></tr></thead>
  <tbody>
    <tr><th scope="row">Ada</th><td>Core</td><td>36</td><td>4</td><td>81</td></tr>
    <tr><th scope="row">Grace</th><td>Tools</td><td>52</td><td>11</td><td>93</td></tr>
    <tr><th scope="row">Lin</th><td>Core</td><td>29</td><td>2</td><td>70</td></tr>
  </tbody>
</table>`

const plot = async (attributes = 'group-by="Team"') => {
  const host = (await mount(
    `<div>${table}<helix-headless-spatial-scatter-chart for="people" ${attributes}><div class="box"></div></helix-headless-spatial-scatter-chart></div>`,
  )) as HTMLElement
  const element = host.querySelector('helix-headless-spatial-scatter-chart') as Plot
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
  test('publishes the points and groups for a renderer', async () => {
    const element = await plot()
    expect(element.field.points.map((point) => point.label)).toEqual(['Ada', 'Grace', 'Lin'])
    expect(element.field.groups).toEqual(['Core', 'Tools'])
  })

  test('draws the points in 3D itself until a renderer has drawn, each in its group’s color', async () => {
    const element = await plot()
    expect(part(element, 'drawing')?.localName).toBe('svg')
    expect(part(element, 'grid')?.getAttribute('d')).toMatch(/^M/)
    expect(
      [...(element.shadowRoot?.querySelectorAll('[part="axis-name"]') ?? [])].map(
        (name) => name.textContent,
      ),
    ).toEqual(['Age', 'Score', 'Tenure'])
    const points = [...(element.shadowRoot?.querySelectorAll('[part~="point"]') ?? [])]
    expect(points).toHaveLength(3)
    /* Painted back to front, so each says its group's color whatever its place. */
    expect(points.map((point) => point.getAttribute('style')).sort()).toEqual([
      '--chart-series: var(--chart-series-1)',
      '--chart-series: var(--chart-series-1)',
      '--chart-series: var(--chart-series-2)',
    ])
    element.rendererDrawn()
    await element.updateComplete
    expect(part(element, 'fallback')?.hasAttribute('hidden')).toBe(true)
    expect(hasState(element, 'drawn')).toBe(true)
  })

  test('the plot is named, described by its summary, and takes focus', async () => {
    const element = await plot()
    const box = part(element, 'plot')
    expect(box?.getAttribute('aria-label')).toBe('People')
    expect(box?.getAttribute('tabindex')).toBe('0')
    expect(part(element, 'summary')?.textContent).toBe(
      '3 points: Age across, Tenure up, and Score in depth.',
    )
  })

  test("the renderer's box is slotted into the plot", async () => {
    const element = await plot()
    const slot = part(element, 'plot')?.querySelector('slot')
    expect(slot?.assignedElements()[0]?.className).toBe('box')
  })
})

describe('the keys', () => {
  test('the arrows walk the points in table order, and the readout says the row', async () => {
    const element = await plot()
    key(element, 'ArrowRight')
    await element.updateComplete
    expect(element.active).toBe(0)
    key(element, 'ArrowRight')
    await element.updateComplete
    expect(element.active).toBe(1)
    expect(part(element, 'live')?.textContent).toContain('Grace')
  })

  test('Shift with an arrow asks the view to turn, and moves no reading', async () => {
    const element = await plot()
    const turns: unknown[] = []
    element.addEventListener('helix-plot-turn', (event) =>
      turns.push((event as CustomEvent).detail),
    )
    key(element, 'ArrowLeft', true)
    key(element, 'ArrowUp', true)
    await element.updateComplete
    expect(turns).toEqual([
      { across: -1, up: 0 },
      { across: 0, up: 1 },
    ])
    expect(element.active).toBe(-1)
  })

  test('a press in the drawing puts the reading on that point, and the change is told', async () => {
    const element = await plot()
    const kinds: string[] = []
    element.addEventListener('helix-plot-change', (event) =>
      kinds.push((event as CustomEvent).detail.kind),
    )
    element.requestActive(2)
    await element.updateComplete
    expect(element.active).toBe(2)
    expect(kinds).toContain('focus')
  })
})

describe('the tooltip', () => {
  test('shows the reading’s row at its point in the chart’s own drawing, and then where the renderer draws it', async () => {
    const element = (await plot()) as Plot & { placeReading(at?: { x: number; y: number }): void }
    element.requestActive(1)
    element.placeReading({ x: 0.5, y: 0.25 })
    await element.updateComplete
    expect(part(element, 'tooltip-label')?.textContent).toBe('Grace')
    expect(part(element, 'mark')?.parentElement?.localName).toBe('foreignObject')
    expect(part(element, 'ring')).not.toBeNull()
    element.rendererDrawn()
    await element.updateComplete
    expect(part(element, 'tooltip-label')?.textContent).toBe('Grace')
    const mark = part(element, 'mark') as HTMLElement
    expect([mark.style.left, mark.style.top]).toEqual(['50%', '25%'])
  })

  test('a mouse leaving the drawing lets a hovered reading go, and keeps one the keys moved to', async () => {
    const element = await plot()
    element.requestActive(1, 'mouse')
    element.requestActive(-1, 'mouse')
    await element.updateComplete
    expect(element.active).toBe(-1)
    key(element, 'ArrowRight')
    await element.updateComplete
    element.requestActive(-1, 'mouse')
    await element.updateComplete
    expect(element.active).toBe(0)
  })
})

describe('nothing to plot', () => {
  test('a table with no points says so, and the plot is a picture', async () => {
    const host = (await mount(
      `<div><table id="none"><caption>None</caption><tbody></tbody></table><helix-headless-spatial-scatter-chart for="none"></helix-headless-spatial-scatter-chart></div>`,
    )) as HTMLElement
    const element = host.querySelector('helix-headless-spatial-scatter-chart') as Plot
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
