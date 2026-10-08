import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import type { GraphLooks, NodeLook } from '../connect-graph/looks.js'

let isometricDriver: typeof import('./isometric-driver.js').isometricDriver

beforeAll(async () => {
  registerDom()
  ;({ isometricDriver } = await import('./isometric-driver.js'))
})

/* The drawing, after the connector has handed the driver a graph. The
 * geometry is held by `geometry.pure.spec.ts`; what is here is what the driver
 * writes into the page and how it answers the frame. */

const looksOf = (over: Partial<Record<string, Partial<NodeLook>>> = {}): GraphLooks => ({
  colorOf: () => 'rgb(40, 120, 200)',
  font: 'Inter',
  ground: 'rgb(250, 250, 250)',
  ink: 'rgb(10, 10, 10)',
  link: (source) => ({ color: 'rgb(0, 0, 255)', hidden: false, raised: source === 'gateway' }),
  node: (id) => ({
    color: 'rgb(40, 120, 200)',
    glow: 0,
    hidden: false,
    label: 'room',
    raised: false,
    selected: false,
    ...over[id],
  }),
  overlay: 'rgb(255, 255, 255)',
  quiet: 'rgb(90, 90, 90)',
})

const nodes = [
  { id: 'gateway', label: 'Gateway', size: 3, x: 0, y: 0 },
  { id: 'orders', label: 'Orders', size: 2, x: 2, y: 0 },
  { id: 'ledger', label: 'Ledger', size: 2, x: 3, y: 2 },
]

const links = [
  { source: 'gateway', target: 'orders' },
  { source: 'orders', target: 'ledger' },
]

const drawn = (over: Partial<Record<string, Partial<NodeLook>>> = {}) => {
  const box = document.createElement('div')
  document.body.append(box)
  const driver = isometricDriver(box)
  driver.draw({ links, nodes })
  driver.look(looksOf(over))
  const svg = box.querySelector('svg') as SVGSVGElement
  const layer = (name: string) => svg.querySelector(`[data-layer="${name}"]`) as SVGGElement
  return { box, driver, layer, svg }
}

describe('isometricDriver', () => {
  test('draws an SVG in the box, hidden from a reader, who reads the frame’s list', () => {
    const { svg } = drawn()
    expect(svg.getAttribute('aria-hidden')).toBe('true')
    expect(svg.getAttribute('viewBox')?.split(' ')).toHaveLength(4)
  })

  test('draws each note as a solid, back to front, a block where the note gives no shape', () => {
    const { layer } = drawn()
    const solids = [...layer('notes').children]
    /* The ledger is further across than the orders block and two cells
       further back, so it stands behind it on the page and is painted first. */
    expect(solids.map((one) => one.getAttribute('data-id'))).toEqual([
      'gateway',
      'ledger',
      'orders',
    ])
    expect(solids[0]?.querySelectorAll('path')).toHaveLength(3)
  })

  test("a note's shape picks its solid: a cylinder shows two faces and a pyramid two", () => {
    const { layer } = drawn({ ledger: { shape: 'circle' }, orders: { shape: 'diamond' } })
    const faces = (id: string) =>
      layer('notes').querySelector(`[data-id="${id}"]`)?.querySelectorAll('path').length
    expect(faces('ledger')).toBe(2)
    expect(faces('orders')).toBe(2)
  })

  test("each face is shaded from the note's color, the right side darker than the left", () => {
    const { layer } = drawn()
    const [left, right, top] = [
      ...(layer('notes').querySelector('[data-id="gateway"]')?.querySelectorAll('path') ?? []),
    ].map((face) => face.getAttribute('fill'))
    expect(top).toBe('rgb(40, 120, 200)')
    expect(left).toBe('rgb(32, 96, 160)')
    expect(right).toBe('rgb(26, 77, 128)')
  })

  test('a link runs along the floor with an arrow, and a raised one is drawn last', () => {
    const { layer } = drawn()
    const paths = [...layer('links').querySelectorAll('path')]
    /* A line and an arrow for each link. */
    expect(paths).toHaveLength(4)
    const raised = paths[2]
    expect(raised?.getAttribute('stroke-width')).toBe('2')
  })

  test('names are drawn where the looks give them, and never where they say never', () => {
    const { layer } = drawn({ gateway: { label: 'always' }, orders: { label: 'never' } })
    const named = [...layer('names').querySelectorAll('text')].map((text) => text.textContent)
    expect(named).toContain('Gateway')
    expect(named).not.toContain('Orders')
  })

  test('the selected note is ringed and lit beneath, and a hidden one is not drawn', () => {
    const { layer } = drawn({ gateway: { selected: true }, ledger: { hidden: true } })
    const gateway = layer('notes').querySelector('[data-id="gateway"]')
    /* The glow, three faces, and the ring. */
    expect(gateway?.querySelectorAll('path')).toHaveLength(5)
    expect(layer('notes').querySelector('[data-id="ledger"]')).toBeNull()
  })

  test('each group stands on a plate, with its name written on the floor', () => {
    const { driver, layer } = drawn()
    driver.groups?.([
      { color: 'rgb(200, 80, 40)', faded: false, ids: ['gateway', 'orders'], name: 'Edge' },
    ])
    expect(layer('plates').querySelectorAll('path')).toHaveLength(1)
    const name = [...layer('names').querySelectorAll('text')].find(
      (text) => text.textContent === 'EDGE',
    )
    expect(name?.getAttribute('transform')).toMatch(/^matrix\(/)
  })

  test('a press on a solid says which note, and a press on the floor says none', () => {
    const { driver, layer, svg } = drawn()
    const heard: (string | undefined)[] = []
    driver.onPress?.((id) => heard.push(id))
    const press = (target: Element) => {
      target.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 1 }),
      )
      target.dispatchEvent(
        new PointerEvent('pointerup', { bubbles: true, button: 0, pointerId: 1 }),
      )
    }
    press(layer('notes').querySelector('[data-id="orders"] path') as Element)
    press(svg)
    expect(heard).toEqual(['orders', undefined])
  })

  test('a pan moves the view by pixels, and the box follows', () => {
    const { driver, svg } = drawn()
    const before = svg.getAttribute('viewBox')?.split(' ').map(Number) ?? []
    driver.panBy(48, 0, false)
    const after = svg.getAttribute('viewBox')?.split(' ').map(Number) ?? []
    expect((after[0] ?? 0) - (before[0] ?? 0)).toBeGreaterThan(0)
    expect(after[1]).toBe(before[1] as number)
  })

  test('a note with no place is put on a free cell, and every place is told', async () => {
    const { driver } = drawn()
    driver.update?.(
      {
        addLinks: [{ source: 'orders', target: 'cache' }],
        addNodes: [{ id: 'cache', label: 'Cache', size: 1, x: 2.3, y: 0.2 }],
        changeNodes: [],
        removeLinks: [],
        removeNodes: [],
      },
      false,
    )
    const told = await new Promise<ReadonlyMap<string, { x: number; y: number }>>((resolve) => {
      driver.settle?.(new Set(['cache']), resolve)
    })
    expect(told.get('orders')).toEqual({ x: 2, y: 0 })
    const cache = told.get('cache')
    expect(Number.isInteger(cache?.x) && Number.isInteger(cache?.y)).toBe(true)
    expect(cache).not.toEqual({ x: 2, y: 0 })
  })

  test('stopping takes the drawing away', () => {
    const { box, driver } = drawn()
    driver.stop?.()
    expect(box.querySelector('svg')).toBeNull()
  })
})
