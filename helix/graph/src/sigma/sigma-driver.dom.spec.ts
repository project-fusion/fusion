import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import type { GraphLooks } from '../connect-graph/looks.js'
import type { SigmaGraph, SigmaLayout, SigmaRenderer } from './sigma-driver.js'

let sigmaDriver: typeof import('./sigma-driver.js').sigmaDriver
let namedOf: typeof import('./sigma-driver.js').namedOf
let sigmaOptions: typeof import('./sigma-options.js').sigmaOptions

beforeAll(async () => {
  registerDom()
  /* Sigma's programs read WebGL's constants as they load, which happy-dom has
     none of. A number for every name is all loading them asks. **Only where
     there is no WebGL**: in a browser, the page these specs share with the
     family's examples draws real graphs with the real constants. */
  if (typeof WebGL2RenderingContext === 'undefined') {
    const constants = new Proxy(function WebGL() {}, {
      get: (target, name) => (name === 'prototype' ? Reflect.get(target, name) : 1),
    })
    Object.assign(globalThis, {
      WebGL2RenderingContext: constants,
      WebGLRenderingContext: constants,
    })
  }
  ;({ namedOf, sigmaDriver } = await import('./sigma-driver.js'))
  ;({ sigmaOptions } = await import('./sigma-options.js'))
})

