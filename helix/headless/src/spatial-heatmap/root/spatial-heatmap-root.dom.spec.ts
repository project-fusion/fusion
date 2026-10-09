import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

/* The relief, after hydration.
 *
 * The geometry is held by `projection.pure.spec.ts`, and the keys, the
 * selection, and the overview by Heatmap's own specs, which this class
 * inherits. What is here is the drawing: one prism for each reading, as tall as
 * its share of the highest, in the tone the flat strip would give it. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

interface Relief extends HTMLElement {
  flat: boolean
  relief: number
  requestUpdate: () => void
  updateComplete: Promise<unknown>
  value: string
  visible: number
}

const table = (readings: Array<[string, number, string?]>) =>
  `<table id="commits" data-hidden-visually>
    <caption>Commits</caption>
    <tbody>
      ${readings
        .map(
          ([label, value, tone]) =>
            `<tr><th scope="row">${label}</th><td data-value="${value}"${
              tone ? ` data-tone="${tone}"` : ''
            }>${value}</td></tr>`,
        )
        .join('')}
    </tbody>
  </table>`

const relief = async (attributes: string, readings: Array<[string, number, string?]>) => {
  const host = (await mount(
    `<div>${table(readings)}<helix-headless-spatial-heatmap for="commits" ${attributes}></helix-headless-spatial-heatmap></div>`,
  )) as HTMLElement
  const element = host.querySelector('helix-headless-spatial-heatmap') as Relief
  await element.updateComplete
  return element
}

/** The painted prisms in the order of the readings, which the view may paint in another. */
const cells = (element: HTMLElement) =>
  [...(element.shadowRoot?.querySelectorAll('[part~="cell"]') ?? [])].sort(
    (one, other) =>
      Number(one.getAttribute('data-index')) - Number(other.getAttribute('data-index')),
  )

/** The painted prisms in the order the drawing holds them, which is the order they are painted in. */
const cellsInDocument = (element: HTMLElement) => [
  ...(element.shadowRoot?.querySelectorAll('[part~="cell"]') ?? []),
]

/** How tall a face stands on the page, from the y of each corner in its path. */
const tallness = (face: Element | null | undefined): number => {
  const ys = (face?.getAttribute('d') ?? '')
    .replace(/^M|Z$/g, '')
    .split('L')
    .map((pair) => Number(pair.split(' ')[1]))
  return Math.max(...ys) - Math.min(...ys)
}

const side = (cell: Element | undefined): Element | null | undefined =>
  cell?.querySelector('[part="right-face"]')

