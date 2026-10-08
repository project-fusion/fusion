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
    `<div>${table(readings)}<helix-headless-isometric-heatmap for="commits" ${attributes}></helix-headless-isometric-heatmap></div>`,
  )) as HTMLElement
  const element = host.querySelector('helix-headless-isometric-heatmap') as Relief
  await element.updateComplete
  return element
}

const cells = (element: HTMLElement) => [
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

  /* The right face spans the prism's height and half a cell more, which is
     its own slope across the page, so the difference is the height alone. */
  test('a reading twice another stands twice as tall', async () => {
    const element = await relief('relief="4"', [
      ['Mon', 2],
      ['Tue', 4],
      ['Wed', 0],
    ])
    const [low, high, none] = cells(element)
    const slope = tallness(side(none))
    expect(tallness(side(high)) - slope).toBeCloseTo(4, 2)
    expect(tallness(side(low)) - slope).toBeCloseTo(2, 2)
  })

  test('flat lays every prism down', async () => {
    const element = await relief('flat', [
      ['Mon', 2],
      ['Tue', 4],
    ])
    const [low, high] = cells(element)
    expect(tallness(side(high))).toBeCloseTo(tallness(side(low)), 3)
    element.flat = false
    await element.updateComplete
    expect(tallness(side(cells(element)[1]))).toBeGreaterThan(tallness(side(low)))
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
    expect(part(element, 'strip')?.getAttribute('style')).toBe('--isometric-heatmap-span: 9')
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
  })
})

describe('nothing to draw', () => {
  test('an empty table draws no drawing and says so', async () => {
    const element = await relief('', [])
    expect(part(element, 'drawing')).toBeNull()
    expect(part(element, 'empty')?.textContent?.trim()).toBe('No readings')
  })
})