/** A graphology graph's few calls, over two maps. */
const graphOf = (): SigmaGraph & {
  edgeMap: Map<string, Record<string, unknown>>
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
    edgeMap: edges,
    edges: (node) =>
      [...edges.keys()].filter((key) => key.startsWith(`${node}>`) || key.endsWith(`>${node}`)),
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

/** A renderer made with `sigmaOptions()`, which records what the driver set on it. */
const rendererOf = () => {
  const graph = graphOf()
  const options = sigmaOptions()
  const container = document.createElement('div')
  document.body.append(container)
  const settings = new Map<string, unknown>()
  let state = { angle: 0, ratio: 1, x: 0.5, y: 0.5 }
  /* Each event's listeners, by the event's name. */
  const listeners = new Map<string, Set<(payload: { node: string }) => void>>()
  const of = (type: string) => {
    const set = listeners.get(type) ?? new Set()
    listeners.set(type, set)
    return set
  }
  const sigma: SigmaRenderer = {
    framedGraphToViewport: ({ x, y }) => ({ x: x * 800, y: y * 400 }),
    getCamera: () => ({
      animate: (next) => {
        state = { ...state, ...next }
      },
      getState: () => state,
      off: () => {},
      on: () => {},
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
    getPrimitives: () => options.primitives,
    getSetting: (name) => settings.get(name),
    off: (type, listener) => of(type).delete(listener),
    on: (type, listener) => of(type).add(listener),
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
      for (const listener of of('clickNode')) {
        listener({ node })
      }
    },
    clickAway: () => {
      for (const listener of of('clickStage')) {
        listener({ node: '' })
      }
    },
    container,
    /** A link's display data, as the renderer's reducer gives it, from its attributes. */
    edge: (id: string, attributes: Record<string, unknown> = {}) =>
      options.edgeReducer(id, {}, attributes) as Record<string, unknown>,
    /** Sends a renderer event with no payload, as Sigma sends `beforeRender`. */
    emit: (type: string) => {
      for (const listener of of(type)) {
        listener({ node: '' })
      }
    },
    graph,
    /** A note's display data, as the renderer's reducer gives it, from its attributes. */
    node: (id: string, attributes: Record<string, unknown> = {}) =>
      options.nodeReducer(id, {}, attributes) as Record<string, unknown>,
    settings,
    sigma,
  }
}

/** The canvas the group names are drawn on. */
const GROUPS = 'canvas[data-helix-graph-layer="groups"]'

const looks: GraphLooks = {
  colorOf: (id) => (id === 'a' ? 'rgb(0, 0, 255)' : 'rgb(7, 7, 7)'),
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
  quiet: 'rgb(9, 9, 9)',
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
    expect(graph.edgeMap.get('a>b')).toMatchObject({ from: 'a', to: 'b' })
  })

  test('draws each note and link as the looks say', () => {
    const { edge, node, sigma } = rendererOf()
    sigmaDriver(sigma).look(looks)
    /* `a` is selected, half again its size, and a diamond, drawn larger by its lost reach. */
    expect(node('a', { size: 4 }).size).toBeCloseTo(6 * (0.86 / Math.SQRT1_2))
    expect(node('a', { size: 4 })).toMatchObject({
      backdropShadowColor: 'rgba(0, 0, 255, 0.6)',
      backdropVisibility: 'visible',
      color: 'rgb(0, 0, 255)',
      visibility: 'visible',
      zIndex: 2,
    })
    expect(node('b', { size: 4 })).toMatchObject({
      backdropVisibility: 'hidden',
      size: 4,
      zIndex: 0,
    })
    expect(node('c').visibility).toBe('hidden')
    /* A strong link is drawn as wide as its glow, and headed. */
    expect(edge('e', { from: 'a', to: 'b' })).toMatchObject({
      color: 'rgb(9, 9, 9)',
      glow: 1,
      head: 'arrow',
      size: 2.6 * 5,
    })
    expect(edge('e', { from: 'b', to: 'a' })).toMatchObject({ glow: 0, head: 'none', size: 1.6 })
  })

  test('refuses a renderer made without sigmaOptions(), which cannot draw Helix’s notes', () => {
    const { sigma } = rendererOf()
    expect(() => sigmaDriver({ ...sigma, getPrimitives: () => ({ nodes: {} }) })).toThrow(
      'sigmaOptions()',
    )
  })

  test('names and rings the note the keys are on, and lights its links', () => {
    const { edge, graph, node, sigma } = rendererOf()
    const keyed: GraphLooks = {
      ...looks,
      keyed: 'd',
      node: (id) => ({ ...looks.node(id), keyed: id === 'd' }),
    }
    sigmaDriver(sigma).look(keyed)
    graph.addNode('d', { label: 'Delta', size: 4 })
    const at = () => ({ radius: 4, x: 10, y: 10 })
    expect(namedOf(graph, keyed, 'hover', undefined, at)).toEqual([
      { id: 'd', must: true, name: 'Delta', strong: true },
    ])
    /* Ringed in the ink, so a reader moving by the keys sees where they are. */
    expect(node('d', { size: 4 })).toMatchObject({
      backdropBorderColor: 'rgb(1, 2, 3)',
      backdropVisibility: 'visible',
    })
    expect(edge('e', { from: 'b', to: 'd' })).toMatchObject({
      color: 'rgb(7, 7, 7)',
      glow: 1,
      head: 'arrow',
    })
  })

  test('draws every note in its shape, its emphasis and the driver’s material', () => {
    const { node, sigma } = rendererOf()
    const driver = sigmaDriver(sigma, { emphasis: 'subtle', material: 'glass' })
    driver.look(looks)
    expect(node('a')).toMatchObject({ emphasisCode: 2, materialCode: 1, shape: 'helixDiamond' })
    expect(node('d')).toMatchObject({ backdropVisibility: 'hidden', shape: 'helixCircle' })
    driver.stop?.()
    /* Stopped, the renderer draws as Sigma would, through no reducer of the driver’s. */
    expect(node('a')).toEqual({})
  })

  test('draws a ring outlined, a mark with its band and light, and either way in its color', () => {
    const { node, sigma } = rendererOf()
    sigmaDriver(sigma, { material: 'mark', shape: 'ring' }).look(looks)
    expect(node('d', { size: 4 })).toMatchObject({
      backdropColor: 'rgba(7, 7, 7, 0.22)',
      backdropVisibility: 'visible',
      emphasisCode: 1,
      materialCode: 3,
      shape: 'helixCircle',
    })
  })

  test('names only the selected note and its neighbors by default, and the hubs or every note where asked', () => {
    const named = (labels: 'all' | 'hover' | 'hubs') => {
      const graph = graphOf()
      graph.addNode('a', { label: 'a', size: 4 })
      graph.addNode('d', { label: 'd', size: 4 })
      graph.addNode('e', { label: 'e', size: 9 })
      /* Far enough apart that each has a cell of its own. */
      const at = (id: string) => ({ radius: 4, x: { a: 0, d: 300, e: 600 }[id] ?? 0, y: 0 })
      return namedOf(graph, looks, labels, undefined, at).map(({ id }) => id)
    }
    /* `a` is selected; `d` and `e` are notes at rest, `e` a hub. */
    expect(named('hover')).toEqual(['a'])
    expect(named('hubs')).toEqual(['a', 'e'])
    expect(named('all')).toEqual(['a', 'e', 'd'])
  })

  test('keeps one name a cell, the larger note’s, but never leaves out one that must be named', () => {
    const graph = graphOf()
    graph.addNode('a', { label: 'a', size: 2 })
    graph.addNode('d', { label: 'd', size: 4 })
    graph.addNode('e', { label: 'e', size: 9 })
    /* All three in one cell: `a` must be named, and of the rest the hub is kept. */
    const at = () => ({ radius: 4, x: 10, y: 10 })
    expect(namedOf(graph, looks, 'all', undefined, at).map(({ id }) => id)).toEqual(['a', 'e'])
  })

  test('names each group over its notes on a canvas of its own, unless asked not to', () => {
    const renderer = rendererOf()
    const driver = sigmaDriver(renderer.sigma)
    driver.look(looks)
    driver.groups?.([{ color: 'rgb(0, 0, 255)', faded: false, ids: ['a', 'b'], name: 'Sales' }])
    expect(renderer.container.querySelectorAll(GROUPS)).toHaveLength(1)
    driver.stop?.()
    /* Every canvas the driver drew on goes with it, the notes' names among them. */
    expect(renderer.container.querySelectorAll('canvas')).toHaveLength(0)
    const quiet = rendererOf()
    sigmaDriver(quiet.sigma, { groupLabels: false }).groups?.([
      { color: 'rgb(0, 0, 255)', faded: false, ids: ['a', 'b'], name: 'Sales' },
    ])
    expect(quiet.container.querySelectorAll(GROUPS)).toHaveLength(0)
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

  test('says which note was pressed, and a press on no note, until told to stop', () => {
    const renderer = rendererOf()
    const pressed: (string | undefined)[] = []
    const stop = sigmaDriver(renderer.sigma).onPress?.((id) => pressed.push(id))
    renderer.click('a')
    renderer.clickAway()
    stop?.()
    renderer.click('b')
    renderer.clickAway()
    expect(pressed).toEqual(['a', undefined])
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
    expect(renderer.container.getAttribute('data-helix-graph-gestures')).toBe('cooperative')
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
    expect([...graph.edgeMap.keys()]).toEqual(['a>d'])
  })

  test('a whole drawing frames the graph afresh, wherever the reader had zoomed', () => {
    const renderer = rendererOf()
    const driver = sigmaDriver(renderer.sigma)
    driver.zoomBy(1, false)
    expect(renderer.camera().ratio).not.toBe(1)
    driver.draw({ links: [], nodes: [{ id: 'a', label: 'Alpha', size: 1, x: 0, y: 0 }] })
    expect(renderer.camera()).toMatchObject({ ratio: 1, x: 0.5, y: 0.5 })
  })

  test('glides a moved note to its place where the change is animated', async () => {
    /* happy-dom runs a frame's callback once and no more, so frames come on a timer here. */
    const frame = globalThis.requestAnimationFrame
    globalThis.requestAnimationFrame = (callback) =>
      setTimeout(() => callback(performance.now()), 16) as unknown as number
    const { graph, sigma } = rendererOf()
    const driver = sigmaDriver(sigma)
    driver.draw({ links: [], nodes: [{ id: 'a', label: 'Alpha', size: 1, x: 0, y: 0 }] })
    driver.update?.(
      {
        addLinks: [],
        addNodes: [],
        changeNodes: [{ id: 'a', label: 'Alpha', size: 1, x: 10, y: 0 }],
        removeLinks: [],
        removeNodes: [],
      },
      true,
    )
    /* Where it was, until the glide's first frame moves it. */
    expect(graph.nodes.get('a')).toMatchObject({ x: 0 })
    await new Promise((done) => setTimeout(done, 400))
    globalThis.requestAnimationFrame = frame
    expect(graph.nodes.get('a')).toMatchObject({ x: 10 })
  })

  test('off turns the camera’s own gestures off, and stopping puts every setting back', () => {
    const { settings, sigma } = rendererOf()
    settings.set('enableCameraZooming', true)
    settings.set('enableCameraPanning', true)
    const driver = sigmaDriver(sigma)
    driver.look(looks)
    driver.gestures?.('off')
    expect(settings.get('enableCameraZooming')).toBe(false)
    expect(settings.get('enableCameraPanning')).toBe(false)
    driver.stop?.()
    expect(settings.get('enableCameraZooming')).toBe(true)
    expect(settings.get('enableCameraPanning')).toBe(true)
  })

  test('a signal is drawn on a canvas of its own, which stopping takes away', () => {
    const renderer = rendererOf()
    const driver = sigmaDriver(renderer.sigma)
    driver.signal?.('a', 'b', { from: 'rgb(0, 0, 255)', to: 'rgb(255, 0, 0)' }, true)
    const overlay = renderer.container.querySelector<HTMLCanvasElement>(
      'canvas[data-helix-graph-layer="signals"]',
    )
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

  test('pauses the layout while its box is off the page, and takes it up again when it is back', async () => {
    const renderer = rendererOf()
    const asked: string[] = []
    const layout = (): SigmaLayout => ({
      kill: () => asked.push('kill'),
      start: () => asked.push('start'),
      stop: () => asked.push('stop'),
    })
    const driver = sigmaDriver(renderer.sigma, { layout })
    driver.draw({ links: [], nodes: [{ id: 'a', label: 'a', size: 1, x: 0, y: 0 }] })
    const stop = driver.settle?.(new Set(['a']), () => {})
    renderer.container.remove()
    await new Promise((done) => setTimeout(done, 300))
    expect(asked).toEqual(['start', 'stop'])
    document.body.append(renderer.container)
    await new Promise((done) => setTimeout(done, 300))
    expect(asked).toEqual(['start', 'stop', 'start'])
    stop?.()
  })
})
