import { beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Canvas = HTMLElement & {
  order?: 'spatial' | 'edges'
  readOnly: boolean
  requestUpdate(): void
  show(id: string): void
  updateComplete: Promise<boolean>
}

type Card = HTMLElement & { current: boolean; links: string; x: number; y: number }

/**
 * A small board, written the way a consumer writes one: two cards side by side,
 * one under them, a group around the pair, and arrows from the first through to
 * the last.
 */
const BOARD = `
  <helix-headless-canvas-node name="pair" group label="The pair" x="-20" y="-20" width="500" height="200"></helix-headless-canvas-node>
  <helix-headless-canvas-node name="a" x="0" y="0" width="200" height="100">First</helix-headless-canvas-node>
  <helix-headless-canvas-node name="b" tone="accent" x="260" y="0" width="200" height="100">Second</helix-headless-canvas-node>
  <helix-headless-canvas-node name="c" x="130" y="300" width="200" height="100">Third</helix-headless-canvas-node>
  <helix-headless-canvas-edge name="e1" from="a" to="b"></helix-headless-canvas-edge>
  <helix-headless-canvas-edge name="e2" from="b" to="c" label="then"></helix-headless-canvas-edge>
`

const canvas = async (extra = '', cards = BOARD): Promise<Canvas> => {
  const host = (await mount(
    `<helix-headless-canvas label="A board" ${extra}>${cards}</helix-headless-canvas>`,
  )) as Canvas
  await host.updateComplete
  return host
}

/** The cards, which are the consumer's own elements rather than drawn ones. */
const cards = (host: Canvas): HTMLElement[] =>
  [...host.querySelectorAll('helix-headless-canvas-node')] as HTMLElement[]

/** One card, by id. */
const card = (host: Canvas, id: string): Card => host.querySelector(`[name="${id}"]`) as Card

/** A key pressed on a card, from the box a reader focuses rather than the host. */
const press = (on: Card, key: string, shiftKey = false): KeyboardEvent => {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    composed: true,
    key,
    shiftKey,
  })
  on.shadowRoot?.querySelector('[part="node"]')?.dispatchEvent(event)
  return event
}

/** A connection's focusable line, by the key the board gives it. */
const connection = (host: Canvas, key: string): SVGElement =>
  host.shadowRoot?.querySelector(`[data-edge="${key}"]`) as SVGElement

/** A key pressed on whatever element holds the stop, card or connection. */
const pressOn = (on: Element, key: string, shiftKey = false): KeyboardEvent => {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    composed: true,
    key,
    shiftKey,
  })
  on.dispatchEvent(event)
  return event
}

/** The element holding the board's one tab stop, and what the walk calls it. */
const stopOf = (host: Canvas): { at: Element; name: string } | undefined => {
  const card = (cards(host) as Card[]).find((one) => one.current)
  if (card) {
    return {
      at: card.shadowRoot?.querySelector('[part="node"]') as Element,
      name: card.getAttribute('name') ?? '',
    }
  }
  const line = host.shadowRoot?.querySelector('[part="edge-target"][tabindex="0"]')
  return line ? { at: line, name: line.getAttribute('data-edge') ?? '' } : undefined
}

/**
 * Every stop in the order the arrow keys walk them, from the tab stop on.
 *
 * Read off the stop as it moves rather than off focus, which happy-dom tracks
 * across shadow roots less faithfully than a browser: the stop is what a reader
 * tabbing back into the board lands on, so it is the thing worth asserting.
 */
const walk = async (host: Canvas): Promise<string[]> => {
  const seen: string[] = []
  for (let step = 0; step < 20; step++) {
    const stop = stopOf(host)
    if (!stop || seen.includes(stop.name)) {
      break
    }
    seen.push(stop.name)
    pressOn(stop.at, 'ArrowRight')
    await host.updateComplete
  }
  return seen
}

/** Only the cards in a walk, for the specs that are about reading order. */
const cardsIn = (walked: string[]): string[] => walked.filter((one) => !one.startsWith('edge:'))

