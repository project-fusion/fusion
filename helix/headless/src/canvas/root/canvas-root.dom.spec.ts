import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, hasState, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

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

type Card = HTMLElement & {
  current: boolean
  label: string
  links: string
  placed(name: string): string | undefined
  x: number
  y: number
}

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

/**
 * A point in the document's own units, where it is on the screen.
 *
 * **Worked out rather than written down**, because these specs run twice: in
 * happy-dom, which measures nothing, so the board sits unfitted at the corner
 * and a point on screen is the document's plus the plane's margin; and in a
 * browser, which measures the box and fits the board into it. A coordinate
 * written for one lands somewhere else in the other.
 */
const onScreen = (host: Canvas, x: number, y: number): [number, number] => {
  const viewport = part(host, 'viewport') as HTMLElement
  const box = viewport.getBoundingClientRect()
  const style = viewport.getAttribute('style') ?? ''
  const read = (name: string): number =>
    Number(new RegExp(`--_canvas-${name}: (-?[0-9.e+-]+)`).exec(style)?.[1] ?? 0)
  const origin = (host as unknown as { origin: { x: number; y: number } }).origin
  const zoom = read('zoom') || 1
  return [box.left + read('x') + (x - origin.x) * zoom, box.top + read('y') + (y - origin.y) * zoom]
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
    const second = card(host, 'b')
    /* The extent starts at the group, at -20, and the plane keeps a margin of
       32 around it so a group's name and a bowing connector are not clipped. So
       a card the document put at 260 is drawn at 312. */
    expect(second.placed('--_canvas-card-x')).toBe('312px')
    expect(second.placed('--_canvas-card-y')).toBe('52px')
    expect(second.placed('--_canvas-card-inline-size')).toBe('200px')
    /* **In the card's own shadow root**: its `style` is the page's markup,
       which a place written there made differ from what the server sent. */
    expect(second.hasAttribute('style')).toBe(false)
  })

  /* It wrote `data-group` onto the page's own cards, which nothing read and
     which React's hydration reports as markup the server never sent. */
  test('writes no attribute onto a card, whichever group it sits in', async () => {
    const host = await canvas()
    for (const card of cards(host)) {
      expect(card.hasAttribute('data-group')).toBe(false)
    }
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

  test('a connection keeps the points it was drawn at while its cards move', async () => {
    /* One that names no side takes the sides facing the other card, and that
       was asked on every draw: a card dragged past the diagonal between the two
       flipped the answer, and the line jumped to another point under the
       reader's hand. Here the second card moves from beside the first to under
       it, and the line still leaves the first card's right side. */
    const host = await canvas()
    const start = () =>
      (connection(host, 'edge:e1').getAttribute('d') ?? '')
        .match(/^M ([-\d.]+) ([-\d.]+)/)
        ?.slice(1)
    const before = start()
    const second = card(host, 'b')
    second.x = 0
    second.y = 300
    await host.updateComplete
    await host.updateComplete
    expect(start()).toEqual(before)
  })

  test('and a side the page writes still wins', async () => {
    const host = await canvas()
    const start = () =>
      (connection(host, 'edge:e1').getAttribute('d') ?? '')
        .match(/^M ([-\d.]+) ([-\d.]+)/)
        ?.slice(1)
    const before = start()
    host.querySelector('[name="e1"]')?.setAttribute('from-side', 'bottom')
    await host.updateComplete
    await host.updateComplete
    expect(start()).not.toEqual(before)
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

  test('every control’s glyph is a slot a page fills with its own icon, and the glyph stays where it does not', async () => {
    const host = await canvas(
      'controls="pan zoom fullscreen"',
      `${BOARD}<svg slot="zoom-in-icon" id="plus"></svg>`,
    )
    for (const name of [
      'fullscreen',
      'pan-down',
      'pan-end',
      'pan-start',
      'pan-up',
      'zoom-in',
      'zoom-out',
    ]) {
      expect(part(host, name)?.querySelector(`slot[name="${name}-icon"]`)).not.toBeNull()
    }
    const zoomIn = part(host, 'zoom-in')?.querySelector('slot') as HTMLSlotElement
    expect(zoomIn.assignedElements()).toEqual([host.querySelector('#plus') as Element])
    expect(part(host, 'zoom-out')?.textContent?.trim()).toBe('−')
    expect(part(host, 'pan-up')?.textContent?.trim()).toBe('↑')
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

  test('zoom is held between a tenth and eight times', async () => {
    const host = await canvas()
    const press = async (name: string, times: number) => {
      const button = host.shadowRoot?.querySelector(`[part="${name}"]`) as HTMLElement | null
      for (let at = 0; at < times; at++) {
        button?.click()
      }
      await host.updateComplete
    }
    const style = () => (part(host, 'viewport') as HTMLElement).getAttribute('style') ?? ''
    await press('zoom-in', 30)
    expect(style()).toContain('--_canvas-zoom: 8;')
    await press('zoom-out', 60)
    expect(style()).toContain('--_canvas-zoom: 0.1;')
    // Out that far, the ruling is drawn coarser so its lines stay lines.
    expect(style()).toContain('--_canvas-rule-zoom: 0.8')
  })

  test('a label is text on the plane at its line\u2019s middle, not SVG text', async () => {
    /* SVG text on a filtered ground lost its words to a stale filter picture
       when the font arrived after it was drawn. */
    const host = await canvas()
    const label = host.shadowRoot?.querySelector('[part="label"]') as HTMLElement
    expect(label.namespaceURI).toBe('http://www.w3.org/1999/xhtml')
    expect(label.textContent).toBe('then')
    expect(label.getAttribute('style')).toContain('--_canvas-label-x:')
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

  test('with `snap`, a dragged card lets go on the nearest line, and what it carries keeps its place', async () => {
    const host = await canvas('snap="32"')
    await drag(host, 'c', { x: 40, y: 20 })
    // From 130, 300 by 40, 20 is 170, 320, and the nearest lines are 160 and 320.
    expect([card(host, 'c').x, card(host, 'c').y]).toEqual([160, 320])
    await drag(host, 'pair', { x: 10, y: 0 })
    // The group from -20 by 10 to the line at 0, and its cards 20 to the right with it.
    expect([card(host, 'pair').x, card(host, 'a').x, card(host, 'b').x]).toEqual([0, 20, 280])
  })

  test('with `snap`, Shift and an arrow goes to the next line, and Alt and an arrow moves the corner there', async () => {
    const host = await canvas('snap="32"')
    press(card(host, 'c'), 'ArrowRight', true)
    await host.updateComplete
    expect(card(host, 'c').x).toBe(160)
    press(card(host, 'c'), 'ArrowRight', true)
    press(card(host, 'c'), 'ArrowUp', true)
    await host.updateComplete
    expect([card(host, 'c').x, card(host, 'c').y]).toEqual([192, 288])
    const alt = new KeyboardEvent('keydown', {
      altKey: true,
      bubbles: true,
      cancelable: true,
      composed: true,
      key: 'ArrowRight',
    })
    card(host, 'c').shadowRoot?.querySelector('[part="node"]')?.dispatchEvent(alt)
    await host.updateComplete
    // The right edge from 392 to the line at 416.
    expect((card(host, 'c') as Card & { width: number }).width).toBe(224)
  })

  test('a card carried to the edge of the board moves the board under it, until it is let go', async () => {
    const host = await canvas()
    const viewport = part(host, 'viewport') as HTMLElement
    /* happy-dom measures nothing, so the box is given. */
    viewport.getBoundingClientRect = () =>
      ({ bottom: 300, height: 300, left: 0, right: 400, top: 0, width: 400, x: 0, y: 0 }) as DOMRect
    const box = card(host, 'c').shadowRoot?.querySelector('[part="node"]') as HTMLElement
    const before = (host as unknown as { view: { x: number } }).view.x
    box.dispatchEvent(pointer('pointerdown', { x: 200, y: 150 }))
    viewport.dispatchEvent(pointer('pointermove', { x: 399, y: 150 }))
    // Where the hand alone took it, at whatever zoom the board is drawn.
    const handed = card(host, 'c').x
    expect(handed).toBeGreaterThan(130)
    await new Promise((done) => setTimeout(done, 120))
    await host.updateComplete
    // Further, by however far the board moved under the still hand.
    const moved = card(host, 'c').x
    expect(moved).toBeGreaterThan(handed)
    expect((host as unknown as { view: { x: number } }).view.x).toBeGreaterThan(before)
    viewport.dispatchEvent(pointer('pointerup', { x: 399, y: 150 }))
    await new Promise((done) => setTimeout(done, 80))
    expect(card(host, 'c').x).toBe(moved)
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
    host.dispatchEvent(pointer('pointermove', ...onScreen(host, 230, 308)))
    await host.updateComplete
    expect(part(host, 'draft')).not.toBeNull()
    host.dispatchEvent(pointer('pointerup', ...onScreen(host, 230, 308)))
    await host.updateComplete
    /* Near Third's top edge, so it arrives at the top: the side nearest the
       pointer, not the one facing the card it came from. */
    expect(asked).toEqual([{ from: 'a', fromSide: 'right', to: 'c', toSide: 'top' }])
    expect(part(host, 'draft')).toBeNull()
  })

  test('a connection let go just off a card arrives at it, and one let go far off arrives nowhere', async () => {
    const host = await canvas()
    const asked: unknown[] = []
    host.addEventListener('helix-connect', (event) => asked.push((event as CustomEvent).detail))
    const pointer = (type: string, at: [number, number]) =>
      new PointerEvent(type, {
        bubbles: true,
        button: 0,
        clientX: at[0],
        clientY: at[1],
        composed: true,
        pointerId: 4,
      })
    const draw = async (to: [number, number]): Promise<void> => {
      const handle = card(host, 'a').shadowRoot?.querySelector('[part~="handle-right"]') as Element
      handle.dispatchEvent(pointer('pointerdown', [0, 0]))
      host.dispatchEvent(pointer('pointermove', to))
      await host.updateComplete
      host.dispatchEvent(pointer('pointerup', to))
      await host.updateComplete
    }
    // Third is at 130..330, 300..400: 12 below its bottom edge, then 60 below it.
    await draw(onScreen(host, 230, 412))
    expect(asked).toEqual([{ from: 'a', fromSide: 'right', to: 'c', toSide: 'bottom' }])
    await draw(onScreen(host, 230, 460))
    expect(asked).toHaveLength(1)
  })

  test('a double click on the empty board zooms in about it, and with Shift out', async () => {
    const host = await canvas()
    const zoom = (): number => (host as unknown as { view: { zoom: number } }).view.zoom
    const viewport = part(host, 'viewport') as HTMLElement
    /* happy-dom measures nothing, so the box is given: the double click is
       placed by where it lands, since a browser sends it to the host. */
    viewport.getBoundingClientRect = () =>
      ({ bottom: 300, height: 300, left: 0, right: 400, top: 0, width: 400, x: 0, y: 0 }) as DOMRect
    const before = zoom()
    viewport.dispatchEvent(
      new MouseEvent('dblclick', { bubbles: true, clientX: 5, clientY: 5, composed: true }),
    )
    await host.updateComplete
    expect(zoom()).toBeCloseTo(before * 2)
    viewport.dispatchEvent(
      new MouseEvent('dblclick', {
        bubbles: true,
        clientX: 5,
        clientY: 5,
        composed: true,
        shiftKey: true,
      }),
    )
    await host.updateComplete
    expect(zoom()).toBeCloseTo(before)
    // On a control, it is the control's.
    part(host, 'zoom-in')?.dispatchEvent(
      new MouseEvent('dblclick', { bubbles: true, clientX: 5, clientY: 5, composed: true }),
    )
    await host.updateComplete
    expect(zoom()).toBeCloseTo(before)
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
    connection(host, 'edge:e1').dispatchEvent(pointer('pointerdown', ...onScreen(host, 253, 50)))
    // Over Third, near its top.
    host.dispatchEvent(pointer('pointermove', ...onScreen(host, 230, 308)))
    await host.updateComplete
    await host.updateComplete
    expect(hasState(card(host, 'c'), 'target')).toBe(true)
    host.dispatchEvent(pointer('pointerup', ...onScreen(host, 230, 308)))
    await host.updateComplete
    /* The end that stayed keeps the side it was drawn on, First's right,
       and says so, so what lands is what the reader was shown. */
    expect(said).toEqual([
      {
        from: 'a',
        fromSide: 'right',
        name: 'e1',
        to: 'c',
        toSide: 'top',
        was: { from: 'a', to: 'b' },
      },
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
    connection(host, 'edge:e1').dispatchEvent(pointer('pointerdown', ...onScreen(host, 253, 50)))
    host.dispatchEvent(pointer('pointermove', ...onScreen(host, 230, 308)))
    host.dispatchEvent(pointer('pointerup', ...onScreen(host, 230, 308)))
    await host.updateComplete
    expect((host.querySelector('[name="e1"]') as HTMLElement & { to: string }).to).toBe('b')

    const removed: unknown[] = []
    host.addEventListener('helix-remove', (event) => removed.push((event as CustomEvent).detail))
    connection(host, 'edge:e1').dispatchEvent(pointer('pointerdown', ...onScreen(host, 253, 50)))
    // Out over empty board, below everything.
    host.dispatchEvent(pointer('pointermove', ...onScreen(host, 548, 548)))
    host.dispatchEvent(pointer('pointerup', ...onScreen(host, 548, 548)))
    expect(removed).toEqual([{ edges: [{ from: 'a', name: 'e1', to: 'b' }], nodes: [] }])
  })

  test('the end that stays does not move while the other is dragged', async () => {
    const host = await canvas()
    const pointer = (type: string, x: number, y: number) =>
      new PointerEvent(type, {
        bubbles: true,
        button: 0,
        clientX: x,
        clientY: y,
        composed: true,
        pointerId: 14,
      })
    /* e1 leaves First's right side, at (200, 50), which is (252, 102) on the
       plane. Its arriving end is dragged down and to the left, where First's
       bottom side is nearer the pointer than its right: a side worked out
       again on every move would jump there. */
    connection(host, 'edge:e1').dispatchEvent(pointer('pointerdown', ...onScreen(host, 253, 50)))
    host.dispatchEvent(pointer('pointermove', ...onScreen(host, -12, 548)))
    await host.updateComplete
    await host.updateComplete
    expect(part(host, 'draft')?.getAttribute('d')).toMatch(/^M 252 102 /)
    host.dispatchEvent(pointer('pointercancel', ...onScreen(host, -12, 548)))
  })

  test('a press on a connection lights no cards until it becomes a drag', async () => {
    const host = await canvas()
    const pointer = (type: string, x: number, y: number) =>
      new PointerEvent(type, {
        bubbles: true,
        button: 0,
        clientX: x,
        clientY: y,
        composed: true,
        pointerId: 13,
      })
    connection(host, 'edge:e1').dispatchEvent(pointer('pointerdown', ...onScreen(host, 253, 50)))
    await host.updateComplete
    await host.updateComplete
    expect(hasState(card(host, 'c'), 'candidate')).toBe(false)
    expect(hasState(host, 'connecting')).toBe(false)
    host.dispatchEvent(pointer('pointermove', ...onScreen(host, 230, 308)))
    await host.updateComplete
    await host.updateComplete
    expect(hasState(card(host, 'c'), 'candidate')).toBe(true)
    host.dispatchEvent(pointer('pointerup', ...onScreen(host, 230, 308)))
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
    expect(said).toEqual([
      { from: 'a', fromSide: 'right', name: 'e1', to: 'c', was: { from: 'a', to: 'b' } },
    ])
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
    /* The page removed them inside the listener; the slot hears it on a later
       turn, and the board moves focus on the update after that. */
    for (let turn = 0; turn < 4; turn++) {
      await new Promise((settle) => setTimeout(settle, 0))
      await host.updateComplete
    }
    expect(card(host, 'c').current).toBe(true)
  })
})

/**
 * A card the page takes away while a reader is on it, outside the Delete flow:
 * a filter, another person's edit, an undo. Map refocuses a neighbor the same
 * way. Measured before this: focus fell to the page's body.
 */
describe('a focused card the page removes', () => {
  const turns = async (host: Canvas): Promise<void> => {
    for (let turn = 0; turn < 4; turn++) {
      await new Promise((settle) => setTimeout(settle, 0))
      await host.updateComplete
    }
  }

  test('hands focus to the next card', async () => {
    const host = await canvas()
    card(host, 'b').focus()
    expect(document.activeElement).toBe(card(host, 'b'))
    card(host, 'b').remove()
    await turns(host)
    expect(document.activeElement).toBe(card(host, 'c'))
    expect(card(host, 'c').current).toBe(true)
  })

  test('to the one before where it was the last', async () => {
    const host = await canvas()
    card(host, 'c').focus()
    card(host, 'c').remove()
    await turns(host)
    expect(document.activeElement).toBe(card(host, 'b'))
  })

  test('and to the board where none is left', async () => {
    const host = await canvas(
      '',
      '<helix-headless-canvas-node name="a" x="0" y="0" width="200" height="100">First</helix-headless-canvas-node>',
    )
    card(host, 'a').focus()
    card(host, 'a').remove()
    await turns(host)
    expect(document.activeElement).toBe(host)
    expect(host.shadowRoot?.activeElement).toBe(part(host, 'region'))
  })

  test('leaves focus where it is when the reader had already gone elsewhere', async () => {
    const host = await canvas()
    const elsewhere = document.createElement('button')
    document.body.append(elsewhere)
    card(host, 'b').focus()
    elsewhere.focus()
    card(host, 'b').remove()
    await turns(host)
    expect(document.activeElement).toBe(elsewhere)
    elsewhere.remove()
  })

  test('and a card removed while another has focus moves nothing', async () => {
    const host = await canvas()
    card(host, 'a').focus()
    card(host, 'c').remove()
    await turns(host)
    expect(document.activeElement).toBe(card(host, 'a'))
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
    host.dispatchEvent(pointer('pointermove', ...onScreen(host, 228, 350)))
    await host.updateComplete
    await host.updateComplete
    expect(hasState(card(host, 'c'), 'target')).toBe(true)
    expect(hasState(card(host, 'b'), 'candidate')).toBe(true)
    // Not the card it started from.
    expect(hasState(card(host, 'a'), 'candidate')).toBe(false)
    // The preview is the connection it would make, arrowhead and all.
    expect(part(host, 'draft')?.getAttribute('marker-end')).toBe('url(#canvas-arrow)')
    host.dispatchEvent(pointer('pointerup', ...onScreen(host, 228, 350)))
    await host.updateComplete
    await host.updateComplete
    expect(hasState(card(host, 'c'), 'target')).toBe(false)
  })
})

/**
 * What a key changes that a reader cannot see, said in the live region, and
 * a selection said on what is selected.
 */
describe('canvas says what a key did', () => {
  type Said = Canvas & { selected: string; zoom(by: number): void }

  const said = (host: Canvas): string =>
    (part(host, 'live')?.textContent ?? '').replace(/ /g, '').trim()

  const key = (on: Card, init: KeyboardEventInit): void => {
    on.shadowRoot
      ?.querySelector('[part="node"]')
      ?.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, cancelable: true, composed: true, ...init }),
      )
  }

  test('a card moved by keys says where it is now, and one resized says its size', async () => {
    const host = await canvas()
    press(card(host, 'c'), 'ArrowRight', true)
    await host.updateComplete
    expect(said(host)).toBe('Third moved to 146, 300')
    key(card(host, 'c'), { altKey: true, key: 'ArrowDown' })
    await host.updateComplete
    expect(said(host)).toBe('Third resized to 200 by 116')
  })

  test('a move the page refuses is not said', async () => {
    const host = await canvas()
    host.addEventListener('helix-before-move', (event) => event.preventDefault())
    press(card(host, 'c'), 'ArrowRight', true)
    await host.updateComplete
    expect(said(host)).toBe('')
  })

  test('the selection is counted when it grows or shrinks, and not when a key lands on a card', async () => {
    const host = (await canvas()) as Said
    card(host, 'a').focus()
    await host.updateComplete
    expect(host.selected).toBe('a')
    expect(said(host)).toBe('')
    press(card(host, 'b'), ' ')
    await host.updateComplete
    expect(said(host)).toBe('2 selected')
    key(card(host, 'b'), { ctrlKey: true, key: 'a' })
    await host.updateComplete
    expect(said(host)).toBe('6 selected')
    press(card(host, 'b'), 'Escape')
    await host.updateComplete
    expect(said(host)).toBe('0 selected')
  })

  test('a selected card and a selected connection say so when a reader arrives', async () => {
    const host = (await canvas('selected-label="chosen"')) as Said
    host.selected = 'a,e2'
    await host.updateComplete
    await host.updateComplete
    const about = card(host, 'a').shadowRoot?.querySelector('#about')
    expect(about?.textContent).toBe('chosen, leads to Second')
    expect(
      card(host, 'a').shadowRoot?.querySelector('[part="node"]')?.getAttribute('aria-describedby'),
    ).toBe('about')
    expect(connection(host, 'edge:e2').getAttribute('aria-description')).toBe('chosen, then')
    expect(card(host, 'b').shadowRoot?.querySelector('#about')?.textContent).toBe(
      'leads to Third; from First',
    )
  })

  test('a zoom from a key or a button says the zoom as a percentage', async () => {
    const host = (await canvas()) as Said
    host.zoom(1)
    await host.updateComplete
    expect(said(host)).toBe('Zoom 125%')
    host.zoom(-1)
    await host.updateComplete
    expect(said(host)).toBe('Zoom 100%')
  })
})

/**
 * Selecting, and editing what is selected: labels the board draws are edited
 * in place, and a card is edited by the page, which the board asks.
 */
describe('canvas selection and editing', () => {
  type Selectable = Canvas & { selected: string }

  test('landing on a card or a connection selects it, and says so', async () => {
    const host = (await canvas()) as Selectable
    const told: string[] = []
    host.addEventListener('helix-select', (event) => told.push((event as CustomEvent).detail.value))
    card(host, 'b').focus()
    await host.updateComplete
    await host.updateComplete
    expect(host.selected).toBe('b')
    expect(hasState(card(host, 'b'), 'selected')).toBe(true)
    connection(host, 'edge:e2').focus()
    await host.updateComplete
    await host.updateComplete
    expect(host.selected).toBe('e2')
    expect(hasState(card(host, 'b'), 'selected')).toBe(false)
    expect(host.shadowRoot?.querySelector('[part="edge"][data-selected]')).not.toBeNull()
    expect(told).toEqual(['b', 'e2'])
  })

  test('Escape selects nothing, and so does a click on the empty board', async () => {
    const host = (await canvas()) as Selectable
    host.selected = 'a'
    await host.updateComplete
    press(card(host, 'a'), 'Escape')
    expect(host.selected).toBe('')

    host.selected = 'a'
    const viewport = part(host, 'viewport') as HTMLElement
    const pointer = (type: string) =>
      new PointerEvent(type, {
        bubbles: true,
        button: 0,
        clientX: 5,
        clientY: 5,
        composed: true,
        pointerId: 11,
      })
    viewport.dispatchEvent(pointer('pointerdown'))
    viewport.dispatchEvent(pointer('pointerup'))
    expect(host.selected).toBe('')
  })

  test('selection stays when focus leaves the board', async () => {
    const host = (await canvas()) as Selectable
    card(host, 'c').focus()
    await host.updateComplete
    const outside = document.createElement('button')
    document.body.append(outside)
    outside.focus()
    await host.updateComplete
    expect(host.selected).toBe('c')
    outside.remove()
  })

  test('F2 on a connection edits its label in place, and the board writes it back', async () => {
    const host = await canvas()
    const said: unknown[] = []
    host.addEventListener('helix-relabel', (event) => said.push((event as CustomEvent).detail))
    pressOn(connection(host, 'edge:e2'), 'F2')
    await host.updateComplete
    const field = part(host, 'label-editor') as HTMLInputElement
    expect(field.value).toBe('then')
    field.value = 'and then'
    field.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        composed: true,
        key: 'Enter',
      }),
    )
    await host.updateComplete
    expect(part(host, 'label-editor')).toBeNull()
    expect((host.querySelector('[name="e2"]') as HTMLElement & { label?: string }).label).toBe(
      'and then',
    )
    expect(said).toEqual([
      { from: 'b', label: 'and then', name: 'e2', target: 'edge', to: 'c', was: 'then' },
    ])
  })

  test('Escape puts a label back, a refused one stays, and the arrows stay in the field', async () => {
    const host = await canvas()
    pressOn(connection(host, 'edge:e2'), 'F2')
    await host.updateComplete
    let field = part(host, 'label-editor') as HTMLInputElement
    const before = (part(host, 'viewport') as HTMLElement).getAttribute('style')
    field.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        composed: true,
        key: 'ArrowRight',
      }),
    )
    // An arrow in the field moves the caret, not the board.
    expect((part(host, 'viewport') as HTMLElement).getAttribute('style')).toBe(before)
    field.value = 'nope'
    field.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        composed: true,
        key: 'Escape',
      }),
    )
    await host.updateComplete
    expect((host.querySelector('[name="e2"]') as HTMLElement & { label?: string }).label).toBe(
      'then',
    )

    host.addEventListener('helix-before-relabel', (event) => event.preventDefault())
    pressOn(connection(host, 'edge:e2'), 'F2')
    await host.updateComplete
    field = part(host, 'label-editor') as HTMLInputElement
    field.value = 'refused'
    field.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        composed: true,
        key: 'Enter',
      }),
    )
    await host.updateComplete
    expect((host.querySelector('[name="e2"]') as HTMLElement & { label?: string }).label).toBe(
      'then',
    )
  })

  test('a group is renamed in place, and a card asks the page to edit it', async () => {
    const host = await canvas()
    press(card(host, 'pair'), 'Enter')
    await host.updateComplete
    const field = part(host, 'label-editor') as HTMLInputElement
    expect(field.value).toBe('The pair')
    field.value = 'The two'
    field.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        composed: true,
        key: 'Enter',
      }),
    )
    await host.updateComplete
    expect(card(host, 'pair').label).toBe('The two')

    const asked: unknown[] = []
    host.addEventListener('helix-canvas-edit', (event) => asked.push((event as CustomEvent).detail))
    press(card(host, 'a'), 'Enter')
    card(host, 'b').dispatchEvent(new MouseEvent('dblclick', { bubbles: true, composed: true }))
    expect(asked).toEqual([{ name: 'a' }, { name: 'b' }])
  })

  test('a read-only board edits nothing', async () => {
    const host = await canvas('readonly')
    let asked = 0
    host.addEventListener('helix-canvas-edit', () => {
      asked += 1
    })
    press(card(host, 'a'), 'Enter')
    pressOn(connection(host, 'edge:e2'), 'F2')
    await host.updateComplete
    expect(asked).toBe(0)
    expect(part(host, 'label-editor')).toBeNull()
  })

  test('a press on a button inside a card is the button\u2019s, not a drag', async () => {
    const host = await canvas(
      '',
      '<helix-headless-canvas-node name="a" x="0" y="0" width="80" height="40"><button>Go</button></helix-headless-canvas-node>',
    )
    let moved = false
    host.addEventListener('helix-before-move', () => {
      moved = true
    })
    const pointer = (type: string, x: number) =>
      new PointerEvent(type, {
        bubbles: true,
        button: 0,
        clientX: x,
        clientY: 5,
        composed: true,
        pointerId: 12,
      })
    host.querySelector('button')?.dispatchEvent(pointer('pointerdown', 5))
    host.dispatchEvent(pointer('pointermove', 60))
    host.dispatchEvent(pointer('pointerup', 60))
    expect(moved).toBe(false)
  })
})