describe('the drawing', () => {
  test('draws each reading as a prism with three faces', async () => {
    const element = await relief('', [
      ['Mon', 1],
      ['Tue', 2],
      ['Wed', 3],
    ])
    expect(cells(element)).toHaveLength(3)
    for (const cell of cells(element)) {
      expect([...cell.children].map((face) => face.getAttribute('part'))).toEqual([
        'left-face',
        'right-face',
        'top-face',
      ])
    }
  })

  /* A side spans its prism's height and its own slope across the page, the
     same on every prism, so two sides differ by their heights alone. A
     reading of nothing stands at no height, and shows no side. */
  test('a reading twice another stands twice as tall', async () => {
    const element = await relief('relief="4"', [
      ['Mon', 2],
      ['Tue', 4],
      ['Wed', 0],
    ])
    const [low, high, none] = cells(element)
    expect(tallness(side(high)) - tallness(side(low))).toBeCloseTo(2, 2)
    expect(side(none)).toBeNull()
  })

  test('flat lays every prism down', async () => {
    const element = await relief('flat', [
      ['Mon', 2],
      ['Tue', 4],
    ])
    expect(cells(element).map(side)).toEqual([null, null])
    element.flat = false
    await element.updateComplete
    expect(tallness(side(cells(element)[1]))).toBeGreaterThan(tallness(side(cells(element)[0])))
  })

  test('a cell takes its tone as the flat strip gives it', async () => {
    const element = await relief('thresholds="1 3" tones="1 2"', [
      ['Mon', 0],
      ['Tue', 1],
      ['Wed', 4, 'danger'],
    ])
    const [none, low, marked] = cells(element)
    expect(none?.hasAttribute('style')).toBe(false)
    expect(low?.getAttribute('style')).toBe('--heatmap-tone: var(--heatmap-tone-1)')
    expect(marked?.getAttribute('data-tone')).toBe('danger')
  })

  test('the drawing is mirrored on a right-to-left page and hidden from a reader', async () => {
    const element = await relief('', [['Mon', 1]])
    const drawing = part(element, 'drawing')
    expect(drawing?.hasAttribute('data-mirror')).toBe(true)
    expect(drawing?.getAttribute('aria-hidden')).toBe('true')
  })

  test('the strip says how many cells the drawing spans, columns and rows together', async () => {
    const element = await relief(
      'rows="7"',
      Array.from({ length: 10 }, (_, index): [string, number] => [`Day ${index}`, index]),
    )
    expect(part(element, 'strip')?.getAttribute('style')).toBe('--spatial-heatmap-span: 9')
  })

  test('the box holds the drawing whole', async () => {
    const element = await relief('', [
      ['Mon', 3],
      ['Tue', 1],
    ])
    const [x, y, width, height] = (part(element, 'drawing')?.getAttribute('viewBox') ?? '')
      .split(' ')
      .map(Number)
    expect(width).toBeGreaterThan(0)
    expect(height).toBeGreaterThan(0)
    expect(x).toBeLessThan(0)
    expect(y).toBeLessThan(0)
  })
})

describe('the base and the corners', () => {
  test('the prisms stand on a slab, hidden from a reader and painted first', async () => {
    const element = await relief('rows="2"', [
      ['Mon', 3],
      ['Tue', 1],
      ['Wed', 2],
    ])
    const base = part(element, 'base')
    expect(base?.getAttribute('aria-hidden')).toBe('true')
    expect(part(element, 'drawing')?.firstElementChild).toBe(base)
    expect(
      ['base-left', 'base-right', 'base-top'].map((name) => part(element, name)?.localName),
    ).toEqual(['path', 'path', 'path'])
  })

  test('the footer says where the front edge starts and ends, as shares of the width', async () => {
    const element = await relief('rows="2"', [
      ['Mon', 3],
      ['Tue', 1],
      ['Wed', 2],
    ])
    const style = part(element, 'footer')?.getAttribute('style') ?? ''
    const read = (name: string): number =>
      Number(new RegExp(`--spatial-heatmap-${name}: ([\\d.]+)`).exec(style)?.[1] ?? Number.NaN)
    /* Two columns of two rows: the left corner stands partway down, the
       bottom corner partway across, and the drawing is less tall than wide. */
    expect(read('start-y')).toBeGreaterThan(0)
    expect(read('start-y')).toBeLessThan(read('depth'))
    expect(read('end-x')).toBeGreaterThan(0)
    expect(read('end-x')).toBeLessThan(1)
    expect(read('depth')).toBeGreaterThan(0)
  })
})

