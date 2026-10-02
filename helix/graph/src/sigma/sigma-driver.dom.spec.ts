import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import type { GraphLooks } from '../connect-graph/looks.js'
import type { SigmaGraph, SigmaLayout, SigmaRenderer } from './sigma-driver.js'

let sigmaDriver: typeof import('./sigma-driver.js').sigmaDriver

beforeAll(async () => {
  registerDom()
  /* Sigma's programs read WebGL's constants as they load, which happy-dom has
     none of. A number for every name is all loading them asks. */
  const constants = new Proxy(function WebGL() {}, {
    get: (target, name) => (name === 'prototype' ? Reflect.get(target, name) : 1),
  })
  Object.assign(globalThis, { WebGL2RenderingContext: constants, WebGLRenderingContext: constants })
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
    dropEdge: (source, target) => {
      edges.delete(`${source}>${target}`)
    },
    dropNode: (node) => {
      nodes.delete(node)
      for (const key of [...edges.keys()]) {
        if (key.startsWith(`${node}>`) || key.endsWith(`>${node}`)) {
          edges.delete(key)
        }
      }
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
    mergeNodeAttributes: (node, attributes) => {
      nodes.set(node, { ...nodes.get(node), ...attributes })
    },
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
    framedGraphToViewport: ({ x, y }) => ({ x: x * 800, y: y * 400 }),
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
    getNodeDisplayData: (node) =>
      node === 'a'
        ? { size: 4, x: 0.2, y: 0.8 }
        : node === 'b'
          ? { size: 4, x: 0.6, y: 0.2 }
          : undefined,
    getSetting: () => ({ circle: 'Circle' }),
    off: (_type, listener) => listeners.delete(listener),
    on: (_type, listener) => listeners.add(listener),
    refresh: () => {},
    resize: () => {},
    scaleSize: (size = 1) => size,
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
  ground: 'rgb(0, 0, 0)',
  ink: 'rgb(1, 2, 3)',
  link: (source) => ({
    color: source === 'a' ? 'rgb(9, 9, 9)' : 'rgb(5, 5, 5)',
    hidden: false,
    raised: source === 'a',
  }),
  node: (id) => ({
    color: id === 'a' ? 'rgb(0, 0, 255)' : 'rgb(7, 7, 7)',
    glow: id === 'a' ? 1 : 0,
    hidden: id === 'c',
    label: id === 'a' ? 'always' : id === 'b' ? 'never' : 'room',
    raised: id === 'a',
    selected: id === 'a',
    shape: id === 'a' ? 'diamond' : undefined,
  }),
  overlay: 'rgb(4, 5, 6)',
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
    expect(graph.nodes.get('a')).toEqual({ label: 'Alpha', size: 7, x: 1, y: 2 })
    expect(graph.nodes.get('b')?.size).toBe(2.95)
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
    expect(node('b', { label: 'Bravo', size: 4 })).toMatchObject({
      label: null,
      size: 4,
      zIndex: 0,
    })
    expect(node('d', { label: 'Delta' })).toMatchObject({ forceLabel: false, label: 'Delta' })
    expect(typeof settings.get('defaultDrawNodeHover')).toBe('function')
    expect(node('c', {}).hidden).toBe(true)
    expect(edge('e', { from: 'a', to: 'b' })).toMatchObject({ color: 'rgb(9, 9, 9)', size: 1.6 })
    expect(settings.get('labelColor')).toEqual({ color: 'rgb(1, 2, 3)' })
    expect(settings.get('labelFont')).toBe('Inter')
  })

  test('draws every note with its own program, in its shape and the driver’s material', () => {
    const { settings, sigma } = rendererOf()
    const driver = sigmaDriver(sigma, { emphasis: 'subtle', material: 'glass' })
    expect(Object.keys(settings.get('nodeProgramClasses') as object).sort()).toEqual([
      'circle',
      'helix',
    ])
    driver.look(looks)
    const node = settings.get('nodeReducer') as (
      id: string,
      data: object,
    ) => Record<string, unknown>
    expect(node('a', {})).toMatchObject({
      emphasisCode: 2,
      glow: 1,
      materialCode: 1,
      shapeCode: 2,
      type: 'helix',
    })
    expect(node('d', {})).toMatchObject({ glow: 0, shapeCode: 0 })
    driver.stop?.()
    expect(Object.keys(settings.get('nodeProgramClasses') as object)).toEqual(['circle'])
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

  test('stopping lets every gesture through again and puts the touch action back', () => {
    const renderer = rendererOf()
    renderer.container.style.touchAction = 'none'
    const reached: string[] = []
    renderer.container.addEventListener('mousedown', () => reached.push('mousedown'))
    const driver = sigmaDriver(renderer.sigma)
    driver.gestures?.('off')
    driver.stop?.()
    renderer.container.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(reached).toEqual(['mousedown'])
    expect(renderer.container.style.touchAction).toBe('none')
  })

  test('applies only what changed, and leaves every other note where it is', () => {
    const { graph, sigma } = rendererOf()
    const driver = sigmaDriver(sigma)
    driver.draw({
      links: [{ source: 'a', target: 'b' }],
      nodes: [
        { id: 'a', label: 'Alpha', size: 1, x: 0, y: 0 },
        { id: 'b', label: 'Bravo', size: 1, x: 1, y: 1 },
        { id: 'c', label: 'Charlie', size: 1, x: 2, y: 2 },
      ],
    })
    driver.update?.(
      {
        addLinks: [{ source: 'a', target: 'd' }],
        addNodes: [{ id: 'd', label: 'Delta', size: 1, x: 3, y: 3 }],
        changeNodes: [{ id: 'b', label: 'Bravo two', size: 4, x: 1, y: 1 }],
        removeLinks: [{ source: 'a', target: 'b' }],
        removeNodes: ['c'],
      },
      false,
    )
    expect([...graph.nodes.keys()].sort()).toEqual(['a', 'b', 'd'])
    expect(graph.nodes.get('b')).toMatchObject({ label: 'Bravo two', size: 7 })
    expect(graph.nodes.get('d')).toMatchObject({ size: 2.95, x: 3, y: 3 })
    expect([...graph.edges.keys()]).toEqual(['a>d'])
  })

  test('a signal is drawn on a canvas of its own, which stopping takes away', () => {
    const renderer = rendererOf()
    const driver = sigmaDriver(renderer.sigma)
    driver.signal?.('a', 'b', 'rgb(0, 0, 255)', true)
    const overlay = renderer.container.querySelector('canvas')
    expect(overlay).not.toBeNull()
    expect(overlay?.getAttribute('aria-hidden')).toBe('true')
    expect(overlay?.style.pointerEvents).toBe('none')
    driver.stop?.()
    expect(renderer.container.querySelector('canvas')).toBeNull()
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