/**
 * Several at once, resizing, and shapes: what a board a reader works on needs
 * beyond one card at a time.
 */
describe('canvas selections, sizes and shapes', () => {
  type Board = Canvas & { selected: string }
  let id = 40
  const pointer = (type: string, x: number, y: number, init: PointerEventInit = {}) =>
    new PointerEvent(type, {
      bubbles: true,
      button: 0,
      clientX: x,
      clientY: y,
      composed: true,
      pointerId: id,
      ...init,
    })
  const box = (host: Canvas, name: string) =>
    card(host, name).shadowRoot?.querySelector('[part="node"]') as HTMLElement
  const click = (host: Canvas, name: string, init: PointerEventInit = {}) => {
    id += 1
    box(host, name).dispatchEvent(pointer('pointerdown', 10, 10, init))
    host.dispatchEvent(pointer('pointerup', 10, 10, init))
  }

  test('a click selects one, and a modified click adds and takes away', async () => {
    const host = (await canvas()) as Board
    click(host, 'a')
    expect(host.selected).toBe('a')
    click(host, 'c', { shiftKey: true })
    expect(host.selected).toBe('a,c')
    click(host, 'a', { metaKey: true })
    expect(host.selected).toBe('c')
    click(host, 'b')
    expect(host.selected).toBe('b')
  })

  test('Space adds and takes away, and Command with A selects everything', async () => {
    const host = (await canvas()) as Board
    host.selected = 'a'
    press(card(host, 'c'), ' ')
    expect(host.selected).toBe('a,c')
    press(card(host, 'a'), ' ')
    expect(host.selected).toBe('c')
    const all = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      composed: true,
      key: 'a',
      metaKey: true,
    })
    box(host, 'a').dispatchEvent(all)
    expect(host.selected.split(',').sort()).toEqual(['a', 'b', 'c', 'e1', 'e2', 'pair'])
  })

  test('Shift and a drag across the empty board selects the cards it touches', async () => {
    const host = (await canvas()) as Board
    const viewport = part(host, 'viewport') as HTMLElement
    id += 1
    /* The document's point plus 52, happy-dom measuring nothing. From above
       Third's top left to inside it, touching only Third. */
    viewport.dispatchEvent(pointer('pointerdown', ...onScreen(host, 98, 278), { shiftKey: true }))
    host.dispatchEvent(pointer('pointermove', ...onScreen(host, 198, 348), { shiftKey: true }))
    await host.updateComplete
    expect(part(host, 'marquee')).not.toBeNull()
    host.dispatchEvent(pointer('pointerup', ...onScreen(host, 198, 348), { shiftKey: true }))
    await host.updateComplete
    expect(host.selected).toBe('c')
    expect(part(host, 'marquee')).toBeNull()
  })

  test('a drag and Shift with an arrow move the whole selection', async () => {
    const host = (await canvas()) as Board
    host.selected = 'a,c'
    await host.updateComplete
    press(card(host, 'c'), 'ArrowRight', true)
    await host.updateComplete
    expect([card(host, 'a').x, card(host, 'c').x, card(host, 'b').x]).toEqual([16, 146, 260])

    id += 1
    box(host, 'a').dispatchEvent(pointer('pointerdown', 10, 10))
    host.dispatchEvent(pointer('pointermove', 30, 10))
    host.dispatchEvent(pointer('pointerup', 30, 10))
    await host.updateComplete
    expect([card(host, 'a').x, card(host, 'c').x, card(host, 'b').x]).toEqual([36, 166, 260])
  })

  test('Delete takes the whole selection, and the connections it strands', async () => {
    const host = (await canvas()) as Board
    host.selected = 'a,c'
    await host.updateComplete
    const asked: Array<{ nodes: string[]; edges: Array<{ name: string }> }> = []
    host.addEventListener('helix-remove', (event) => asked.push((event as CustomEvent).detail))
    press(card(host, 'a'), 'Delete')
    expect(asked[0]?.nodes).toEqual(['a', 'c'])
    expect(asked[0]?.edges.map((one) => one.name)).toEqual(['e1', 'e2'])
  })

  test('a selected card is resized from a corner, and says so as a move', async () => {
    const host = (await canvas()) as Board
    host.selected = 'c'
    await host.updateComplete
    await host.updateComplete
    const grip = card(host, 'c').shadowRoot?.querySelector('[part~="grip-top-left"]') as Element
    expect(grip).not.toBeNull()
    const said: unknown[] = []
    host.addEventListener('helix-move', (event) => said.push((event as CustomEvent).detail))
    id += 1
    grip.dispatchEvent(pointer('pointerdown', 0, 0))
    host.dispatchEvent(pointer('pointermove', -20, 10))
    host.dispatchEvent(pointer('pointerup', -20, 10))
    // Dragged up-left from the top left: wider by 20, shorter by 10, and moved.
    expect(said).toEqual([{ nodes: [{ height: 90, name: 'c', width: 220, x: 110, y: 310 }] }])
    // Only the one selected card has grips.
    expect(card(host, 'a').shadowRoot?.querySelector('[part~="grip"]')).toBeNull()
  })

  test('Alt with an arrow resizes from the bottom right, never below the least size', async () => {
    const host = await canvas()
    const c = card(host, 'c') as Card & { width: number; height: number }
    press(c, 'ArrowRight')
    const alt = (key: string) =>
      c.shadowRoot?.querySelector('[part="node"]')?.dispatchEvent(
        new KeyboardEvent('keydown', {
          altKey: true,
          bubbles: true,
          cancelable: true,
          composed: true,
          key,
        }),
      )
    alt('ArrowRight')
    alt('ArrowDown')
    expect([c.width, c.height]).toEqual([216, 116])
    for (let at = 0; at < 20; at++) {
      alt('ArrowUp')
    }
    expect(c.height).toBe(32)
  })

  test('a diamond draws its own outline, and a circle needs none', async () => {
    const host = await canvas()
    card(host, 'c').setAttribute('shape', 'diamond')
    card(host, 'b').setAttribute('shape', 'circle')
    await host.updateComplete
    await (card(host, 'c') as unknown as { updateComplete: Promise<boolean> }).updateComplete
    expect(card(host, 'c').shadowRoot?.querySelector('[part="outline"] polygon')).not.toBeNull()
    expect(card(host, 'b').shadowRoot?.querySelector('[part="outline"]')).toBeNull()
  })
})

