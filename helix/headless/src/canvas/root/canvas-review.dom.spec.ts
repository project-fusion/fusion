import { beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

/**
 * What a review of Canvas found, each held here by what it does.
 */
beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Canvas = HTMLElement & {
  toJsonCanvas(): { edges: Array<Record<string, unknown>> }
  updateComplete: Promise<boolean>
  view: { x: number; y: number; zoom: number }
}

const BOARD = `
  <helix-headless-canvas-node name="a" x="0" y="0" width="200" height="100">First</helix-headless-canvas-node>
  <helix-headless-canvas-node name="b" x="260" y="0" width="200" height="100">Second</helix-headless-canvas-node>
  <helix-headless-canvas-node name="c" x="130" y="300" width="200" height="100">Third</helix-headless-canvas-node>
  <helix-headless-canvas-edge name="e1" from="a" to="b"></helix-headless-canvas-edge>
`

const canvas = async (): Promise<Canvas> => {
  const host = (await mount(
    `<helix-headless-canvas label="A board">${BOARD}</helix-headless-canvas>`,
  )) as Canvas
  await host.updateComplete
  return host
}

const keyOn = (target: Element | null | undefined, key: string, init: KeyboardEventInit = {}) => {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    composed: true,
    key,
    ...init,
  })
  target?.dispatchEvent(event)
  return event
}

const nodeOf = (host: Canvas, name: string): Element | null | undefined =>
  host.querySelector(`[name="${name}"]`)?.shadowRoot?.querySelector('[part="node"]')

const target = (host: Canvas): Element | null | undefined =>
  host.shadowRoot?.querySelector('[part="edge-target"]')

describe('a connection moved from the keyboard', () => {
  /* C lifts the connection, and lifting it took away the element with focus:
     the reader landed on the page with no card holding the tab stop. */
  test('keeps its target, and the tab stop, while it is moved', async () => {
    const host = await canvas()
    const line = target(host) as HTMLElement | null
    line?.focus()
    await host.updateComplete
    keyOn(line, 'c')
    await host.updateComplete
    expect(line?.isConnected).toBe(true)
    expect(target(host)?.getAttribute('tabindex')).toBe('0')
    expect(host.shadowRoot?.querySelector('[part="edge"]')).toBeNull()
  })

  test('is said when it arrives, as a new connection is', async () => {
    const host = await canvas()
    keyOn(target(host), 'c')
    await host.updateComplete
    keyOn(nodeOf(host, 'c'), 'Enter')
    await host.updateComplete
    expect(part(host, 'live')?.textContent).toBe('Asked to connect First to Third.')
  })
})

describe('keys that belong to someone else', () => {
  test('Command with C on a card is Copy, and starts no connection', async () => {
    const host = await canvas()
    const copy = keyOn(nodeOf(host, 'a'), 'c', { metaKey: true })
    await host.updateComplete
    expect(copy.defaultPrevented).toBe(false)
    expect(hasState(host, 'connecting')).toBe(false)
  })

  test('Delete while connecting takes nothing away', async () => {
    const host = await canvas()
    const asked: unknown[] = []
    host.addEventListener('helix-remove', (event) => asked.push(event))
    keyOn(nodeOf(host, 'a'), 'c')
    await host.updateComplete
    keyOn(nodeOf(host, 'a'), 'Delete')
    expect(asked).toEqual([])
  })
})

describe('a board saved', () => {
  /* The board reads each connection with the sides it worked out, and saved
     them all, so a board loaded again had every connection pinned. */
  test('keeps a connection with no sides free of them', async () => {
    const host = await canvas()
    const [edge] = host.toJsonCanvas().edges
    expect(edge?.fromSide).toBeUndefined()
    expect(edge?.toSide).toBeUndefined()
  })
})

describe('a view written before the board has drawn', () => {
  test('is the view it shows once it has', async () => {
    const host = document.createElement('helix-headless-canvas') as unknown as Canvas
    host.setAttribute('label', 'A board')
    host.innerHTML = BOARD
    host.view = { x: 600, y: 450, zoom: 1 }
    document.body.append(host)
    await host.updateComplete
    await host.updateComplete
    /* Past the frame a browser settles the board's size in, which the board
       hears from its resize observer and keeps the middle through. */
    for (let frame = 0; frame < 2; frame += 1) {
      await new Promise((done) => requestAnimationFrame(done))
    }
    expect(host.view).toEqual({ x: 600, y: 450, zoom: 1 })
    host.remove()
  })

  test('is only ever numbers', async () => {
    const host = await canvas()
    host.view = { x: 0, y: 0, zoom: Number.NaN }
    expect(Number.isFinite(host.view.zoom)).toBe(true)
  })
})
