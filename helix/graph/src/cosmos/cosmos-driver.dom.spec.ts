import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import type { GraphLooks } from '../connect-graph/looks.js'
import type { CosmosGraph } from './cosmos-driver.js'

let cosmosDriver: typeof import('./cosmos-driver.js').cosmosDriver

beforeAll(async () => {
  registerDom()
  ;({ cosmosDriver } = await import('./cosmos-driver.js'))
})

/** A cosmos.gl graph that records what it was given and hands back what it holds. */
const graphOf = () => {
  const held = {
    colors: new Float32Array() as Float32Array<ArrayBufferLike>,
    config: {} as Record<string, unknown>,
    links: new Float32Array() as Float32Array<ArrayBufferLike>,
    pinned: null as number[] | null,
    positions: new Float32Array() as Float32Array<ArrayBufferLike>,
    read: 0,
    ready: true,
    renders: [] as (number | undefined)[],
    shapes: new Float32Array() as Float32Array<ArrayBufferLike>,
    sizes: new Float32Array() as Float32Array<ArrayBufferLike>,
    started: false,
    tracked: [] as number[],
  }
  const graph: CosmosGraph = {
    fitView: () => {},
    fitViewByPointIndices: () => {},
    getPointPositions: () => {
      if (!held.ready) {
        throw new TypeError('Cannot destructure property device')
      }
      held.read += 1
      return [...held.positions]
    },
    getTrackedPointPositionsMap: () => new Map(),
    getZoomLevel: () => 1,
    get isReady() {
      return held.ready
    },
    pause: () => {},
    ready: Promise.resolve(),
    render: (_, transition) => {
      held.renders.push(transition)
    },
    screenToSpacePosition: ([x, y]) => [x, y],
    setClusterPositions: () => {},
    setConfigPartial: (config) => Object.assign(held.config, config),
    setLinkColors: () => {},
    setLinks: (links) => {
      held.links = links
    },
    setLinkWidths: () => {},
    setPinnedPoints: (pinned) => {
      held.pinned = pinned
    },
    setPointClusters: () => {},
    setPointColors: (colors) => {
      held.colors = colors
    },
    setPointPositions: (positions) => {
      held.positions = positions
    },
    setPointShapes: (shapes) => {
      held.shapes = shapes
    },
    setPointSizes: (sizes) => {
      held.sizes = sizes
    },
    setZoomLevel: () => {},
    setZoomTransformByPointPositions: () => {},
    spaceToScreenPosition: ([x, y]) => [x, y],
    spaceToScreenRadius: (radius) => radius,
    start: () => {
      held.started = true
    },
    trackPointPositionsByIndices: (indices) => {
      held.tracked = indices
    },
    zoomToPointByIndex: () => {},
  }
  const box = document.createElement('div')
  document.body.append(box)
  return { box, graph, held }
}

const looks: GraphLooks = {
  colorOf: () => 'rgb(255, 0, 0)',
  font: 'Inter',
  ground: 'rgb(0, 0, 0)',
  ink: 'rgb(255, 255, 255)',
  link: () => ({ color: 'rgb(0, 0, 255)', hidden: false, raised: false }),
  node: (id) => ({
    color: id === 'a' ? 'rgb(255, 0, 0)' : 'rgb(0, 255, 0)',
    glow: id === 'a' ? 1 : 0,
    hidden: false,
    label: id === 'a' ? 'always' : 'room',
    raised: false,
    selected: id === 'a',
    shape: id === 'b' ? 'square' : undefined,
  }),
  overlay: 'rgb(20, 20, 20)',
  quiet: 'rgb(128, 128, 128)',
}

const nodes = [
  { id: 'a', label: 'Alpha', size: 1, x: -1, y: 0 },
  { id: 'b', label: 'Bravo', size: 1, x: 1, y: 0 },
]