/** What a review of the family found, each held here so it stays found. */
describe('canvas review fixes', () => {
  type Board = Canvas & { selected: string; pan(to: string): void }

  test('pan moves the way the text runs, so a right-to-left page reverses it', async () => {
    const ltr = (await canvas()) as Board
    const rtl = (await canvas('dir="rtl"')) as Board
    const x = (host: Canvas) =>
      Number(
        /--_canvas-x: (-?[0-9.]+)/.exec(
          (part(host, 'viewport') as HTMLElement).getAttribute('style') ?? '',
        )?.[1],
      )
    const before = [x(ltr), x(rtl)]
    ltr.pan('end')
    rtl.pan('end')
    await ltr.updateComplete
    await rtl.updateComplete
    expect(Math.sign(x(ltr) - (before[0] ?? 0))).toBe(-1)
    expect(Math.sign(x(rtl) - (before[1] ?? 0))).toBe(1)
  })

  test('a click on a card of a read-only board selects it rather than clearing', async () => {
    const host = (await canvas('readonly')) as Board
    const box = card(host, 'c').shadowRoot?.querySelector('[part="node"]') as HTMLElement
    const pointer = (type: string) =>
      new PointerEvent(type, {
        bubbles: true,
        button: 0,
        clientX: 5,
        clientY: 5,
        composed: true,
        pointerId: 70,
      })
    box.dispatchEvent(pointer('pointerdown'))
    host.dispatchEvent(pointer('pointerup'))
    expect(host.selected).toBe('c')
  })

  test('a box inside a group selects the cards it touches, not the group', async () => {
    const host = (await canvas()) as Board
    const viewport = part(host, 'viewport') as HTMLElement
    const pointer = (type: string, at: [number, number]) =>
      new PointerEvent(type, {
        bubbles: true,
        button: 0,
        clientX: at[0],
        clientY: at[1],
        composed: true,
        pointerId: 71,
        shiftKey: true,
      })
    // Inside The pair, across First only.
    viewport.dispatchEvent(pointer('pointerdown', onScreen(host, 10, 10)))
    host.dispatchEvent(pointer('pointermove', onScreen(host, 50, 50)))
    host.dispatchEvent(pointer('pointerup', onScreen(host, 50, 50)))
    expect(host.selected).toBe('a')
  })

  test('a mouse that let go outside the board does not keep carrying a card', async () => {
    const host = await canvas()
    const box = card(host, 'c').shadowRoot?.querySelector('[part="node"]') as HTMLElement
    box.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        button: 0,
        clientX: 5,
        clientY: 5,
        composed: true,
        pointerId: 72,
      }),
    )
    // The release happened elsewhere; the next move has no button down.
    host.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        buttons: 0,
        clientX: 90,
        clientY: 90,
        composed: true,
        pointerId: 72,
        pointerType: 'mouse',
      }),
    )
    host.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        buttons: 0,
        clientX: 190,
        clientY: 190,
        composed: true,
        pointerId: 72,
        pointerType: 'mouse',
      }),
    )
    await host.updateComplete
    expect(card(host, 'c').x).toBe(130)
    expect(hasState(host, 'pressing')).toBe(false)
  })
})

