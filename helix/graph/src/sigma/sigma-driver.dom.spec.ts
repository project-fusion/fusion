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

/** A renderer that records what the driver set on it. */
const rendererOf = () => {
  const graph = graphOf()
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
    getSetting: (name) =>
      settings.has(name)
        ? settings.get(name)
        : name === 'nodeProgramClasses'
          ? { circle: 'Circle' }
          : undefined,
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
    graph,
    settings,
    sigma,
  }
}

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
    expect(node('d', { label: 'Delta' })).toMatchObject({
      forceLabel: false,
      label: null,
      strong: false,
    })
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

  test('names only the selected note and its neighbors by default, and the hubs or every note where asked', () => {
    const named = (labels?: 'all' | 'hover' | 'hubs') => {
      const { settings, sigma } = rendererOf()
      sigmaDriver(sigma, labels ? { labels } : {}).look(looks)
      const node = settings.get('nodeReducer') as (
        id: string,
        data: object,
      ) => Record<string, unknown>
      return ['a', 'd', 'e'].map((id) => node(id, { label: id, size: id === 'e' ? 9 : 4 }).label)
    }
    /* `a` is selected; `d` and `e` are notes at rest, `e` a hub. */
    expect(named()).toEqual(['a', null, null])
    expect(named('hubs')).toEqual(['a', null, 'e'])
    expect(named('all')).toEqual(['a', 'd', 'e'])
  })

  test('names each group over its notes on a canvas of its own, unless asked not to', () => {
    const renderer = rendererOf()
    const driver = sigmaDriver(renderer.sigma)
    driver.look(looks)
    driver.groups?.([{ color: 'rgb(0, 0, 255)', faded: false, ids: ['a', 'b'], name: 'Sales' }])
    expect(renderer.container.querySelectorAll('canvas')).toHaveLength(1)
    driver.stop?.()
    expect(renderer.container.querySelectorAll('canvas')).toHaveLength(0)
    const quiet = rendererOf()
    sigmaDriver(quiet.sigma, { groupLabels: false }).groups?.([
      { color: 'rgb(0, 0, 255)', faded: false, ids: ['a', 'b'], name: 'Sales' },
    ])
    expect(quiet.container.querySelectorAll('canvas')).toHaveLength(0)
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
    settings.set('nodeReducer', 'the page’s')
    const driver = sigmaDriver(sigma)
    driver.look(looks)
    driver.gestures?.('off')
    expect(settings.get('enableCameraZooming')).toBe(false)
    expect(settings.get('enableCameraPanning')).toBe(false)
    driver.stop?.()
    expect(settings.get('nodeReducer')).toBe('the page’s')
    expect(settings.get('enableCameraZooming')).toBeUndefined()
    expect(settings.get('nodeProgramClasses')).toEqual({ circle: 'Circle' })
  })

  test('a signal is drawn on a canvas of its own, which stopping takes away', () => {
    const renderer = rendererOf()
    const driver = sigmaDriver(renderer.sigma)
    driver.signal?.('a', 'b', { from: 'rgb(0, 0, 255)', to: 'rgb(255, 0, 0)' }, true)
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