describe('a renderer', () => {
  type Framed = Relief & {
    field: {
      cells: Array<{ column: number; height: number; label: string; row: number; tone?: string }>
      columns: number
      rows: number
    }
    rendererDrawn(on?: boolean): void
    requestActive(index: number, kind?: 'mouse' | 'pen' | 'touch'): void
    selectionMode?: string
  }

  const readings: Array<[string, number]> = [
    ['Mon', 4],
    ['Tue', 2],
    ['Wed', 0],
  ]

  test('is told every reading drawn, its place on the grid, its height, and its tone', async () => {
    const element = (await relief('rows="2" thresholds="1 3" tones="1 2"', readings)) as Framed
    expect(element.field.columns).toBe(2)
    expect(element.field.rows).toBe(2)
    expect(element.field.cells.map((cell) => [cell.label, cell.column, cell.row])).toEqual([
      ['Mon', 0, 0],
      ['Tue', 0, 1],
      ['Wed', 1, 0],
    ])
    expect(element.field.cells[0]?.height).toBe(2)
    expect(element.field.cells[1]?.height).toBe(1)
  })

  test('draws over the chart’s own drawing, which stays under it for a reader and the keys', async () => {
    const element = (await relief('rows="2"', readings)) as Framed
    const slot = element.shadowRoot?.querySelector('slot[name="renderer"]')
    expect(slot?.parentElement === part(element, 'strip')).toBe(true)
    element.rendererDrawn()
    await element.updateComplete
    /* Unseen, and never under the pointer: at opacity 0 it painted over the
       renderer's box and took every pointer event from it. */
    expect(part(element, 'drawing')?.getAttribute('style')).toBe('opacity: 0; pointer-events: none')
    expect(part(element, 'drawing')).not.toBeNull()
  })

  test('Shift with an arrow turns its view, and selects instead under multiple selection', async () => {
    const element = (await relief('rows="2"', readings)) as Framed
    const turns: unknown[] = []
    element.addEventListener('helix-plot-turn', (event) =>
      turns.push((event as CustomEvent).detail),
    )
    const shift = (key: string) =>
      part(element, 'strip')?.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, composed: true, key, shiftKey: true }),
      )
    shift('ArrowRight')
    expect(turns).toEqual([])
    element.rendererDrawn()
    await element.updateComplete
    shift('ArrowRight')
    expect(turns).toEqual([{ across: 1, up: 0 }])
    element.setAttribute('selection-mode', 'multiple')
    await element.updateComplete
    shift('ArrowLeft')
    expect(turns).toHaveLength(1)
  })

  test('the first and last labels stand where it draws the ends of the front edge', async () => {
    const element = (await relief('rows="2"', readings)) as Framed & {
      placeCorners(at?: { end: { x: number; y: number }; start: { x: number; y: number } }): void
    }
    const read = (name: string): number => {
      const style = part(element, 'footer')?.getAttribute('style') ?? ''
      return Number(
        new RegExp(`--spatial-heatmap-${name}: ([\\d.]+)`).exec(style)?.[1] ?? Number.NaN,
      )
    }
    /* The chart's own drawing: the start at the left edge, the end at the foot. */
    expect(read('start-x')).toBe(0)
    expect(read('end-y')).toBe(read('depth'))
    element.rendererDrawn()
    element.placeCorners({ end: { x: 0.6, y: 0.9 }, start: { x: 0.2, y: 0.5 } })
    await element.updateComplete
    const depth = read('depth')
    expect(read('start-x')).toBe(0.2)
    expect(read('start-y')).toBeCloseTo(0.5 * depth, 3)
    expect(read('end-x')).toBe(0.6)
    expect(read('end-y')).toBeCloseTo(0.9 * depth, 3)
    /* Out of view, the labels keep where they were. */
    element.placeCorners(undefined)
    await element.updateComplete
    expect(read('start-x')).toBe(0.2)
  })

  test('a reading hovered in its drawing is the chart’s, and is told as a change', async () => {
    const element = (await relief('rows="2"', readings)) as Framed
    const kinds: string[] = []
    element.addEventListener('helix-plot-change', (event) =>
      kinds.push((event as CustomEvent).detail.kind),
    )
    element.requestActive(1, 'mouse')
    await element.updateComplete
    expect(
      element.shadowRoot?.querySelector('[part~="cell-active"]')?.getAttribute('data-index'),
    ).toBe('1')
    expect(kinds).toContain('focus')
  })
})