/**
 * The gestures a board is reached for with, which are this family's rather than
 * the surface's: what `Map` frames drags its own view.
 */
describe('canvas tones', () => {
  /* Lit's `Object` converter read a typo as `null`, and reading a tone's
     words off it threw while the cards drew. */
  test('tone-labels that do not parse are no words, and the cards still draw', async () => {
    const host = await canvas(
      `tone-labels="oops"`,
      `<helix-headless-canvas-node name="a" x="0" y="0" width="80" height="40" tone="danger">A</helix-headless-canvas-node>`,
    )
    expect((host as unknown as { toneLabels: unknown }).toneLabels).toEqual({})
    await (card(host, 'a') as unknown as { updateComplete: Promise<unknown> }).updateComplete
    expect(card(host, 'a').shadowRoot?.querySelector('[part="node"]')).not.toBeNull()
  })

  test('a tone the page named is read with the card and the connection, and one it did not is not', async () => {
    const host = await canvas(
      `tone-labels='{"danger": "Blocked"}'`,
      `<helix-headless-canvas-node name="a" x="0" y="0" width="80" height="40" tone="danger">A</helix-headless-canvas-node>
       <helix-headless-canvas-node name="b" x="120" y="0" width="80" height="40" tone="success">B</helix-headless-canvas-node>
       <helix-headless-canvas-edge name="e" from="a" to="b" tone="danger" label="waits on"></helix-headless-canvas-edge>`,
    )
    await (card(host, 'a') as unknown as { updateComplete: Promise<unknown> }).updateComplete
    const described = (id: string): string => {
      const node = card(host, id).shadowRoot?.querySelector('[part="node"]') as HTMLElement
      const scope = node.getRootNode() as ShadowRoot
      return (node.getAttribute('aria-describedby') ?? '')
        .split(' ')
        .filter(Boolean)
        .map((ref) => scope.getElementById(ref)?.textContent ?? '')
        .join(' | ')
    }
    expect(described('a')).toBe('Blocked, leads to B')
    expect(described('b')).toBe('from A')
    const line = host.shadowRoot?.querySelector('[part="edge-target"]') as SVGPathElement
    expect(line.getAttribute('aria-description')).toBe('Blocked, waits on')
  })
})

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

  /** A finger on a touch screen, which is a pointer of its own. */
  const finger = (type: string, id: number, spot: { x: number; y: number }): PointerEvent =>
    new PointerEvent(type, {
      bubbles: true,
      button: 0,
      clientX: spot.x,
      clientY: spot.y,
      composed: true,
      pointerId: id,
      pointerType: 'touch',
    })

  test('two fingers spread apart zoom the board, and what was between them stays there', async () => {
    const host = await canvas()
    const viewport = part(host, 'viewport') as HTMLElement
    const box = viewport.getBoundingClientRect()
    const before = at(host)
    viewport.dispatchEvent(finger('pointerdown', 1, { x: 100, y: 100 }))
    viewport.dispatchEvent(finger('pointerdown', 2, { x: 200, y: 100 }))
    /* Twice as far apart, and the point between them 50 pixels to the right. */
    viewport.dispatchEvent(finger('pointermove', 2, { x: 300, y: 100 }))
    await host.updateComplete
    const after = at(host)
    expect(after.zoom).toBeCloseTo(before.zoom * 2, 5)
    /* The point of the board under the fingers' middle at the start is under
       their middle now. */
    const from = 150 - box.left
    const to = 200 - box.left
    expect(after.x).toBeCloseTo(to - (from - before.x) * 2, 5)
  })

  test('the second finger starts nothing of its own, and the one left after a pinch moves nothing', async () => {
    const host = await canvas()
    const viewport = part(host, 'viewport') as HTMLElement
    viewport.dispatchEvent(finger('pointerdown', 1, { x: 100, y: 100 }))
    viewport.dispatchEvent(finger('pointerdown', 2, { x: 200, y: 100 }))
    viewport.dispatchEvent(finger('pointermove', 2, { x: 260, y: 100 }))
    await host.updateComplete
    viewport.dispatchEvent(finger('pointerup', 2, { x: 260, y: 100 }))
    const pinched = at(host)
    viewport.dispatchEvent(finger('pointermove', 1, { x: 180, y: 160 }))
    await host.updateComplete
    expect(at(host)).toEqual(pinched)
    viewport.dispatchEvent(finger('pointerup', 1, { x: 180, y: 160 }))
    /* And the next single finger pans again. */
    viewport.dispatchEvent(finger('pointerdown', 3, { x: 100, y: 100 }))
    viewport.dispatchEvent(finger('pointermove', 3, { x: 130, y: 100 }))
    await host.updateComplete
    expect(at(host).x - pinched.x).toBe(30)
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

  /** A wheel with its modifiers put back, which happy-dom's constructor drops. */
  const wheel = (init: WheelEventInit = {}): WheelEvent => {
    const event = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      composed: true,
      deltaY: 40,
      ...init,
    })
    Object.defineProperty(event, 'ctrlKey', { value: init.ctrlKey === true })
    Object.defineProperty(event, 'metaKey', { value: init.metaKey === true })
    return event
  }

  const hint = (host: Canvas): string => {
    const shown = part(host, 'gesture-hint') as HTMLElement | null
    return shown && !shown.hidden ? (shown.textContent ?? '') : ''
  }

  test('always: the plain wheel moves the board', async () => {
    const host = await canvas('gestures="always"')
    const before = at(host)
    const event = wheel()
    ;(part(host, 'viewport') as HTMLElement).dispatchEvent(event)
    await host.updateComplete
    expect(event.defaultPrevented).toBe(true)
    expect(at(host).y).not.toBe(before.y)
  })

  test('cooperative: the plain wheel is the page’s and is said, and ⌘ with it zooms', async () => {
    const host = await canvas('gestures="cooperative"')
    const viewport = part(host, 'viewport') as HTMLElement
    const before = at(host)
    const plain = wheel()
    viewport.dispatchEvent(plain)
    await host.updateComplete
    expect(plain.defaultPrevented).toBe(false)
    expect(at(host)).toEqual(before)
    expect(hint(host)).toMatch(/^Use (Ctrl|⌘) and scroll to zoom the board$/)
    expect(hasState(host, 'sharing')).toBe(true)
    const zoom = wheel({ deltaY: -10, metaKey: true })
    viewport.dispatchEvent(zoom)
    await host.updateComplete
    expect(zoom.defaultPrevented).toBe(true)
    expect(at(host).zoom).toBeGreaterThan(before.zoom)
  })

  test('cooperative: one finger is the page’s, and moves nothing', async () => {
    const host = await canvas('gestures="cooperative"')
    const viewport = part(host, 'viewport') as HTMLElement
    const before = at(host)
    const finger = (type: string, x: number): PointerEvent =>
      new PointerEvent(type, {
        bubbles: true,
        button: 0,
        clientX: x,
        clientY: 100,
        composed: true,
        pointerId: 7,
        pointerType: 'touch',
      })
    viewport.dispatchEvent(finger('pointerdown', 100))
    viewport.dispatchEvent(finger('pointermove', 160))
    await host.updateComplete
    expect(at(host)).toEqual(before)
  })

  test('activate: the first press hands over the gestures and moves nothing, and Escape gives them back', async () => {
    /* Over the board, as a page styling the headless tier puts them: in the
       flow, the hint's line refits the board, which a browser measures. */
    const over = document.createElement('style')
    over.textContent = `helix-headless-canvas::part(gesture-hint),
      helix-headless-canvas::part(gesture-status) { position: absolute; }`
    document.head.append(over)
    const host = await canvas('gestures="activate"')
    const viewport = part(host, 'viewport') as HTMLElement
    const before = at(host)
    const ignored = wheel({ ctrlKey: true })
    viewport.dispatchEvent(ignored)
    await host.updateComplete
    expect(ignored.defaultPrevented).toBe(false)
    expect(hint(host)).toBe('Press the board to use it')

    viewport.dispatchEvent(pointer('pointerdown', { x: 100, y: 100 }))
    viewport.dispatchEvent(pointer('pointermove', { x: 160, y: 130 }))
    viewport.dispatchEvent(pointer('pointerup', { x: 160, y: 130 }))
    await host.updateComplete
    expect(at(host)).toEqual(before)
    expect(hasState(host, 'using')).toBe(true)
    expect(part(host, 'gesture-status')?.hasAttribute('hidden')).toBe(false)

    viewport.dispatchEvent(pointer('pointerdown', { x: 100, y: 100 }))
    viewport.dispatchEvent(pointer('pointermove', { x: 160, y: 130 }))
    await host.updateComplete
    expect(at(host).x - before.x).toBe(60)
    viewport.dispatchEvent(pointer('pointerup', { x: 160, y: 130 }))

    host.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }))
    await host.updateComplete
    expect(hasState(host, 'using')).toBe(false)
    over.remove()
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

