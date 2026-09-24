import { beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Canvas = HTMLElement & {
  data?: unknown
  order: 'spatial' | 'edges'
  show(id: string): void
  updateComplete: Promise<boolean>
}

/**
 * A small board: two cards side by side, one under them, a group around the
 * pair, and arrows from the first through to the last.
 */
const BOARD = {
  edges: [
    { fromNode: 'a', id: 'e1', toNode: 'b' },
    { fromNode: 'b', id: 'e2', label: 'then', toNode: 'c' },
  ],
  nodes: [
    { height: 200, id: 'pair', label: 'The pair', type: 'group', width: 500, x: -20, y: -20 },
    { height: 100, id: 'a', text: 'First', type: 'text', width: 200, x: 0, y: 0 },
    { color: '3', height: 100, id: 'b', text: 'Second', type: 'text', width: 200, x: 260, y: 0 },
    { height: 100, id: 'c', text: 'Third', type: 'text', width: 200, x: 130, y: 300 },
  ],
}

const canvas = async (extra = ''): Promise<Canvas> => {
  const host = (await mount(
    `<helix-headless-canvas label="A board" ${extra}></helix-headless-canvas>`,
  )) as Canvas
  host.data = BOARD
  await host.updateComplete
  return host
}

/** The cards, in the order the template put them. */
const cards = (host: Canvas): HTMLElement[] =>
  [...(host.shadowRoot?.querySelectorAll('[part="card"]') ?? [])] as HTMLElement[]

/** The reading list's entries, as text. */
const index = (host: Canvas): string[] =>
  [...(host.shadowRoot?.querySelectorAll('[part="index-item"]') ?? [])].map((one) =>
    (one.textContent ?? '').replace(/\s+/g, ' ').trim(),
  )

describe('canvas', () => {
  test('a card is placed where the document put it, in the document’s own units', async () => {
    /* Position is data here, which is the whole reason this family draws: there
       is no layout to compute, only arithmetic against the board's extent. */
    const host = await canvas()
    const second = cards(host).find((one) => one.id === 'card-b') as HTMLElement
    const style = second.getAttribute('style') ?? ''
    /* The extent starts at the group, at -20, and the plane keeps a margin of
       32 around it so a group's name and a bowing connector are not clipped. So
       a card the document put at 260 is drawn at 312. */
    expect(style).toContain('--_canvas-card-x: 312px')
    expect(style).toContain('--_canvas-card-y: 52px')
    expect(style).toContain('--_canvas-card-inline-size: 200px')
  })

  test('a card belongs to the smallest group that contains it', async () => {
    const host = await canvas()
    const first = cards(host).find((one) => one.id === 'card-a') as HTMLElement
    const loose = cards(host).find((one) => one.id === 'card-c') as HTMLElement
    expect(first.getAttribute('data-group')).toBe('pair')
    expect(loose.hasAttribute('data-group')).toBe(false)
  })

  test('a group is a group to a screen reader, and a card is an article', async () => {
    const host = await canvas()
    const group = cards(host).find((one) => one.id === 'card-pair') as HTMLElement
    expect(group.getAttribute('role')).toBe('group')
    expect(group.getAttribute('aria-label')).toBe('The pair')
    expect(
      (cards(host).find((one) => one.id === 'card-a') as HTMLElement).getAttribute('role'),
    ).toBe('article')
  })

  test('an edge is drawn between the two cards it names, and a missing one is not', async () => {
    const host = await canvas()
    expect(host.shadowRoot?.querySelectorAll('[part="edge"]')).toHaveLength(2)

    host.data = { edges: [{ fromNode: 'a', id: 'e1', toNode: 'nowhere' }], nodes: BOARD.nodes }
    await host.updateComplete
    expect(host.shadowRoot?.querySelectorAll('[part="edge"]')).toHaveLength(0)
  })

  test('a connector is a real SVG path, not an unknown element wearing the name', async () => {
    /* A nested template is parsed in the namespace its tag names, so a `<path>`
       built with `html` inside an `<svg>` takes every attribute, answers
       `querySelector`, and paints nothing at all. Asserting the presence of a
       part cannot tell the two apart; asserting the namespace can. */
    const host = await canvas()
    const path = host.shadowRoot?.querySelector('[part="edge"]')
    expect(path?.namespaceURI).toBe('http://www.w3.org/2000/svg')
  })

  test('the connectors are hidden from assistive technology, the list saying it instead', async () => {
    // A path is a shape. What a reader needs is the link as words, which is what
    // the reading list carries.
    const host = await canvas()
    expect((part(host, 'edges') as HTMLElement).getAttribute('aria-hidden')).toBe('true')
  })

  test('the reading list says every card and where its arrows go', async () => {
    const host = await canvas()
    const entries = index(host)
    expect(entries.some((one) => one.includes('First') && one.includes('leads to Second'))).toBe(
      true,
    )
    expect(entries.some((one) => one.includes('Second') && one.includes('from First'))).toBe(true)
  })

  test('spatial order reads the groups first, then across each row', async () => {
    const host = await canvas('order="spatial"')
    const entries = index(host)
    expect(entries[0]).toContain('The pair')
    expect(entries[1]).toContain('First')
    expect(entries[2]).toContain('Second')
    expect(entries[3]).toContain('Third')
  })

  test('edge order follows the arrows from the card nothing points to', async () => {
    const host = await canvas('order="edges"')
    const entries = index(host)
    /* `startsWith`, because an entry names the cards it links to as well as
       itself: "First leads to Second" contains both. */
    const first = entries.findIndex((one) => one.startsWith('First'))
    const second = entries.findIndex((one) => one.startsWith('Second'))
    const third = entries.findIndex((one) => one.startsWith('Third'))
    expect(first).toBeLessThan(second)
    expect(second).toBeLessThan(third)
  })

  test('a card nothing points at and points nowhere is still in the list', async () => {
    /* A board with no edges is every card an island, and a list that dropped
       them would be a way around that leads nowhere. */
    const host = await canvas('order="edges"')
    host.data = { edges: [], nodes: BOARD.nodes }
    await host.updateComplete
    expect(index(host)).toHaveLength(4)
  })

  test('choosing a card brings the board to it', async () => {
    const host = await canvas()
    const before = (part(host, 'board') as HTMLElement).getAttribute('style')
    host.show('c')
    await host.updateComplete
    expect((part(host, 'board') as HTMLElement).getAttribute('style')).not.toBe(before)
  })

  test('a press moves the board and says that it did, rather than asking', async () => {
    /* `Map` asks and this tells, the difference being who draws. */
    const host = await canvas()
    const told: string[] = []
    host.addEventListener('helix-canvas-pan', (event) => {
      told.push((event as CustomEvent<{ to: string }>).detail.to)
    })
    const before = (part(host, 'board') as HTMLElement).getAttribute('style')
    const pad = host.shadowRoot?.querySelector('[part="pan-end"]') as HTMLElement | null
    pad?.click()
    await host.updateComplete
    expect(told).toEqual(['end'])
    expect((part(host, 'board') as HTMLElement).getAttribute('style')).not.toBe(before)
  })

  test('zoom is held between a quarter and four times', async () => {
    const host = await canvas()
    const zoomIn = host.shadowRoot?.querySelector('[part="zoom-in"]') as HTMLElement | null
    for (let press = 0; press < 12; press++) {
      zoomIn?.click()
    }
    await host.updateComplete
    expect((part(host, 'board') as HTMLElement).getAttribute('style')).toContain(
      '--_canvas-zoom: 4',
    )
  })

  test('an empty document says so rather than drawing an empty plane', async () => {
    const host = await canvas()
    host.data = { nodes: [] }
    await host.updateComplete
    expect(hasState(host, 'empty')).toBe(true)
    expect(host.shadowRoot?.querySelector('slot[name="empty"]')).not.toBeNull()
  })

  test('a card’s text is text, whatever the document put in it', async () => {
    /* The document is not this component's, so its text is set rather than
       parsed: a consumer who wants markup returns a template and takes the
       sanitising with it. */
    const host = await canvas()
    host.data = {
      nodes: [
        {
          height: 40,
          id: 'x',
          text: '<img src=x onerror=alert(1)>',
          type: 'text',
          width: 80,
          x: 0,
          y: 0,
        },
      ],
    }
    await host.updateComplete
    const card = cards(host)[0] as HTMLElement
    expect(card.querySelector('img')).toBeNull()
    expect(card.textContent).toContain('<img')
  })
})

/**
 * The gestures a board is reached for with, which are this family's rather than
 * the surface's: what `Map` frames drags its own view.
 */
describe('canvas gestures', () => {
  /** A pointer event happy-dom will carry, with the fields the handler reads. */
  const pointer = (type: string, at: { x: number; y: number }): PointerEvent =>
    new PointerEvent(type, { bubbles: true, button: 0, clientX: at.x, clientY: at.y, pointerId: 1 })

  const board = (host: Canvas): string =>
    (part(host, 'board') as HTMLElement).getAttribute('style') ?? ''

  /**
   * Where the board sits, read back out of the style.
   *
   * **Read rather than asserted against a number**, because these specs run in
   * happy-dom, where the box measures nothing and the board opens un-fitted, and
   * again in a browser, where it measures something and the board opens fitted.
   * What a gesture is worth is the distance it moved, and that is the same in
   * both.
   */
  const at = (host: Canvas): { x: number; y: number; zoom: number } => {
    const style = board(host)
    const read = (name: string): number =>
      Number(new RegExp(`--_canvas-${name}: (-?[0-9.]+)`).exec(style)?.[1] ?? 'NaN')
    return { x: read('x'), y: read('y'), zoom: read('zoom') }
  }

  test('a drag moves the board by the distance the pointer moved', async () => {
    const host = await canvas()
    const viewport = part(host, 'viewport') as HTMLElement
    const before = at(host)
    viewport.dispatchEvent(pointer('pointerdown', { x: 100, y: 100 }))
    viewport.dispatchEvent(pointer('pointermove', { x: 160, y: 130 }))
    await host.updateComplete
    /* Exactly the distance the pointer moved: a drag carries the plane under the
       finger rather than by some fraction of it. */
    expect(at(host).x - before.x).toBe(60)
    expect(at(host).y - before.y).toBe(30)

    viewport.dispatchEvent(pointer('pointerup', { x: 160, y: 130 }))
    const released = at(host)
    viewport.dispatchEvent(pointer('pointermove', { x: 400, y: 400 }))
    await host.updateComplete
    // Released, so the board stays where the drag left it.
    expect(at(host)).toEqual(released)
  })

  test('a press that began on a control is not a drag', async () => {
    /* The buttons sit inside the region this listens on, and a press on one is
       an ask rather than the start of a gesture. */
    const host = await canvas()
    const viewport = part(host, 'viewport') as HTMLElement
    const zoom = host.shadowRoot?.querySelector('[part="zoom-in"]') as HTMLElement
    const before = at(host)
    zoom.dispatchEvent(pointer('pointerdown', { x: 10, y: 10 }))
    viewport.dispatchEvent(pointer('pointermove', { x: 200, y: 200 }))
    await host.updateComplete
    expect(at(host)).toEqual(before)
  })

  test('the wheel pans, and the page does not scroll instead', async () => {
    const host = await canvas()
    const viewport = part(host, 'viewport') as HTMLElement
    const before = at(host)
    const wheel = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaX: 20,
      deltaY: 40,
    })
    viewport.dispatchEvent(wheel)
    await host.updateComplete
    expect(wheel.defaultPrevented).toBe(true)
    expect(at(host).x - before.x).toBe(-20)
    expect(at(host).y - before.y).toBe(-40)
  })

  test('zoom holds the middle of the view rather than the corner', async () => {
    /* Scaling from the origin pushes what a reader is looking at toward the
       corner, so every press has to be undone with a pan. */
    const host = await canvas()
    const zoomIn = host.shadowRoot?.querySelector('[part="zoom-in"]') as HTMLElement | null
    const zoomOut = host.shadowRoot?.querySelector('[part="zoom-out"]') as HTMLElement | null
    const before = at(host)
    zoomIn?.click()
    await host.updateComplete
    zoomOut?.click()
    await host.updateComplete
    // In and back out returns the offset it started from.
    expect(at(host)).toEqual(before)
  })
})