describe('canvas', () => {
  test('a card is placed where the document put it, in the document’s own units', async () => {
    /* Position is data here, which is the whole reason this family draws: there
       is no layout to compute, only arithmetic against the board's extent. */
    const host = await canvas()
    const second = cards(host).find((one) => one.getAttribute('name') === 'b') as HTMLElement
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
    const first = cards(host).find((one) => one.getAttribute('name') === 'a') as HTMLElement
    const loose = cards(host).find((one) => one.getAttribute('name') === 'c') as HTMLElement
    expect(first.getAttribute('data-group')).toBe('pair')
    expect(loose.hasAttribute('data-group')).toBe(false)
  })

  test('a group is a group to a screen reader, and a card is an article', async () => {
    const host = await canvas()
    const inside = (id: string, part: string): Element | null =>
      (host
        .querySelector(`[name="${id}"]`)
        ?.shadowRoot?.querySelector(`[part="${part}"]`) as Element) ?? null
    expect(inside('pair', 'node')?.getAttribute('role')).toBe('group')
    expect(inside('pair', 'node')?.getAttribute('aria-label')).toBe('The pair')
    expect(inside('a', 'node')?.getAttribute('role')).toBe('article')
  })

  test('an edge is drawn between the two cards it names, and a missing one is not', async () => {
    const host = await canvas()
    expect(host.shadowRoot?.querySelectorAll('[part="edge"]')).toHaveLength(2)

    const orphaned = await canvas(
      '',
      `<helix-headless-canvas-node name="a" x="0" y="0" width="10" height="10">First</helix-headless-canvas-node>
       <helix-headless-canvas-edge name="e1" from="a" to="nowhere"></helix-headless-canvas-edge>`,
    )
    expect(orphaned.shadowRoot?.querySelectorAll('[part="edge"]')).toHaveLength(0)
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

  test('a connection is a named button, and what is painted is hidden', async () => {
    // A path is a shape. What a reader needs is the link as words.
    const host = await canvas()
    const line = connection(host, 'edge:e2')
    expect(line.getAttribute('role')).toBe('button')
    expect(line.getAttribute('aria-label')).toBe('From Second to Third')
    // What the line says is its description, heard after its ends.
    expect(line.getAttribute('aria-description')).toBe('then')
    for (const painted of host.shadowRoot?.querySelectorAll('[part="edge"], [part="label"]') ??
      []) {
      expect(painted.getAttribute('aria-hidden')).toBe('true')
    }
  })

  test('every card says where its arrows go, and is described by it rather than named', async () => {
    const host = await canvas()
    expect(card(host, 'a').links).toBe('leads to Second')
    expect(card(host, 'b').links).toBe('leads to Third; from First')
    /* The description is resolved, not compared: a reference to an id that is
       not in the card's own root would read out nothing. */
    const box = card(host, 'b').shadowRoot?.querySelector('[part="node"]') as HTMLElement
    const said = card(host, 'b').shadowRoot?.getElementById(
      box.getAttribute('aria-describedby') ?? '',
    )
    expect(said?.textContent).toBe('leads to Third; from First')
    expect(said?.hasAttribute('hidden')).toBe(true)
  })

  test('the board is one tab stop among its cards, however many there are', async () => {
    const host = await canvas()
    const stops = cards(host).filter(
      (one) => one.shadowRoot?.querySelector('[part="node"]')?.getAttribute('tabindex') === '0',
    )
    expect(stops.map((one) => one.getAttribute('name'))).toEqual(['pair'])
  })

  test('spatial order walks the groups first, then across each row', async () => {
    const host = await canvas('order="spatial"')
    expect(cardsIn(await walk(host))).toEqual(['pair', 'a', 'b', 'c'])
  })

  test('edge order follows the arrows from the card nothing points to', async () => {
    const host = await canvas('order="edges"')
    const walked = cardsIn(await walk(host))
    expect(walked.indexOf('a')).toBeLessThan(walked.indexOf('b'))
    expect(walked.indexOf('b')).toBeLessThan(walked.indexOf('c'))
  })

  test('a card nothing points at and points nowhere is still walked to', async () => {
    /* A board with no edges is every card an island, and a walk that skipped
       them would be a way around that leads nowhere. */
    const host = await canvas(
      'order="edges"',
      `<helix-headless-canvas-node name="a" x="0" y="0" width="10" height="10">First</helix-headless-canvas-node>
       <helix-headless-canvas-node name="b" x="40" y="0" width="10" height="10">Second</helix-headless-canvas-node>`,
    )
    expect(await walk(host)).toEqual(['a', 'b'])
  })

  test('the connections leaving a card are walked straight after it', async () => {
    const host = await canvas()
    expect(await walk(host)).toEqual(['pair', 'a', 'edge:e1', 'b', 'edge:e2', 'c'])
  })

  test('Enter on a connection goes to the card it arrives at', async () => {
    const host = await canvas()
    host.show('a')
    pressOn(connection(host, 'edge:e1'), 'Enter')
    await host.updateComplete
    expect(card(host, 'b').current).toBe(true)
  })

  test('a connection travels the way it says, or the way the board does', async () => {
    const host = await canvas()
    const d = (key: string) => connection(host, key).getAttribute('d') ?? ''
    expect(d('edge:e1')).toContain(' C ')

    host.querySelector('[name="e1"]')?.setAttribute('path', 'straight')
    await host.updateComplete
    await host.updateComplete
    expect(d('edge:e1')).toMatch(/^M [-\d.]+ [-\d.]+ L [-\d.]+ [-\d.]+$/)

    host.setAttribute('path', 'step')
    await host.updateComplete
    // The edge's own word wins, and the board's reaches the one that says none.
    expect(d('edge:e1')).not.toContain(' Q ')
    expect(d('edge:e2')).toContain(' Q ')
  })

  test('a board rests with zoom and fullscreen, and the pad is there when asked for', async () => {
    /* A board is dragged and its cards walked by key, so the pad was a third way
       to pan that took a third of the corner. */
    const host = await canvas()
    expect(host.shadowRoot?.querySelector('[part="pan-up"]')).toBeNull()
    expect(host.shadowRoot?.querySelector('[part="zoom-in"]')).not.toBeNull()
    const padded = await canvas('controls="pan zoom fullscreen"')
    expect(padded.shadowRoot?.querySelector('[part="pan-up"]')).not.toBeNull()
  })

  test('choosing a card brings the board to it', async () => {
    const host = await canvas()
    const before = (part(host, 'viewport') as HTMLElement).getAttribute('style')
    host.show('c')
    await host.updateComplete
    expect((part(host, 'viewport') as HTMLElement).getAttribute('style')).not.toBe(before)
  })

  test('a press moves the board and says that it did, rather than asking', async () => {
    /* `Map` asks and this tells, the difference being who draws. */
    const host = await canvas('controls="pan zoom fullscreen"')
    const told: string[] = []
    host.addEventListener('helix-canvas-pan', (event) => {
      told.push((event as CustomEvent<{ to: string }>).detail.to)
    })
    const before = (part(host, 'viewport') as HTMLElement).getAttribute('style')
    const pad = host.shadowRoot?.querySelector('[part="pan-end"]') as HTMLElement | null
    expect(pad).not.toBeNull()
    pad?.click()
    await host.updateComplete
    expect(told).toEqual(['end'])
    expect((part(host, 'viewport') as HTMLElement).getAttribute('style')).not.toBe(before)
  })

  test('zoom is held between a quarter and four times', async () => {
    const host = await canvas()
    const zoomIn = host.shadowRoot?.querySelector('[part="zoom-in"]') as HTMLElement | null
    for (let press = 0; press < 12; press++) {
      zoomIn?.click()
    }
    await host.updateComplete
    expect((part(host, 'viewport') as HTMLElement).getAttribute('style')).toContain(
      '--_canvas-zoom: 4',
    )
  })

  test('an empty document says so rather than drawing an empty plane', async () => {
    const host = await canvas('', '')
    expect(hasState(host, 'empty')).toBe(true)
    expect(host.shadowRoot?.querySelector('slot[name="empty"]')).not.toBeNull()
  })

  test('a card holds the consumer\u2019s own DOM, which another card names as text', async () => {
    /* The card is their element now, so what is in it is theirs. What this
       asserts is that the board reads it for another card's connections rather
       than parsing it into anything. */
    const host = await canvas(
      '',
      `<helix-headless-canvas-node name="x" x="0" y="0" width="80" height="40">&lt;img src=x&gt;</helix-headless-canvas-node>
       <helix-headless-canvas-node name="y" x="120" y="0" width="80" height="40">After</helix-headless-canvas-node>
       <helix-headless-canvas-edge name="e" from="x" to="y"></helix-headless-canvas-edge>`,
    )
    expect(card(host, 'y').links).toBe('from <img src=x>')
    expect(host.querySelector('img')).toBeNull()
  })
})

/**
 * Moving cards, which a board does unless it is read-only, and which a consumer
 * holding the positions takes over by refusing the request.
 */
describe('canvas moves', () => {
  const pointer = (type: string, at: { x: number; y: number }): PointerEvent =>
    new PointerEvent(type, {
      bubbles: true,
      button: 0,
      clientX: at.x,
      clientY: at.y,
      composed: true,
      pointerId: 2,
    })

  /** A drag that starts on a card and is let go somewhere else. */
  const drag = async (host: Canvas, id: string, by: { x: number; y: number }): Promise<void> => {
    const box = card(host, id).shadowRoot?.querySelector('[part="node"]') as HTMLElement
    const viewport = part(host, 'viewport') as HTMLElement
    box.dispatchEvent(pointer('pointerdown', { x: 10, y: 10 }))
    viewport.dispatchEvent(pointer('pointermove', { x: 10 + by.x, y: 10 + by.y }))
    await host.updateComplete
    viewport.dispatchEvent(pointer('pointerup', { x: 10 + by.x, y: 10 + by.y }))
    await host.updateComplete
  }

  test('a card dragged moves by the distance, asked for and then reported', async () => {
    const host = await canvas()
    const said: string[] = []
    host.addEventListener('helix-before-move', () => said.push('before'))
    host.addEventListener('helix-move', (event) => {
      said.push(`move ${JSON.stringify((event as CustomEvent).detail.nodes)}`)
    })
    await drag(host, 'c', { x: 40, y: 20 })
    // Unzoomed in happy-dom, which measures nothing, so a pixel is a unit.
    expect([card(host, 'c').x, card(host, 'c').y]).toEqual([170, 320])
    expect(said).toEqual(['before', 'move [{"name":"c","x":170,"y":320}]'])
  })

  test('a move refused is not made, which is how a consumer holds the positions', async () => {
    const host = await canvas()
    host.addEventListener('helix-before-move', (event) => event.preventDefault())
    let finished = false
    host.addEventListener('helix-move', () => {
      finished = true
    })
    await drag(host, 'c', { x: 40, y: 20 })
    expect([card(host, 'c').x, card(host, 'c').y]).toEqual([130, 300])
    expect(finished).toBe(false)
  })

  test('a hand that barely moves is a click, not a move', async () => {
    const host = await canvas()
    await drag(host, 'c', { x: 1, y: 1 })
    expect([card(host, 'c').x, card(host, 'c').y]).toEqual([130, 300])
  })

  test('a group carries the cards inside it', async () => {
    const host = await canvas()
    await drag(host, 'pair', { x: 10, y: 0 })
    expect(card(host, 'pair').x).toBe(-10)
    expect(card(host, 'a').x).toBe(10)
    expect(card(host, 'b').x).toBe(270)
    // Outside the group's bounds, so left where it was.
    expect(card(host, 'c').x).toBe(130)
  })

  test('a read-only board keeps its cards, and a drag on one pans instead', async () => {
    const host = await canvas('readonly')
    const before = (part(host, 'viewport') as HTMLElement).getAttribute('style')
    await drag(host, 'c', { x: 40, y: 20 })
    expect([card(host, 'c').x, card(host, 'c').y]).toEqual([130, 300])
    expect((part(host, 'viewport') as HTMLElement).getAttribute('style')).not.toBe(before)
  })

  test('shift and an arrow moves the card by a step, which is the keyboard\u2019s drag', async () => {
    const host = await canvas()
    let finished = 0
    host.addEventListener('helix-move', () => {
      finished += 1
    })
    press(card(host, 'c'), 'ArrowRight', true)
    press(card(host, 'c'), 'ArrowDown', true)
    await host.updateComplete
    expect([card(host, 'c').x, card(host, 'c').y]).toEqual([146, 316])
    expect(finished).toBe(2)

    const still = await canvas('readonly')
    press(card(still, 'c'), 'ArrowRight', true)
    expect(card(still, 'c').x).toBe(130)
  })

  test('the arrows are the card\u2019s only when pressed on the card, not inside it', async () => {
    /* A card may hold a chart or a field that answers the arrows itself. */
    const host = await canvas(
      '',
      '<helix-headless-canvas-node name="a" x="0" y="0" width="80" height="40"><input></helix-headless-canvas-node>',
    )
    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      composed: true,
      key: 'ArrowRight',
      shiftKey: true,
    })
    host.querySelector('input')?.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
    expect(card(host, 'a').x).toBe(0)
  })
})