/**
 * Every drag, done with clicks instead, which WCAG 2.5.7 asks of it: a click on
 * a card's move handle, a corner, a connection point or a connection's end
 * picks the thing up, it follows a pointer with no button down, and the next
 * press puts it down where a drag let go there would have.
 */
describe('canvas without dragging', () => {
  let id = 40
  const pointer = (type: string, x: number, y: number): PointerEvent =>
    new PointerEvent(type, {
      bubbles: true,
      button: 0,
      buttons: type === 'pointermove' || type === 'pointerup' ? 0 : 1,
      cancelable: true,
      clientX: x,
      clientY: y,
      composed: true,
      pointerId: id,
      pointerType: 'mouse',
    })
  /** The board a press lands on, where a card is not under it. */
  const plane = (host: Canvas): HTMLElement => part(host, 'viewport') as HTMLElement
  /** A press and a release in one place, which is a click and picks up. */
  const click = (on: Element, x: number, y: number): void => {
    on.dispatchEvent(pointer('pointerdown', x, y))
    on.dispatchEvent(pointer('pointerup', x, y))
  }
  const selected = async (key: string): Promise<Canvas> => {
    const host = (await canvas()) as Canvas & { selected: string }
    host.selected = key
    await host.updateComplete
    await host.updateComplete
    return host
  }

  test("a click on a selected card's handle picks it up, and the next click puts it down", async () => {
    const host = await selected('c')
    const said: unknown[] = []
    host.addEventListener('helix-move', (event) => said.push((event as CustomEvent).detail))
    const handle = card(host, 'c').shadowRoot?.querySelector('[part="move"]') as Element
    expect(handle).not.toBeNull()
    id += 1
    click(handle, 10, 10)
    await host.updateComplete
    expect(hasState(host, 'holding')).toBe(true)
    // It follows a pointer with no button down, and nothing is said until it lands.
    host.dispatchEvent(pointer('pointermove', 30, 20))
    await host.updateComplete
    expect([card(host, 'c').x, card(host, 'c').y]).toEqual([150, 310])
    expect(said).toEqual([])
    const viewport = part(host, 'viewport') as HTMLElement
    viewport.dispatchEvent(pointer('pointerdown', 50, 30))
    viewport.dispatchEvent(pointer('pointerup', 50, 30))
    await host.updateComplete
    expect([card(host, 'c').x, card(host, 'c').y]).toEqual([170, 320])
    expect(said).toEqual([{ nodes: [{ name: 'c', x: 170, y: 320 }] }])
    expect(hasState(host, 'holding')).toBe(false)
  })

  test('Escape puts back what a click picked up, and says nothing moved', async () => {
    const host = await selected('c')
    let moved = false
    host.addEventListener('helix-move', () => {
      moved = true
    })
    id += 1
    click(card(host, 'c').shadowRoot?.querySelector('[part="move"]') as Element, 10, 10)
    host.dispatchEvent(pointer('pointermove', 50, 30))
    await host.updateComplete
    document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }))
    await host.updateComplete
    expect([card(host, 'c').x, card(host, 'c').y]).toEqual([130, 300])
    expect(moved).toBe(false)
    expect(hasState(host, 'holding')).toBe(false)
  })

  test('a click on a connection point starts a connection, and a click on a card ends it', async () => {
    const host = await canvas()
    const asked: unknown[] = []
    host.addEventListener('helix-connect', (event) => asked.push((event as CustomEvent).detail))
    const handle = card(host, 'a').shadowRoot?.querySelector('[part~="handle-right"]') as Element
    id += 1
    click(handle, 0, 0)
    await host.updateComplete
    expect(asked).toEqual([])
    host.dispatchEvent(pointer('pointermove', ...onScreen(host, 230, 308)))
    await host.updateComplete
    expect(part(host, 'draft')).not.toBeNull()
    const putDown = pointer('pointerdown', ...onScreen(host, 230, 308))
    plane(host).dispatchEvent(putDown)
    await host.updateComplete
    expect(asked).toEqual([{ from: 'a', fromSide: 'right', to: 'c', toSide: 'top' }])
    // It moves nothing else: no focus to the card it landed on, and so no selection.
    expect(putDown.defaultPrevented).toBe(true)
  })

  test('on touch, where nothing follows, the next tap is where it lands', async () => {
    const host = await canvas()
    const asked: unknown[] = []
    host.addEventListener('helix-connect', (event) => asked.push((event as CustomEvent).detail))
    const handle = card(host, 'a').shadowRoot?.querySelector('[part~="handle-right"]') as Element
    id += 1
    click(handle, 0, 0)
    // A second finger, a new pointer, and no move between the two taps.
    id += 1
    plane(host).dispatchEvent(pointer('pointerdown', ...onScreen(host, 230, 308)))
    await host.updateComplete
    expect(asked).toEqual([{ from: 'a', fromSide: 'right', to: 'c', toSide: 'top' }])
  })

  test('a click on a corner picks it up, and the next click sets the size', async () => {
    const host = await selected('c')
    const said: unknown[] = []
    host.addEventListener('helix-move', (event) => said.push((event as CustomEvent).detail))
    id += 1
    click(card(host, 'c').shadowRoot?.querySelector('[part~="grip-top-left"]') as Element, 0, 0)
    plane(host).dispatchEvent(pointer('pointerdown', -20, 10))
    // The same box a drag from the top left to there draws.
    expect(said).toEqual([{ nodes: [{ height: 90, name: 'c', width: 220, x: 110, y: 310 }] }])
  })

  test('a selected connection has ends, and a click on one moves it', async () => {
    const host = await selected('edge:e1')
    const said: unknown[] = []
    host.addEventListener('helix-reconnect', (event) => said.push((event as CustomEvent).detail))
    const ends = host.shadowRoot?.querySelectorAll('[part="edge-end"]') ?? []
    expect(ends).toHaveLength(2)
    const arriving = host.shadowRoot?.querySelector('[part="edge-end"][data-end="to"]') as Element
    id += 1
    click(arriving, ...onScreen(host, 260, 50))
    plane(host).dispatchEvent(pointer('pointerdown', ...onScreen(host, 230, 308)))
    await host.updateComplete
    expect(said).toEqual([
      {
        from: 'a',
        fromSide: 'right',
        name: 'e1',
        to: 'c',
        toSide: 'top',
        was: { from: 'a', to: 'b' },
      },
    ])
  })

  test('a connection with no name stays selected when its end moves', async () => {
    /* One is known by its two cards, so a moved end gives it a new key, and
       the selection went on naming the old one: the connection just moved was
       drawn as unselected. */
    const unnamed = BOARD.replace('name="e1" from="a" to="b"', 'from="a" to="b"')
    const host = (await canvas('', unnamed)) as Canvas & { selected: string }
    host.selected = 'a->b'
    await host.updateComplete
    await host.updateComplete
    const arriving = host.shadowRoot?.querySelector('[part="edge-end"][data-end="to"]') as Element
    expect(arriving).not.toBeNull()
    id += 1
    click(arriving, ...onScreen(host, 260, 50))
    plane(host).dispatchEvent(pointer('pointerdown', ...onScreen(host, 230, 308)))
    await host.updateComplete
    await host.updateComplete
    expect(host.selected).toBe('a->c')
    expect(host.shadowRoot?.querySelector('[part="edge"][data-selected]')).not.toBeNull()
  })

  test('a read-only board has no handle and no ends to pick up', async () => {
    const host = (await canvas('readonly')) as Canvas & { selected: string }
    host.selected = 'c,edge:e1'
    await host.updateComplete
    await host.updateComplete
    expect(card(host, 'c').shadowRoot?.querySelector('[part="move"]')).toBeNull()
    expect(host.shadowRoot?.querySelector('[part="edge-end"]')).toBeNull()
  })
})