/**
 * What the document says about its colors and its arrows, which the format
 * allows in two shapes each.
 */
describe('canvas document detail', () => {
  test('a preset color is an attribute and a document’s own is a property', async () => {
    /* A stylesheet can match `1` to `6` and cannot enumerate every hex, so the
       two arrive by different routes. */
    const host = await canvas()
    host.data = {
      edges: [],
      nodes: [
        {
          color: '3',
          height: 40,
          id: 'preset',
          text: 'Preset',
          type: 'text',
          width: 80,
          x: 0,
          y: 0,
        },
        {
          color: '#ff8800',
          height: 40,
          id: 'own',
          text: 'Own',
          type: 'text',
          width: 80,
          x: 120,
          y: 0,
        },
      ],
    }
    await host.updateComplete
    const card = (id: string) => host.shadowRoot?.querySelector(`#card-${id}`) as HTMLElement
    expect(card('preset').getAttribute('data-color')).toBe('3')
    expect(card('own').hasAttribute('data-color')).toBe(false)
    expect(card('own').getAttribute('style')).toContain('--_canvas-card-color: #ff8800')
  })

  test('an edge arrives with an arrowhead and leaves without one, as the format says', async () => {
    const host = await canvas()
    const edge = host.shadowRoot?.querySelector('[part="edge"]') as SVGPathElement
    expect(edge.getAttribute('marker-end')).toContain('canvas-arrow')
    expect(edge.hasAttribute('marker-start')).toBe(false)
  })

  test('and a document that asks for both ends, or neither, gets what it asked', async () => {
    const host = await canvas()
    host.data = {
      edges: [
        { fromEnd: 'arrow', fromNode: 'a', id: 'both', toNode: 'b' },
        { fromNode: 'b', id: 'bare', toEnd: 'none', toNode: 'c' },
      ],
      nodes: BOARD.nodes,
    }
    await host.updateComplete
    const edges = [
      ...(host.shadowRoot?.querySelectorAll('[part="edge"]') ?? []),
    ] as SVGPathElement[]
    expect(edges[0]?.hasAttribute('marker-start')).toBe(true)
    expect(edges[1]?.hasAttribute('marker-end')).toBe(false)
  })

  test('a consumer’s own card renderer is placed where a stylesheet can find it', async () => {
    const host = (await canvas()) as Canvas & { renderCard?: (node: { text?: string }) => string }
    host.renderCard = (node) => `${node.text ?? ''} (drawn)`
    await host.updateComplete
    const card = host.shadowRoot?.querySelector('#card-a') as HTMLElement
    expect(card.querySelector('[data-prose]')?.textContent).toContain('(drawn)')
  })
})