/**
 * Connecting and removing, which the board asks for and the page does, because
 * the elements are the page's.
 */
describe('canvas connections and removal', () => {
  test('C on a card, then Enter on another, asks for the two to be joined', async () => {
    const host = await canvas()
    const asked: unknown[] = []
    host.addEventListener('helix-connect', (event) => asked.push((event as CustomEvent).detail))
    press(card(host, 'a'), 'c')
    await host.updateComplete
    expect(hasState(host, 'connecting')).toBe(true)
    expect(part(host, 'live')?.textContent).toContain('Connecting from First')
    press(card(host, 'c'), 'Enter')
    await host.updateComplete
    expect(asked).toEqual([{ from: 'a', to: 'c' }])
    expect(hasState(host, 'connecting')).toBe(false)
    // Asked rather than done: nothing was added to the page's markup.
    expect(host.querySelectorAll('helix-headless-canvas-edge')).toHaveLength(2)
  })

  test('Escape stops a connection without asking for one', async () => {
    const host = await canvas()
    let asked = false
    host.addEventListener('helix-connect', () => {
      asked = true
    })
    press(card(host, 'a'), 'c')
    press(card(host, 'a'), 'Escape')
    await host.updateComplete
    expect(asked).toBe(false)
    expect(part(host, 'live')?.textContent).toBe('Stopped connecting.')
  })

  test('drawing from a handle to another card asks for them to be joined', async () => {
    const host = await canvas()
    const asked: unknown[] = []
    host.addEventListener('helix-connect', (event) => asked.push((event as CustomEvent).detail))
    const handle = card(host, 'a').shadowRoot?.querySelector('[part~="handle-right"]') as Element
    const pointer = (type: string, x: number, y: number) =>
      new PointerEvent(type, {
        bubbles: true,
        button: 0,
        clientX: x,
        clientY: y,
        composed: true,
        pointerId: 3,
      })
    handle.dispatchEvent(pointer('pointerdown', 0, 0))
    /* happy-dom measures nothing, so the view is unzoomed at its corner and the
       plane starts a margin above and left of the group at -20: a point on the
       screen is the document's point plus 52. Third is at 130..330, 300..400. */
    host.dispatchEvent(pointer('pointermove', 282, 360))
    await host.updateComplete
    expect(part(host, 'draft')).not.toBeNull()
    host.dispatchEvent(pointer('pointerup', 282, 360))
    await host.updateComplete
    /* Near Third's top edge, so it arrives at the top: the side nearest the
       pointer, not the one facing the card it came from. */
    expect(asked).toEqual([{ from: 'a', fromSide: 'right', to: 'c', toSide: 'top' }])
    expect(part(host, 'draft')).toBeNull()
  })

  test('dragging a connection by its end moves that end, and the board rewrites it', async () => {
    const host = await canvas()
    const said: unknown[] = []
    host.addEventListener('helix-reconnect', (event) => said.push((event as CustomEvent).detail))
    const pointer = (type: string, x: number, y: number) =>
      new PointerEvent(type, {
        bubbles: true,
        button: 0,
        clientX: x,
        clientY: y,
        composed: true,
        pointerId: 6,
      })
    /* e1 runs from First's right side (200, 50) to Second's left (260, 50): on
       screen, plus 52. Pressed near its arriving end, so that end is in hand. */
    connection(host, 'edge:e1').dispatchEvent(pointer('pointerdown', 305, 102))
    // Over Third, near its top.
    host.dispatchEvent(pointer('pointermove', 282, 360))
    await host.updateComplete
    await host.updateComplete
    expect(hasState(card(host, 'c'), 'target')).toBe(true)
    host.dispatchEvent(pointer('pointerup', 282, 360))
    await host.updateComplete
    expect(said).toEqual([
      { from: 'a', name: 'e1', to: 'c', toSide: 'top', was: { from: 'a', to: 'b' } },
    ])
    const moved = host.querySelector('[name="e1"]') as HTMLElement & { to: string; toSide?: string }
    expect([moved.to, moved.toSide]).toEqual(['c', 'top'])
  })

  test('a connection end refused stays where it was, and one dropped on nothing asks to go', async () => {
    const host = await canvas()
    const pointer = (type: string, x: number, y: number) =>
      new PointerEvent(type, {
        bubbles: true,
        button: 0,
        clientX: x,
        clientY: y,
        composed: true,
        pointerId: 7,
      })
    host.addEventListener('helix-before-reconnect', (event) => event.preventDefault())
    connection(host, 'edge:e1').dispatchEvent(pointer('pointerdown', 305, 102))
    host.dispatchEvent(pointer('pointermove', 282, 360))
    host.dispatchEvent(pointer('pointerup', 282, 360))
    await host.updateComplete
    expect((host.querySelector('[name="e1"]') as HTMLElement & { to: string }).to).toBe('b')

    const removed: unknown[] = []
    host.addEventListener('helix-remove', (event) => removed.push((event as CustomEvent).detail))
    connection(host, 'edge:e1').dispatchEvent(pointer('pointerdown', 305, 102))
    // Out over empty board, below everything.
    host.dispatchEvent(pointer('pointermove', 600, 600))
    host.dispatchEvent(pointer('pointerup', 600, 600))
    expect(removed).toEqual([{ edges: [{ from: 'a', name: 'e1', to: 'b' }], nodes: [] }])
  })

  test('a press on a connection that does not move is a click, and picks nothing up', async () => {
    const host = await canvas()
    let asked = 0
    for (const name of ['helix-before-reconnect', 'helix-remove']) {
      host.addEventListener(name, () => {
        asked += 1
      })
    }
    const pointer = (type: string) =>
      new PointerEvent(type, {
        bubbles: true,
        button: 0,
        clientX: 305,
        clientY: 102,
        composed: true,
        pointerId: 8,
      })
    connection(host, 'edge:e1').dispatchEvent(pointer('pointerdown'))
    host.dispatchEvent(pointer('pointerup'))
    expect(asked).toBe(0)
  })

  test('C on a connection picks up its arriving end, and Enter on a card puts it there', async () => {
    const host = await canvas()
    const said: unknown[] = []
    host.addEventListener('helix-reconnect', (event) => said.push((event as CustomEvent).detail))
    pressOn(connection(host, 'edge:e1'), 'c')
    await host.updateComplete
    expect(part(host, 'live')?.textContent).toContain(
      'Moving the end of the connection from First to Second',
    )
    press(card(host, 'c'), 'Enter')
    expect(said).toEqual([{ from: 'a', name: 'e1', to: 'c', was: { from: 'a', to: 'b' } }])
  })

  test('Delete on a card asks for it and every connection it would strand', async () => {
    const host = await canvas()
    const asked: unknown[] = []
    host.addEventListener('helix-remove', (event) => asked.push((event as CustomEvent).detail))
    press(card(host, 'b'), 'Delete')
    expect(asked).toEqual([
      {
        edges: [
          { from: 'a', name: 'e1', to: 'b' },
          { from: 'b', name: 'e2', to: 'c' },
        ],
        nodes: ['b'],
      },
    ])
  })

  test('Delete on a connection asks for that connection alone', async () => {
    const host = await canvas()
    const asked: unknown[] = []
    host.addEventListener('helix-remove', (event) => asked.push((event as CustomEvent).detail))
    pressOn(connection(host, 'edge:e2'), 'Delete')
    expect(asked).toEqual([{ edges: [{ from: 'b', name: 'e2', to: 'c' }], nodes: [] }])
  })

  test('once the page removes what was asked, the stop moves on to what was next', async () => {
    const host = await canvas()
    host.addEventListener('helix-remove', (event) => {
      const { edges, nodes } = (event as CustomEvent).detail
      for (const id of [...nodes, ...edges.map((one: { name: string }) => one.name)]) {
        host.querySelector(`[name="${id}"]`)?.remove()
      }
    })
    press(card(host, 'b'), 'Delete')
    await host.updateComplete
    await host.updateComplete
    expect(card(host, 'c').current).toBe(true)
  })

  test('a read-only board asks for nothing and draws no handles', async () => {
    const host = await canvas('readonly')
    let asked = 0
    host.addEventListener('helix-connect', () => {
      asked += 1
    })
    host.addEventListener('helix-remove', () => {
      asked += 1
    })
    press(card(host, 'a'), 'c')
    press(card(host, 'b'), 'Enter')
    press(card(host, 'b'), 'Delete')
    await host.updateComplete
    expect(asked).toBe(0)
    expect(card(host, 'a').shadowRoot?.querySelector('[part~="handle"]')).toBeNull()
  })
})

