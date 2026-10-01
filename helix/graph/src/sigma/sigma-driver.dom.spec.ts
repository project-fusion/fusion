import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import type { GraphLooks } from '../connect-graph/looks.js'
import type { SigmaGraph, SigmaLayout, SigmaRenderer } from './sigma-driver.js'

let sigmaDriver: typeof import('./sigma-driver.js').sigmaDriver

beforeAll(async () => {
  registerDom()
  ;({ sigmaDriver } = await import('./sigma-driver.js'))
})

/** A graphology graph's few calls, over two maps. */
const graphOf = (): SigmaGraph & {
  edges: Map<string, Record<string, unknown>>
  nodes: Map<string, Record<string, unknown>>
} => {
  const nodes = new Map<string, Record<string, unknown>>()
  const edges = new Map<string, Record<string, unknown>>()
  return {
    addEdge: (source, target, attributes = {}) => edges.set(`${source}>${target}`, attributes),
    addNode: (node, attributes = {}) => nodes.set(node, { ...attributes }),
    clear: () => {
      nodes.clear()
      edges.clear()
    },
    edges,
    forEachNode: (callback) => {
      for (const [node, attributes] of nodes) {
        callback(node, attributes)
      }
    },
    getNodeAttributes: (node) => nodes.get(node) ?? {},
    hasEdge: (source, target) => edges.has(`${source}>${target}`),
    hasNode: (node) => nodes.has(node),
    nodes,
    get order() {
      return nodes.size
    },
    setNodeAttribute: (node, name, value) => {
      const attributes = nodes.get(node)
      if (attributes) {
        attributes[name] = value
      }
    },
  }
}

/** A renderer that records what the driver set on it. */
const rendererOf = () => {
  const graph = graphOf()
  const container = document.createElement('div')
  document.body.append(container)
  const settings = new Map<string, unknown>()
  let state = { angle: 0, ratio: 1, x: 0.5, y: 0.5 }
  const listeners = new Set<(payload: { node: string }) => void>()
  const sigma: SigmaRenderer = {
    getCamera: () => ({
      animate: (next) => {
        state = { ...state, ...next }
      },
      getState: () => state,
      setState: (next) => {
        state = { ...state, ...next }
      },
    }),
    getContainer: () => container,
    getDimensions: () => ({ height: 400, width: 800 }),
    getGraph: () => graph,
    getNodeDisplayData: (node) => (node === 'a' ? { x: 0.2, y: 0.8 } : undefined),
    off: (_type, listener) => listeners.delete(listener),
    on: (_type, listener) => listeners.add(listener),
    refresh: () => {},
    setSetting: (name, value) => settings.set(name, value),
    /* A framed graph one unit across the 800 pixels. */
    viewportToFramedGraph: ({ x, y }) => ({ x: x / 800, y: y / 400 }),
  }
  return {
    camera: () => state,
    click: (node: string) => {
      for (const listener of listeners) {
        listener({ node })
      }
    },
    container,
    graph,
    settings,
    sigma,
  }
}

const looks: GraphLooks = {
  font: 'Inter',
  ink: 'rgb(1, 2, 3)',
  link: (source) => ({
    color: source === 'a' ? 'rgb(9, 9, 9)' : 'rgb(5, 5, 5)',
    hidden: false,
    raised: source === 'a',
  }),
  node: (id) => ({
    color: id === 'a' ? 'rgb(0, 0, 255)' : 'rgb(7, 7, 7)',
    hidden: id === 'c',
    label: id === 'a',
    raised: id === 'a',
    selected: id === 'a',
  }),
}

