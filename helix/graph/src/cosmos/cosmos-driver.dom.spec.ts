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
    shapes: new Float32Array() as Float32Array<ArrayBufferLike>,
    sizes: new Float32Array() as Float32Array<ArrayBufferLike>,
    started: false,
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
    render: () => {},
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
    trackPointPositionsByIndices: () => {},
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