/**
 * The API a page works the board through: holding single cards and connections,
 * the words it speaks, where it is looking, and the document it round-trips.
 */
describe('canvas api', () => {
  const pointer = (type: string, x: number, y: number) =>
    new PointerEvent(type, {
      bubbles: true,
      button: 0,
      clientX: x,
      clientY: y,
      composed: true,
      pointerId: 4,
    })

  test('a read-only card is not moved, connected, or removed, and the rest still are', async () => {
    const host = await canvas()
    card(host, 'a').setAttribute('readonly', '')
    await host.updateComplete
    await host.updateComplete
    const asked: string[] = []
    for (const name of ['helix-before-move', 'helix-connect', 'helix-remove']) {
      host.addEventListener(name, () => asked.push(name))
    }
    press(card(host, 'a'), 'ArrowRight', true)
    press(card(host, 'a'), 'c')
    press(card(host, 'a'), 'Delete')
    expect(asked).toEqual([])
    expect(card(host, 'a').shadowRoot?.querySelector('[part~="handle"]')).toBeNull()

    // Nor is it somewhere a connection from another card can arrive.
    press(card(host, 'b'), 'c')
    press(card(host, 'a'), 'Enter')
    expect(asked).toEqual([])

    press(card(host, 'c'), 'ArrowRight', true)
    expect(asked).toEqual(['helix-before-move'])
  })

  test('a group leaves a read-only card inside it where it is', async () => {
    const host = await canvas()
    card(host, 'a').setAttribute('readonly', '')
    await host.updateComplete
    press(card(host, 'pair'), 'ArrowRight', true)
    await host.updateComplete
    expect(card(host, 'a').x).toBe(0)
    expect(card(host, 'b').x).toBe(276)
  })

  test('a read-only connection is not removed on its own, and is with its card', async () => {
    const host = await canvas()
    host.querySelector('[name="e2"]')?.setAttribute('readonly', '')
    await host.updateComplete
    const asked: unknown[] = []
    host.addEventListener('helix-remove', (event) => asked.push((event as CustomEvent).detail))
    pressOn(connection(host, 'edge:e2'), 'Delete')
    expect(asked).toEqual([])
    press(card(host, 'c'), 'Delete')
    expect(asked).toEqual([{ edges: [{ from: 'b', name: 'e2', to: 'c' }], nodes: ['c'] }])
  })

  test('every sentence the board speaks can be said in another language', async () => {
    const host = await canvas(
      'lang="fr" connection-label="De {from} à {to}" leads-to-label="mène à {cards}" connecting-label="Connexion depuis {from}"',
      `<helix-headless-canvas-node name="a" x="0" y="0" width="80" height="40">Un</helix-headless-canvas-node>
       <helix-headless-canvas-node name="b" x="120" y="0" width="80" height="40">Deux</helix-headless-canvas-node>
       <helix-headless-canvas-node name="c" x="240" y="0" width="80" height="40">Trois</helix-headless-canvas-node>
       <helix-headless-canvas-edge from="a" to="b"></helix-headless-canvas-edge>
       <helix-headless-canvas-edge from="a" to="c"></helix-headless-canvas-edge>`,
    )
    expect(connection(host, 'edge:a->b').getAttribute('aria-label')).toBe('De Un à Deux')
    // Joined the way the page's language joins a list.
    expect(card(host, 'a').links).toBe('mène à Deux et Trois')
    press(card(host, 'a'), 'c')
    await host.updateComplete
    expect(part(host, 'live')?.textContent).toBe('Connexion depuis Un')
  })

  test('the controls are named by the family, or by the page', async () => {
    const host = await canvas()
    expect(part(host, 'controls')?.getAttribute('aria-label')).toBe('Board controls')
    host.setAttribute('controls-label', 'Commandes')
    await host.updateComplete
    expect(part(host, 'controls')?.getAttribute('aria-label')).toBe('Commandes')
  })

  test('the view is read, written, and reported when it changes', async () => {
    const host = (await canvas()) as Canvas & { view: { x: number; y: number; zoom: number } }
    const told: unknown[] = []
    host.addEventListener('helix-canvas-view', (event) => told.push((event as CustomEvent).detail))
    host.view = { x: 100, y: 50, zoom: 2 }
    await host.updateComplete
    expect(host.view).toEqual({ x: 100, y: 50, zoom: 2 })
    expect(told).toEqual([{ x: 100, y: 50, zoom: 2 }])
    // A render that leaves the view where it was says nothing.
    host.requestUpdate()
    await host.updateComplete
    expect(told).toHaveLength(1)
  })

  test('a board goes out as JSON Canvas, and comes back as props', async () => {
    const { fromJsonCanvas } = await import('../index.js')
    const host = (await canvas()) as Canvas & {
      toJsonCanvas(): { nodes: unknown[]; edges: unknown[] }
    }
    const saved = host.toJsonCanvas() as {
      nodes: Array<{ id: string; type: string; text?: string }>
      edges: Array<{ id: string; fromNode: string; toNode: string }>
    }
    expect(saved.nodes.find((one) => one.id === 'pair')?.type).toBe('group')
    expect(saved.nodes.find((one) => one.id === 'a')).toMatchObject({ text: 'First', type: 'text' })
    expect(saved.edges[0]).toMatchObject({ fromNode: 'a', id: 'e1', toNode: 'b' })

    const props = fromJsonCanvas(saved as never)
    expect(props.nodes.find((one) => one.name === 'pair')?.group).toBe(true)
    expect(props.edges[0]).toMatchObject({ from: 'a', name: 'e1', to: 'b' })
  })

  test('while a connection is drawn, where it can land and where it will are shown', async () => {
    const host = await canvas()
    const handle = card(host, 'a').shadowRoot?.querySelector('[part~="handle-right"]') as Element
    handle.dispatchEvent(pointer('pointerdown', 0, 0))
    // Over Third, as in the drawing spec: the document's point plus 52.
    host.dispatchEvent(pointer('pointermove', 280, 402))
    await host.updateComplete
    await host.updateComplete
    expect(hasState(card(host, 'c'), 'target')).toBe(true)
    expect(hasState(card(host, 'b'), 'candidate')).toBe(true)
    // Not the card it started from.
    expect(hasState(card(host, 'a'), 'candidate')).toBe(false)
    // The preview is the connection it would make, arrowhead and all.
    expect(part(host, 'draft')?.getAttribute('marker-end')).toBe('url(#canvas-arrow)')
    host.dispatchEvent(pointer('pointerup', 280, 402))
    await host.updateComplete
    await host.updateComplete
    expect(hasState(card(host, 'c'), 'target')).toBe(false)
  })
})