/**
 * What the board draws from that no property of a card or a connection says,
 * and the document it writes back out.
 */
describe('canvas beyond the properties', () => {
  /** Lets a `MutationObserver` deliver, then the render it asked for. */
  const heard = async (host: Canvas): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 0))
    await host.updateComplete
  }

  test('a card whose words change is read out by its new ones', async () => {
    const host = await canvas()
    card(host, 'b').textContent = 'Renamed'
    await heard(host)
    expect(connection(host, 'edge:e1').getAttribute('aria-label')).toBe('From First to Renamed')
    expect(card(host, 'a').links).toBe('leads to Renamed')
  })

  test('a drag rewrites the cards that move and leaves the rest alone', async () => {
    /* Every card's place was written on every step, which on a large board
       was most of what a step cost. */
    let cards = ''
    for (let at = 0; at < 30; at++) {
      cards += `<helix-headless-canvas-node name="n${at}" x="${at * 250}" y="0" width="200" height="100">C${at}</helix-headless-canvas-node>`
    }
    const host = (await canvas('', cards)) as Canvas & { selected: string }
    host.selected = 'n15'
    await host.updateComplete
    /* One in the middle, since the plane's corner follows the board's edge
       and a card moved at the edge moves every card with it. */
    const others = [...host.querySelectorAll('helix-headless-canvas-node')].filter(
      (one) => one.getAttribute('name') !== 'n15',
    ) as HTMLElement[]
    let written = 0
    for (const one of others) {
      const set = one.style.setProperty.bind(one.style)
      one.style.setProperty = (...args: Parameters<CSSStyleDeclaration['setProperty']>) => {
        written += 1
        set(...args)
      }
    }
    const box = card(host, 'n15').shadowRoot?.querySelector('[part="node"]') as Element
    const at = (type: string, clientX: number): PointerEvent =>
      new PointerEvent(type, {
        bubbles: true,
        button: 0,
        buttons: 1,
        clientX,
        clientY: 10,
        composed: true,
        pointerId: 5,
        pointerType: 'mouse',
      })
    box.dispatchEvent(at('pointerdown', 10))
    for (let step = 1; step <= 3; step++) {
      host.dispatchEvent(at('pointermove', 10 + step * 20))
      await host.updateComplete
    }
    expect(card(host, 'n15').x).toBeGreaterThan(15 * 250)
    expect(written).toBe(0)
  })

  test('a page that rewrites a card’s whole style leaves its place as it was', async () => {
    const host = await canvas()
    const a = card(host, 'a')
    const was = a.placed('--_canvas-card-x')
    expect(was).toBeDefined()
    a.setAttribute('style', '--canvas-node-color: red')
    await heard(host)
    expect(a.placed('--_canvas-card-x')).toBe(was)
    expect(a.getAttribute('style')).toBe('--canvas-node-color: red')
  })

  test('a color written onto a connection after the first paint is drawn', async () => {
    const host = await canvas(
      '',
      `<helix-headless-canvas-node name="a" x="0" y="0" width="80" height="40">A</helix-headless-canvas-node>
       <helix-headless-canvas-node name="b" x="120" y="0" width="80" height="40">B</helix-headless-canvas-node>
       <helix-headless-canvas-edge name="e" from="a" to="b" style="--canvas-edge-color: red"></helix-headless-canvas-edge>`,
    )
    const edge = host.querySelector('helix-headless-canvas-edge') as HTMLElement
    edge.style.setProperty('--canvas-edge-color', 'blue')
    await heard(host)
    const painted = host.shadowRoot?.querySelector('[part="edge"]') as SVGPathElement
    expect(painted.getAttribute('style')).toContain('--_canvas-edge-color: blue')
  })

  test('a group is read where it sits on the board, and what it holds straight after it', async () => {
    const { reading } = await import('./canvas-document.js')
    const order = reading(
      [
        { height: 300, id: 'later', type: 'group', width: 400, x: 0, y: 600 },
        { height: 40, id: 'title', type: 'text', width: 200, x: 0, y: 0 },
        { height: 40, id: 'inner', type: 'text', width: 100, x: 20, y: 640 },
        { height: 40, id: 'after', type: 'text', width: 100, x: 500, y: 600 },
      ],
      [],
      'spatial',
    )
    expect(order.map((one) => one.id)).toEqual(['title', 'later', 'inner', 'after'])
  })

  test('two groups drawn as the same box are both still read', async () => {
    const { reading } = await import('./canvas-document.js')
    const box = { height: 100, type: 'group' as const, width: 100, x: 0, y: 0 }
    const order = reading(
      [
        { ...box, id: 'one' },
        { ...box, id: 'two' },
      ],
      [],
      'spatial',
    )
    expect(order.map((one) => one.id).sort()).toEqual(['one', 'two'])
  })

  test('a step that turns back on itself keeps the stub out of each side', async () => {
    const { connector } = await import('./canvas-document.js')
    const { d } = connector(
      { fromNode: 'a', fromSide: 'right', id: 'e', toNode: 'b', toSide: 'left' },
      { height: 50, id: 'a', type: 'text', width: 100, x: 300, y: 0 },
      { height: 50, id: 'b', type: 'text', width: 100, x: 0, y: 0 },
      'step',
    )
    // Out to the right of the first card before anything turns back.
    expect(d.startsWith('M 400 25 L')).toBe(true)
    expect(d).not.toBe('M 400 25 L 0 25')
    expect(d).toContain('Q')
  })

  test('every connection goes out with an id of its own, named or not', async () => {
    const host = (await canvas(
      '',
      `<helix-headless-canvas-node name="a" x="0" y="0" width="80" height="40">A</helix-headless-canvas-node>
       <helix-headless-canvas-node name="b" x="120" y="0" width="80" height="40">B</helix-headless-canvas-node>
       <helix-headless-canvas-edge from="a" to="b"></helix-headless-canvas-edge>
       <helix-headless-canvas-edge from="a" to="b" label="again"></helix-headless-canvas-edge>
       <helix-headless-canvas-edge name="named" from="b" to="a"></helix-headless-canvas-edge>`,
    )) as Canvas & { toJsonCanvas(): { edges: Array<{ id: string }> } }
    const ids = host.toJsonCanvas().edges.map((edge) => edge.id)
    expect(ids).toEqual(['a->b', 'a->b#2', 'named'])
  })

  test('a card with no size of its own is as large as what it says', async () => {
    const host = await canvas(
      '',
      '<helix-headless-canvas-node name="loose" x="0" y="0">Loose</helix-headless-canvas-node>',
    )
    const loose = card(host, 'loose')
    expect(loose.placed('--_canvas-card-inline-size')).toBeUndefined()
    expect(loose.placed('--_canvas-card-block-size')).toBeUndefined()
  })

  test('a file’s subpath and a group’s picture come through the import', async () => {
    const { fromJsonCanvas } = await import('../index.js')
    const props = fromJsonCanvas({
      nodes: [
        {
          file: 'a.md',
          height: 10,
          id: 'f',
          subpath: '#Intro',
          type: 'file',
          width: 10,
          x: 0,
          y: 0,
        },
        {
          background: 'bg.png',
          backgroundStyle: 'cover',
          height: 10,
          id: 'g',
          type: 'group',
          width: 10,
          x: 0,
          y: 0,
        },
      ],
    })
    expect(props.nodes[0]?.subpath).toBe('#Intro')
    expect(props.nodes[1]).toMatchObject({ background: 'bg.png', backgroundStyle: 'cover' })
  })
})