describe('sigmaDriver', () => {
  test('draws the notes and links into the renderer’s graph, sized by their weight', () => {
    const { graph, sigma } = rendererOf()
    sigmaDriver(sigma).draw({
      links: [{ source: 'a', target: 'b' }],
      nodes: [
        { id: 'a', label: 'Alpha', size: 4, x: 1, y: 2 },
        { id: 'b', label: 'Bravo', size: 1, x: 3, y: 4 },
      ],
    })
    expect(graph.nodes.get('a')).toEqual({ label: 'Alpha', size: 6, x: 1, y: 2 })
    expect(graph.nodes.get('b')?.size).toBe(4)
    expect(graph.edges.get('a>b')).toMatchObject({ from: 'a', to: 'b' })
  })

  test('draws each note and link as the looks say', () => {
    const { settings, sigma } = rendererOf()
    sigmaDriver(sigma).look(looks)
    const node = settings.get('nodeReducer') as (
      id: string,
      data: object,
    ) => Record<string, unknown>
    const edge = settings.get('edgeReducer') as (
      id: string,
      data: object,
    ) => Record<string, unknown>
    expect(node('a', { size: 4 })).toMatchObject({
      size: 6,
      zIndex: 2,
    })
    expect(node('a', {})).toMatchObject({
      color: 'rgb(0, 0, 255)',
      forceLabel: true,
      hidden: false,
    })
    expect(node('b', { size: 4 })).toMatchObject({ size: 4, zIndex: 0 })
    expect(node('c', {}).hidden).toBe(true)
    expect(edge('e', { from: 'a', to: 'b' })).toMatchObject({ color: 'rgb(9, 9, 9)', size: 1.5 })
    expect(settings.get('labelColor')).toEqual({ color: 'rgb(1, 2, 3)' })
    expect(settings.get('labelFont')).toBe('Inter')
  })

  test('pans by pixels, zooms by a step, and centers a note', () => {
    const renderer = rendererOf()
    const driver = sigmaDriver(renderer.sigma)
    driver.panBy(80, 0, false)
    expect(renderer.camera().x).toBeCloseTo(0.6)
    driver.zoomBy(1, false)
    expect(renderer.camera().ratio).toBeCloseTo(1 / 1.5)
    driver.center?.('a', false)
    expect([renderer.camera().x, renderer.camera().y]).toEqual([0.2, 0.8])
  })

  test('says which note was pressed until told to stop', () => {
    const renderer = rendererOf()
    const pressed: string[] = []
    const stop = sigmaDriver(renderer.sigma).onPress?.((id) => pressed.push(id))
    renderer.click('a')
    stop?.()
    renderer.click('b')
    expect(pressed).toEqual(['a'])
  })

  test('keeps the plain wheel from the renderer while cooperative, and every gesture while off', () => {
    const renderer = rendererOf()
    const reached: string[] = []
    renderer.container.addEventListener('wheel', () => reached.push('wheel'))
    renderer.container.addEventListener('mousedown', () => reached.push('mousedown'))
    const driver = sigmaDriver(renderer.sigma)
    const wheel = (ctrlKey = false): void => {
      const event = new WheelEvent('wheel', { bubbles: true, cancelable: true })
      Object.defineProperty(event, 'ctrlKey', { value: ctrlKey })
      renderer.container.dispatchEvent(event)
    }

    driver.gestures?.('cooperative')
    expect(renderer.container.style.touchAction).toBe('pan-x pan-y')
    wheel()
    wheel(true)
    renderer.container.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(reached).toEqual(['wheel', 'mousedown'])

    driver.gestures?.('off')
    wheel(true)
    renderer.container.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(reached).toEqual(['wheel', 'mousedown'])

    driver.gestures?.('free')
    wheel()
    expect(reached).toEqual(['wheel', 'mousedown', 'wheel'])
  })

  test('runs the layout over the notes without a place and stops once they are still', async () => {
    const renderer = rendererOf()
    let running = false
    let killed = false
    const layout = (graph: SigmaGraph): SigmaLayout => ({
      kill: () => {
        killed = true
      },
      start: () => {
        running = true
        /* One move a moment after starting, then still: what a worker's
           layout settling looks like. */
        setTimeout(() => graph.setNodeAttribute('b', 'x', 10), 300)
      },
      stop: () => {
        running = false
      },
    })
    const driver = sigmaDriver(renderer.sigma, { layout })
    driver.draw({
      links: [],
      nodes: [
        { id: 'a', label: 'a', size: 1, x: 0, y: 0 },
        { id: 'b', label: 'b', size: 1, x: 1, y: 1 },
      ],
    })
    const placed = await new Promise<ReadonlyMap<string, { x: number; y: number }>>((done) => {
      driver.settle?.(new Set(['b']), done)
      expect(renderer.graph.nodes.get('a')?.fixed).toBe(true)
      expect(renderer.graph.nodes.get('b')?.fixed).toBe(false)
    })
    expect(running).toBe(false)
    expect(killed).toBe(true)
    expect(placed.get('b')).toEqual({ x: 10, y: 1 })
    expect(renderer.graph.nodes.get('a')?.fixed).toBe(false)
  })
})