/**
 * The gestures a board is reached for with, which are this family's rather than
 * the surface's: what `Map` frames drags its own view.
 */
describe('canvas gestures', () => {
  /** A pointer event happy-dom will carry, with the fields the handler reads. */
  const pointer = (type: string, at: { x: number; y: number }): PointerEvent =>
    new PointerEvent(type, {
      bubbles: true,
      button: 0,
      clientX: at.x,
      clientY: at.y,
      composed: true,
      pointerId: 1,
    })

  const board = (host: Canvas): string =>
    (part(host, 'viewport') as HTMLElement).getAttribute('style') ?? ''

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

  test('a drag is direct while the hand is on it, and a press glides again after', async () => {
    /* The plane eases a press on the pad, and easing every pointer move left
       the board chasing the finger and arriving in steps. The drag never set
       the state that turns the easing off, which is the bug this pins. */
    const host = await canvas()
    const viewport = part(host, 'viewport') as HTMLElement
    viewport.dispatchEvent(pointer('pointerdown', { x: 100, y: 100 }))
    await host.updateComplete
    expect(hasState(host, 'direct')).toBe(true)
    viewport.dispatchEvent(pointer('pointerup', { x: 100, y: 100 }))
    await host.updateComplete
    expect(hasState(host, 'direct')).toBe(false)
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

  test('a plain wheel scrolls the page, and a pinch zooms the board', async () => {
    /* A board is most of a screen tall, and one that took the wheel stopped a
       reader scrolling past it. A pinch arrives as a wheel with `ctrlKey`. */
    const host = await canvas()
    const viewport = part(host, 'viewport') as HTMLElement
    const before = at(host)
    const wheel = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 40 })
    viewport.dispatchEvent(wheel)
    await host.updateComplete
    expect(wheel.defaultPrevented).toBe(false)
    expect(at(host)).toEqual(before)

    const pinch = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
      deltaY: -10,
    })
    /* happy-dom's `WheelEvent` drops the modifier keys its init was given, so
       the one this test is about is put back by hand. A browser carries it. */
    Object.defineProperty(pinch, 'ctrlKey', { value: true })
    viewport.dispatchEvent(pinch)
    await host.updateComplete
    expect(pinch.defaultPrevented).toBe(true)
    expect(at(host).zoom).toBeGreaterThan(before.zoom)
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
  test('a tone is what a card and a line mean, and goes out as the format\u2019s preset', async () => {
    const host = (await canvas(
      '',
      `<helix-headless-canvas-node name="toned" tone="accent" x="0" y="0" width="80" height="40">Toned</helix-headless-canvas-node>
       <helix-headless-canvas-node name="own" style="--canvas-node-color: #ff8800" x="120" y="0" width="80" height="40">Own</helix-headless-canvas-node>
       <helix-headless-canvas-edge name="line" from="toned" to="own" tone="danger" variant="dashed" style="--canvas-edge-color: #00aa88"></helix-headless-canvas-edge>`,
    )) as Canvas & {
      toJsonCanvas(): {
        nodes: Array<{ id: string; color?: string }>
        edges: Array<{ color?: string }>
      }
    }
    const painted = host.shadowRoot?.querySelector('[part="edge"]') as SVGPathElement
    // The stylesheet matches the tone and the variant; a custom color is carried across.
    expect(painted.getAttribute('data-tone')).toBe('danger')
    expect(painted.getAttribute('data-variant')).toBe('dashed')
    expect(painted.getAttribute('style')).toContain('--_canvas-edge-color: #00aa88')
    // The tone goes out as its preset, and a custom color as itself.
    const saved = host.toJsonCanvas()
    expect(saved.nodes.find((one) => one.id === 'toned')?.color).toBe('3')
    expect(saved.nodes.find((one) => one.id === 'own')?.color).toBe('#ff8800')
    expect(saved.edges[0]?.color).toBe('1')
  })

  test('a JSON Canvas preset comes in as a tone, and a hex as a custom color', async () => {
    const { fromJsonCanvas } = await import('../index.js')
    const props = fromJsonCanvas({
      nodes: [
        { color: '4', height: 10, id: 'a', type: 'text', width: 10, x: 0, y: 0 },
        { color: '#123456', height: 10, id: 'b', type: 'text', width: 10, x: 0, y: 0 },
      ],
    })
    expect(props.nodes[0]).toMatchObject({ color: undefined, tone: 'success' })
    expect(props.nodes[1]).toMatchObject({ color: '#123456', tone: undefined })
  })

  test('an edge arrives with an arrowhead and leaves without one, as the format says', async () => {
    const host = await canvas()
    const edge = host.shadowRoot?.querySelector('[part="edge"]') as SVGPathElement
    expect(edge.getAttribute('marker-end')).toContain('canvas-arrow')
    expect(edge.hasAttribute('marker-start')).toBe(false)
  })

  test('and a document that asks for both ends, or neither, gets what it asked', async () => {
    const host = await canvas(
      '',
      `<helix-headless-canvas-node name="a" x="0" y="0" width="80" height="40">A</helix-headless-canvas-node>
       <helix-headless-canvas-node name="b" x="120" y="0" width="80" height="40">B</helix-headless-canvas-node>
       <helix-headless-canvas-node name="c" x="240" y="0" width="80" height="40">C</helix-headless-canvas-node>
       <helix-headless-canvas-edge name="both" from="a" to="b" from-end="arrow"></helix-headless-canvas-edge>
       <helix-headless-canvas-edge name="bare" from="b" to="c" to-end="none"></helix-headless-canvas-edge>`,
    )
    const edges = [
      ...(host.shadowRoot?.querySelectorAll('[part="edge"]') ?? []),
    ] as SVGPathElement[]
    expect(edges[0]?.hasAttribute('marker-start')).toBe(true)
    expect(edges[1]?.hasAttribute('marker-end')).toBe(false)
  })
})