/**
 * The board's own review: a gesture that ends early, a document that is not
 * quite well formed, and keys that answered twice.
 */
describe('canvas at its edges', () => {
  const pointer = (type: string, x: number, y: number, id: number): PointerEvent =>
    new PointerEvent(type, {
      bubbles: true,
      button: 0,
      buttons: type === 'pointerdown' ? 1 : 0,
      cancelable: true,
      clientX: x,
      clientY: y,
      composed: true,
      pointerId: id,
      pointerType: 'mouse',
    })

  test('an arrow on a connection walks on, and does not pan the board as well', async () => {
    const host = await canvas()
    const pans: Event[] = []
    host.addEventListener('helix-canvas-pan', (event) => pans.push(event))
    pressOn(connection(host, 'edge:e1'), 'ArrowRight')
    await host.updateComplete
    expect(pans).toHaveLength(0)
    expect(card(host, 'b').current).toBe(true)
  })

  test('an end let go on a held card, or on its own other card, stays connected', async () => {
    const host = await canvas('', BOARD.replace('name="c" x', 'name="c" readonly x'))
    const removed: Event[] = []
    host.addEventListener('helix-remove', (event) => removed.push(event))
    await host.updateComplete
    /* A press with no buttons held, as a pen or a synthetic one arrives. */
    const drop = async (x: number, y: number, pointerId: number): Promise<void> => {
      const at = (type: string, [clientX, clientY]: [number, number]): PointerEvent =>
        new PointerEvent(type, {
          bubbles: true,
          button: 0,
          clientX,
          clientY,
          composed: true,
          pointerId,
        })
      connection(host, 'edge:e1').dispatchEvent(at('pointerdown', onScreen(host, 253, 50)))
      host.dispatchEvent(at('pointermove', onScreen(host, x, y)))
      await host.updateComplete
      host.dispatchEvent(at('pointerup', onScreen(host, x, y)))
      await host.updateComplete
    }
    // On the held card, and then on the card the connection comes from.
    await drop(230, 350, 61)
    await drop(100, 50, 62)
    expect(removed).toHaveLength(0)
  })

  test('a connection to a card that is not there is not a stop the walk sticks on', async () => {
    const host = await canvas(
      '',
      `<helix-headless-canvas-node name="a" x="0" y="0" width="200" height="100">First</helix-headless-canvas-node>
       <helix-headless-canvas-node name="b" x="260" y="0" width="200" height="100">Second</helix-headless-canvas-node>
       <helix-headless-canvas-edge name="gone" from="a" to="nowhere"></helix-headless-canvas-edge>`,
    )
    expect(await walk(host)).toEqual(['a', 'b'])
  })

  test('two connections leaving one card are walked one after the other', async () => {
    const host = await canvas(
      '',
      `<helix-headless-canvas-node name="a" x="0" y="0" width="200" height="100">First</helix-headless-canvas-node>
       <helix-headless-canvas-node name="b" x="260" y="0" width="200" height="100">Second</helix-headless-canvas-node>
       <helix-headless-canvas-node name="c" x="260" y="200" width="200" height="100">Third</helix-headless-canvas-node>
       <helix-headless-canvas-edge name="up" from="a" to="b"></helix-headless-canvas-edge>
       <helix-headless-canvas-edge name="down" from="a" to="c"></helix-headless-canvas-edge>`,
    )
    expect(await walk(host)).toEqual(['a', 'edge:up', 'edge:down', 'b', 'c'])
  })

  /* Chromium makes an SVG element with a focus listener focusable, and the
     edges' SVG carried one, so Tab stopped on an unnamed layer between the
     board and the first card. Browser only: happy-dom focuses an SVG element
     whatever listens to it. */
  ;(hasLayout() ? test : test.skip)(
    'the layer the connections are drawn on is no stop',
    async () => {
      const host = await canvas(
        '',
        `<helix-headless-canvas-node name="a" x="0" y="0" width="200" height="100">First</helix-headless-canvas-node>
       <helix-headless-canvas-node name="b" x="260" y="0" width="200" height="100">Second</helix-headless-canvas-node>
       <helix-headless-canvas-edge from="a" to="b"></helix-headless-canvas-edge>`,
      )
      const layer = part(host, 'edges') as SVGSVGElement
      layer.focus()
      expect(host.shadowRoot?.activeElement).not.toBe(layer)
    },
  )

  test('two unnamed connections between the same cards are two stops', async () => {
    const host = await canvas(
      '',
      `<helix-headless-canvas-node name="a" x="0" y="0" width="200" height="100">First</helix-headless-canvas-node>
       <helix-headless-canvas-node name="b" x="260" y="0" width="200" height="100">Second</helix-headless-canvas-node>
       <helix-headless-canvas-edge from="a" to="b" from-side="right" to-side="left"></helix-headless-canvas-edge>
       <helix-headless-canvas-edge from="a" to="b" from-side="top" to-side="top"></helix-headless-canvas-edge>`,
    )
    expect(await walk(host)).toEqual(['a', 'edge:a->b', 'edge:a->b#2', 'b'])
  })

  test('a card picked up by a click on a board the page holds is asked back on Escape', async () => {
    const host = (await canvas()) as Canvas & { selected: string }
    host.selected = 'c'
    await host.updateComplete
    const asked: Array<{ nodes: Array<{ name: string; x: number; y: number }> }> = []
    host.addEventListener('helix-before-move', (event) => {
      event.preventDefault()
      const detail = (event as CustomEvent).detail as (typeof asked)[number]
      asked.push(detail)
      for (const { name, x, y } of detail.nodes) {
        Object.assign(card(host, name), { x, y })
      }
    })
    const handle = card(host, 'c').shadowRoot?.querySelector('[part="move"]') as Element
    handle.dispatchEvent(pointer('pointerdown', 10, 10, 50))
    handle.dispatchEvent(pointer('pointerup', 10, 10, 50))
    host.dispatchEvent(pointer('pointermove', 50, 30, 50))
    await host.updateComplete
    document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }))
    await host.updateComplete
    expect([card(host, 'c').x, card(host, 'c').y]).toEqual([130, 300])
  })

  test('a connection made from a click and finished with Enter lets go of the board', async () => {
    const host = await canvas()
    const handle = card(host, 'a').shadowRoot?.querySelector('[part~="handle-right"]') as Element
    handle.dispatchEvent(pointer('pointerdown', 0, 0, 77))
    handle.dispatchEvent(pointer('pointerup', 0, 0, 77))
    await host.updateComplete
    expect(hasState(host, 'holding')).toBe(true)
    press(card(host, 'c'), 'Enter')
    await host.updateComplete
    expect(hasState(host, 'holding')).toBe(false)
  })

  test('a connection made from the keyboard ends when focus leaves the board', async () => {
    const host = await canvas()
    const outside = document.createElement('button')
    host.after(outside)
    card(host, 'a').focus()
    press(card(host, 'a'), 'c')
    await host.updateComplete
    expect(hasState(host, 'connecting')).toBe(true)
    outside.focus()
    await host.updateComplete
    expect(hasState(host, 'connecting')).toBe(false)
    outside.remove()
  })

  test('a canceled press is not a click, on a card or on the board', async () => {
    /* On touch the browser cancels the pointer when it takes the gesture for
       a scroll, and neither a selection nor its loss was what the reader did. */
    const host = (await canvas()) as Canvas & { selected: string }
    host.selected = 'a'
    await host.updateComplete
    const on = (target: Element, type: string, shiftKey = false): void => {
      target.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          button: 0,
          clientX: 5,
          clientY: 5,
          composed: true,
          pointerId: 71,
          pointerType: 'touch',
          shiftKey,
        }),
      )
    }
    const viewport = part(host, 'viewport') as Element
    on(viewport, 'pointerdown')
    on(host, 'pointercancel')
    await host.updateComplete
    expect(host.selected).toBe('a')
    /* With a modifier, since a plain press selects at once for the drag that
       may follow, and a modified one leaves adding to the release. */
    const b = card(host, 'b').shadowRoot?.querySelector('[part="node"]') as Element
    on(b, 'pointerdown', true)
    on(host, 'pointercancel')
    await host.updateComplete
    expect(host.selected).toBe('a')
  })

  test('a card whose place is not a number is placed at nothing, and the board settles', async () => {
    const host = await canvas(
      '',
      '<helix-headless-canvas-node name="a" x="oops" y="0" width="200" height="100">First</helix-headless-canvas-node>',
    )
    for (let turn = 0; turn < 5; turn++) {
      await host.updateComplete
    }
    const at = (host as unknown as { at: { x: number; y: number; zoom: number } }).at
    expect([at.x, at.y, at.zoom].every(Number.isFinite)).toBe(true)
    const saved = (
      host as unknown as { toJsonCanvas(): { nodes: Array<{ x: number }> } }
    ).toJsonCanvas()
    expect(saved.nodes[0]?.x).toBe(0)
  })
})