describe('the width', () => {
  /**
   * **A strip at 30 degrees spends its rows across the page too.** At the
   * smallest cell, eight pixels and a gap of two, a box 100 pixels wide holds
   * 115 pixels of cell edge at 30 degrees, which is eleven pitches of ten.
   * Seven go to the rows, so four columns of seven fit, and the newest are
   * kept.
   */
  test('a narrow box draws the newest whole columns that fit', async () => {
    const element = await relief(
      'rows="7"',
      Array.from({ length: 70 }, (_, index): [string, number] => [`Day ${index}`, index]),
    )
    expect(cells(element)).toHaveLength(70)
    ;(element as unknown as { width: number }).width = 100
    await element.updateComplete
    expect(cells(element)).toHaveLength(28)
    expect(element.visible).toBe(28)
  })

  test('a box too narrow for even the rows still draws one column', async () => {
    const element = await relief(
      'rows="7"',
      Array.from({ length: 14 }, (_, index): [string, number] => [`Day ${index}`, index]),
    )
    ;(element as unknown as { width: number }).width = 20
    await element.updateComplete
    expect(cells(element)).toHaveLength(7)
  })
})

describe('the tooltip', () => {
  test('a pointer on a prism summons one bubble, at the middle of its top face', async () => {
    const element = await relief('', [
      ['Mon', 1],
      ['Tue', 2],
    ])
    cells(element)[1]?.dispatchEvent(
      new PointerEvent('pointerover', { bubbles: true, composed: true, pointerType: 'mouse' }),
    )
    await element.updateComplete
    expect(element.shadowRoot?.querySelectorAll('[part="mark"]')).toHaveLength(1)
    expect(part(element, 'tooltip-label')?.textContent).toBe('Tue')
    expect(cells(element)[1]?.getAttribute('part')).toBe('cell cell-active')
    const style = part(element, 'mark')?.getAttribute('style') ?? ''
    expect(style).toMatch(/%/)
  })
})

describe('selection', () => {
  /* Under `selection-mode` the drawing is the grid's content, so it is not
     hidden, and each prism is a cell a reader hears as selected or not. */
  test('the prisms are grid cells in rows, each saying whether it is selected', async () => {
    const element = await relief('selection-mode="multiple" rows="2"', [
      ['Mon', 1],
      ['Tue', 2],
      ['Wed', 3],
    ])
    element.value = 'Tue'
    await element.updateComplete
    expect(part(element, 'strip')?.getAttribute('role')).toBe('grid')
    const drawing = part(element, 'drawing')
    expect(drawing?.hasAttribute('aria-hidden')).toBe(false)
    expect(drawing?.getAttribute('role')).toBe('none')
    const rows = element.shadowRoot?.querySelectorAll('[role="row"]') ?? []
    expect(rows).toHaveLength(2)
    const selected = [...(element.shadowRoot?.querySelectorAll('[role="gridcell"]') ?? [])].map(
      (cell) => cell.getAttribute('aria-selected'),
    )
    expect(selected).toEqual(['false', 'true', 'false'])
    expect(cells(element)[1]?.getAttribute('part')).toBe('cell cell-selected')
    /* The painted prisms are pictures of the cells, hidden from a reader. */
    expect(cells(element).every((cell) => cell.getAttribute('aria-hidden') === 'true')).toBe(true)
  })

  test('Shift with an arrow turns the view, and the grid keeps the order of the readings', async () => {
    const element = await relief('selection-mode="single" rows="2"', [
      ['Mon', 1],
      ['Tue', 2],
      ['Wed', 3],
      ['Thu', 4],
    ])
    const order = () => cellsInDocument(element).map((cell) => cell.getAttribute('data-index'))
    const before = order()
    const press = (key: string) =>
      part(element, 'strip')?.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, composed: true, key, shiftKey: true }),
      )
    for (let step = 0; step < 12; step++) {
      press('ArrowRight')
    }
    await element.updateComplete
    /* Half round, the newest reading is painted first. */
    expect(order()).not.toEqual(before)
    expect(order()[0]).toBe('3')
    const named = [...(element.shadowRoot?.querySelectorAll('[role="gridcell"]') ?? [])].map(
      (cell) => cell.id,
    )
    expect(named).toEqual(['cell-0', 'cell-1', 'cell-2', 'cell-3'])
  })
})

describe('nothing to draw', () => {
  test('an empty table draws no drawing and says so', async () => {
    const element = await relief('', [])
    expect(part(element, 'drawing')).toBeNull()
    expect(part(element, 'empty')?.textContent?.trim()).toBe('No readings')
  })
})