describe('cosmosDriver', () => {
  test('puts the notes and links into cosmos.gl’s arrays, by index', () => {
    const { box, graph, held } = graphOf()
    cosmosDriver(graph, box).draw({ links: [{ source: 'a', target: 'b' }], nodes })
    expect([...held.links]).toEqual([0, 1])
    expect(held.positions).toHaveLength(4)
    /* Spread about the middle of the space, the first left and the second right. */
    expect(held.positions[0]).toBeLessThan(2048)
    expect(held.positions[2]).toBeGreaterThan(2048)
  })

  test('lights a hovered note’s links at once, with a hand for the pointer, and forgets it on a new drawing', () => {
    const { box, graph, held } = graphOf()
    const driver = cosmosDriver(graph, box)
    driver.draw({ links: [{ source: 'a', target: 'b' }], nodes })
    driver.look(looks)
    held.renders = []
    ;(held.config.onPointMouseOver as (at: number) => void)(1)
    expect(held.renders).toEqual([0])
    expect(box.style.cursor).toBe('pointer')
    ;(held.config.onPointMouseOut as () => void)()
    expect(box.style.cursor).toBe('')
  })

  test('keeps following a signal’s ends while the notes it follows change', () => {
    const { box, graph, held } = graphOf()
    const driver = cosmosDriver(graph, box)
    driver.draw({ links: [{ source: 'a', target: 'b' }], nodes })
    driver.look(looks)
    driver.signal?.('a', 'b', undefined, true)
    /* Looks with nothing selected, which leave no note followed but the signal's. */
    driver.look({ ...looks, node: (id) => ({ ...looks.node(id), selected: false }) })
    expect([...held.tracked].sort()).toEqual([0, 1])
  })

  test('the zoom buttons make the view the reader’s, so a layout that ends does not fit it', () => {
    const { box, graph, held } = graphOf()
    let fitted = 0
    graph.fitView = () => {
      fitted += 1
    }
    const driver = cosmosDriver(graph, box)
    driver.draw({ links: [], nodes })
    driver.settle?.(new Set(['a']), () => {})
    const before = fitted
    driver.zoomBy?.(1, false)
    ;(held.config.onSimulationEnd as () => void)()
    expect(fitted).toBe(before)
  })

  test('paints each note in its color and shape, and rings the selected one', () => {
    const { box, graph, held } = graphOf()
    const driver = cosmosDriver(graph, box)
    driver.draw({ links: [], nodes })
    driver.look(looks)
    expect([...held.colors.slice(0, 4)]).toEqual([1, 0, 0, 1])
    expect([...held.shapes]).toEqual([0, 1])
    expect(held.config.focusedPointIndex).toBe(0)
  })

  test('keeps every note where the layout has it when one is added', () => {
    const { box, graph, held } = graphOf()
    const driver = cosmosDriver(graph, box)
    driver.draw({ links: [], nodes })
    const before = [...held.positions]
    driver.update?.(
      {
        addLinks: [],
        addNodes: [{ id: 'c', label: 'Charlie', size: 1, x: 0, y: 1 }],
        changeNodes: [],
        removeLinks: [],
        removeNodes: [],
      },
      false,
    )
    expect([...held.positions.slice(0, 4)]).toEqual(before)
    expect(held.positions).toHaveLength(6)
  })

  test('changes the graph while cosmos.gl is still starting, from where the notes were drawn', () => {
    const { box, graph, held } = graphOf()
    held.ready = false
    const driver = cosmosDriver(graph, box)
    driver.draw({ links: [], nodes })
    const before = [...held.positions]
    driver.update?.(
      {
        addLinks: [],
        addNodes: [{ id: 'c', label: 'Charlie', size: 1, x: 0, y: 1 }],
        changeNodes: [],
        removeLinks: [],
        removeNodes: [],
      },
      false,
    )
    expect(held.read).toBe(0)
    expect([...held.positions.slice(0, 4)]).toEqual(before)
    expect(held.positions).toHaveLength(6)
  })

  test('reads nothing from the GPU when notes arrive after a drawing with none', () => {
    const { box, graph, held } = graphOf()
    const driver = cosmosDriver(graph, box)
    driver.draw({ links: [], nodes: [] })
    held.read = 0
    driver.update?.(
      { addLinks: [], addNodes: nodes, changeNodes: [], removeLinks: [], removeNodes: [] },
      false,
    )
    expect(held.read).toBe(0)
    expect(held.positions).toHaveLength(4)
  })

  test('reads nothing from cosmos.gl once stopped, when the page may have destroyed it', () => {
    const { box, graph, held } = graphOf()
    const driver = cosmosDriver(graph, box)
    driver.draw({ links: [], nodes })
    driver.stop?.()
    held.read = 0
    driver.update?.(
      {
        addLinks: [],
        addNodes: [],
        changeNodes: [{ id: 'a', label: 'Alpha', size: 1, x: 3, y: 3 }],
        removeLinks: [],
        removeNodes: [],
      },
      false,
    )
    expect(held.read).toBe(0)
  })

  test('lays out the notes without a place, with the rest pinned, and says where they went', () => {
    const { box, graph, held } = graphOf()
    const driver = cosmosDriver(graph, box)
    driver.draw({ links: [], nodes })
    let placed: ReadonlyMap<string, { x: number; y: number }> | undefined
    driver.settle?.(new Set(['b']), (positions) => {
      placed = positions
    })
    expect(held.started).toBe(true)
    expect(held.pinned).toEqual([0])
    ;(held.config.onSimulationEnd as () => void)()
    expect(held.pinned).toBeNull()
    expect(placed?.get('a')?.x).toBeCloseTo(-1)
  })

  test('names over the drawing on canvases of its own, which stopping takes away', () => {
    const { box, graph } = graphOf()
    const driver = cosmosDriver(graph, box)
    driver.look(looks)
    driver.signal?.('a', 'b', undefined, true)
    expect(box.querySelectorAll('canvas').length).toBeGreaterThan(0)
    driver.stop?.()
    expect(box.querySelectorAll('canvas')).toHaveLength(0)
  })
})