/**
 * What the board holds, in the order of its tree: each slot by the cards
 * assigned to it, and each layer of connections by the connections in it.
 */
const readingOrder = (host: Canvas): string[] =>
  [...(part(host, 'board')?.children ?? [])].flatMap((child): string[] => {
    if (child instanceof HTMLSlotElement) {
      return child.name.startsWith('card-')
        ? child.assignedElements().map((one) => one.getAttribute('name') ?? '')
        : []
    }
    return [...child.querySelectorAll('[part="edge-target"]')].map(
      (one) => one.getAttribute('data-edge') ?? '',
    )
  })

/* The connections were one layer drawn before every card, so a screen reader
   read every connection and then every card, while the arrows walked each card
   and then the connections leaving it. */
describe('the order a screen reader reads a board in', () => {
  test('is the walk: each card, then the connections leaving it', async () => {
    const host = await canvas()
    expect(readingOrder(host)).toEqual(await walk(host))
  })

  test('follows a card moved past another', async () => {
    const host = await canvas()
    card(host, 'a').y = 500
    await host.updateComplete
    await host.updateComplete
    expect(readingOrder(host)).toEqual(['pair', 'b', 'edge:e2', 'c', 'a', 'edge:e1'])
  })

  test('keeps focus on a connection whose card moves in the walk', async () => {
    const host = await canvas()
    const target = host.shadowRoot?.querySelector<SVGElement>('[data-edge="edge:e1"]')
    target?.focus()
    card(host, 'a').y = 500
    await host.updateComplete
    await host.updateComplete
    expect(host.shadowRoot?.activeElement?.getAttribute('data-edge')).toBe('edge:e1')
  })

  test('assigns the header, the footer and the empty state to their slots', async () => {
    const host = await canvas('', `<p slot="header">Above</p><p slot="footer">Below</p>${BOARD}`)
    const slotted = (name: string): string[] =>
      (
        host.shadowRoot
          ?.querySelector<HTMLSlotElement>(`slot[name="${name}"]`)
          ?.assignedElements() ?? []
      ).map((one) => one.textContent ?? '')
    expect([slotted('header'), slotted('footer')]).toEqual([['Above'], ['Below']])
  })
})
