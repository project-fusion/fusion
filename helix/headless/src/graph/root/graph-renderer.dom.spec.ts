import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, settle } from '@fusion.dev/helix-testing/dom'
import type { GraphLink, GraphNode } from './graph-model.js'

/**
 * The frame's half of the contract with a renderer, held by a renderer that
 * draws nothing.
 *
 * A WebGL renderer is not something a headless browser draws, so the drawing
 * itself cannot be read back. What a renderer does with the frame can be: it
 * hears `helix-graph-part-change`, reads the frame's `active`, `nodes` and
 * `links`, and moves its camera on `helix-graph-pan` and `helix-graph-zoom`.
 * `connectGraph` in `@fusion.dev/helix-graph` answers the same events in the
 * same way, so a scene that follows this stub follows the keys.
 */
interface Scene {
  /** The note the drawing frames and rings, as `connectGraph` restyles on `focus`. */
  framed: string
  /** Where the camera looks, in viewports from where it started. */
  x: number
  y: number
  /** How many steps in the camera has zoomed. */
  zoom: number
  /** Every part change heard, in order. */
  heard: string[]
}

type Graph = HTMLElement & {
  active: string
  links: readonly GraphLink[]
  nodes: readonly GraphNode[]
  updateComplete: Promise<boolean>
}

const nodes: GraphNode[] = [
  { id: 'a', label: 'Alpha' },
  { id: 'b', label: 'Bravo' },
  { id: 'c', label: 'Charlie' },
]
const links: GraphLink[] = [{ source: 'a', target: 'b' }]

let stop: (() => void) | undefined

/** Wires a stub renderer to a frame, and returns what it has drawn so far. */
const stubRenderer = (frame: Graph): Scene => {
  const scene: Scene = { framed: frame.active, heard: [], x: 0, y: 0, zoom: 0 }
  const onPart = (event: Event): void => {
    const { kind } = (event as CustomEvent<{ kind: string }>).detail
    scene.heard.push(kind)
    if (kind === 'data' || kind === 'focus') {
      scene.framed = frame.active
    }
  }
  const onPan = (event: Event): void => {
    const { by, to } = (event as CustomEvent<{ by: number; to: string }>).detail
    scene.x += (to === 'end' ? 1 : to === 'start' ? -1 : 0) * by
    scene.y += (to === 'down' ? 1 : to === 'up' ? -1 : 0) * by
  }
  const onZoom = (event: Event): void => {
    scene.zoom += (event as CustomEvent<{ by: number }>).detail.by
  }
  frame.addEventListener('helix-graph-part-change', onPart)
  frame.addEventListener('helix-graph-pan', onPan)
  frame.addEventListener('helix-graph-zoom', onZoom)
  stop = () => {
    frame.removeEventListener('helix-graph-part-change', onPart)
    frame.removeEventListener('helix-graph-pan', onPan)
    frame.removeEventListener('helix-graph-zoom', onZoom)
  }
  return scene
}

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

afterEach(() => {
  stop?.()
  stop = undefined
})

const graph = async (): Promise<{ host: Graph; scene: Scene }> => {
  const host = (await mount(
    '<helix-headless-graph label="Research notes"><canvas></canvas></helix-headless-graph>',
  )) as Graph
  const scene = stubRenderer(host)
  host.nodes = nodes
  host.links = links
  await settle(host)
  return { host, scene }
}

const key = (target: Element, name: string): void => {
  target.dispatchEvent(
    new KeyboardEvent('keydown', { bubbles: true, cancelable: true, composed: true, key: name }),
  )
}

describe('a renderer following the frame', () => {
  test('frames the note chosen in the list from the keyboard, and only once it is chosen', async () => {
    const { host, scene } = await graph()
    const list = part(host, 'list') as HTMLElement
    key(list, 'ArrowDown')
    key(list, 'ArrowDown')
    await settle(host)
    /* The cursor is the list's: moving it reads notes out without moving the
       drawing under the reader. */
    expect(scene.framed).toBe('')
    key(list, 'Enter')
    await settle(host)
    expect([host.active, scene.framed, scene.heard.at(-1)]).toEqual(['c', 'c', 'focus'])
    key(list, 'Home')
    key(list, 'ArrowDown')
    key(list, ' ')
    await settle(host)
    expect(scene.framed).toBe(host.active)
  })

  test('pans with the arrow keys on the frame and zooms with Plus and Minus', async () => {
    const { host, scene } = await graph()
    const region = part(host, 'region') as HTMLElement
    for (const name of ['ArrowRight', 'ArrowRight', 'ArrowDown', '+', '+', '-']) {
      key(region, name)
    }
    await settle(host)
    expect(scene.x).toBeGreaterThan(0)
    expect(scene.y).toBeGreaterThan(0)
    expect(scene.zoom).toBe(1)
  })

  test('the arrows in the list move the list and not the camera', async () => {
    const { host, scene } = await graph()
    key(part(host, 'list') as HTMLElement, 'ArrowDown')
    key(part(host, 'list') as HTMLElement, 'ArrowRight')
    await settle(host)
    expect([scene.x, scene.y, scene.zoom]).toEqual([0, 0, 0])
  })
})
