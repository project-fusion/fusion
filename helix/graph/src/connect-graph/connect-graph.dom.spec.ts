import { beforeAll, describe, expect, test } from 'bun:test'
import type { ViewportGestureMode } from '@fusion.dev/helix-core'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'
import type { DrawnLink, DrawnNode, GraphChanges, GraphDriver } from './connect-graph.js'
import type { GraphPoint } from './seed.js'

/* Imported after the DOM is registered, like the elements: the connector
   reaches `@fusion.dev/helix-core`, which evaluates Lit, and Lit's element
   class extends whatever `HTMLElement` exists when it first loads. */
let connectGraph: typeof import('./connect-graph.js').connectGraph

beforeAll(async () => {
  registerDom()
  await import('@fusion.dev/helix-headless/graph')
  ;({ connectGraph } = await import('./connect-graph.js'))
})

type Frame = HTMLElement & {
  active: string
  gestures?: string
  links: { source: string; target: string }[]
  nodes: { group?: string; id: string; label?: string; x?: number; y?: number }[]
  ready: boolean
  updateComplete: Promise<boolean>
}

/** A driver that records what it was asked, and settles when told to. */
const recording = (withLayout = true, incremental = false) => {
  const asked = {
    centered: [] as string[],
    drawn: [] as { links: DrawnLink[]; nodes: DrawnNode[] }[],
    gestures: [] as ViewportGestureMode[],
    panned: [] as [number, number][],
    signals: [] as [string, string][],
    stopped: false,
    updates: [] as GraphChanges[],
    zoomed: [] as number[],
  }
  let press: ((id: string | undefined) => void) | undefined
  let settle: ((positions: ReadonlyMap<string, GraphPoint>) => void) | undefined
  let unplaced: ReadonlySet<string> = new Set()
  const driver: GraphDriver = {
    center: (id) => asked.centered.push(id),
    draw: (graph) => asked.drawn.push(graph),
    gestures: (mode) => asked.gestures.push(mode),
    look: () => {},
    onPress: (listener) => {
      press = listener
      return () => {
        press = undefined
      }
    },
    panBy: (x, y) => asked.panned.push([x, y]),
    signal: (from, to) => asked.signals.push([from, to]),
    ...(incremental ? { update: (changes: GraphChanges) => asked.updates.push(changes) } : {}),
    stop: () => {
      asked.stopped = true
    },
    zoomBy: (direction) => asked.zoomed.push(direction),
    ...(withLayout
      ? {
          settle: (waiting, placed) => {
            unplaced = waiting
            settle = placed
            return () => {
              settle = undefined
            }
          },
        }
      : {}),
  }
  return {
    asked,
    driver,
    press: (id: string | undefined) => press?.(id),
    settle: (positions: Record<string, GraphPoint>) => settle?.(new Map(Object.entries(positions))),
    unplaced: () => unplaced,
  }
}

const frame = async (extra = ''): Promise<Frame> => {
  const host = (await mount(
    `<helix-headless-graph label="Notes" ${extra}><div></div></helix-headless-graph>`,
  )) as Frame
  host.nodes = [{ id: 'a', label: 'Alpha', x: 0, y: 0 }, { id: 'b', label: 'Bravo' }, { id: 'c' }]
  host.links = [
    { source: 'a', target: 'b' },
    { source: 'b', target: 'missing' },
  ]
  await host.updateComplete
  return host
}

const settled = async (host: Frame): Promise<void> => {
  await host.updateComplete
  await new Promise((done) => setTimeout(done, 20))
}

describe('connectGraph', () => {
  test('draws the frame’s notes, and leaves out a link to a note it does not hold', async () => {
    const host = await frame()
    const { asked, driver } = recording()
    connectGraph(host, driver)
    await settled(host)
    const drawn = asked.drawn.at(-1)
    expect(drawn?.nodes.map((node) => [node.id, node.label])).toEqual([
      ['a', 'Alpha'],
      ['b', 'Bravo'],
      ['c', 'c'],
    ])
    expect(drawn?.links).toEqual([{ label: undefined, source: 'a', target: 'b' }])
  })

  test('lays out only the notes without a place, says where they went, and is ready after', async () => {
    const host = await frame()
    const recorder = recording()
    const told: Record<string, GraphPoint>[] = []
    host.addEventListener('helix-graph-layout', (event) =>
      told.push((event as CustomEvent).detail.positions),
    )
    connectGraph(host, recorder.driver)
    await settled(host)
    expect([...recorder.unplaced()].sort()).toEqual(['b', 'c'])
    expect(host.ready).toBe(false)
    recorder.settle({ a: { x: 0, y: 0 }, b: { x: 5, y: 5 }, c: { x: -5, y: 5 } })
    expect(told).toEqual([{ a: { x: 0, y: 0 }, b: { x: 5, y: 5 }, c: { x: -5, y: 5 } }])
    expect(host.ready).toBe(true)
  })

  test('draws the notes in a stencil’s shape from the first frame, with no layout, and says where they are', async () => {
    const host = await frame()
    host.nodes = [
      { group: 'left', id: 'a' },
      { group: 'left', id: 'b' },
      { group: 'right', id: 'c' },
      { group: 'right', id: 'd' },
    ]
    host.links = [
      { source: 'b', target: 'a' },
      { source: 'd', target: 'c' },
    ]
    const recorder = recording()
    const told: Record<string, GraphPoint>[] = []
    host.addEventListener('helix-graph-layout', (event) =>
      told.push((event as CustomEvent).detail.positions),
    )
    /* A box 10 by 10 whose left half is the shape. */
    connectGraph(host, recorder.driver, {
      stencil: { height: 10, inside: (x) => x < 5, width: 10 },
    })
    await settled(host)
    await new Promise((done) => requestAnimationFrame(done))
    expect(recorder.unplaced().size).toBe(0)
    const drawn = recorder.asked.drawn.at(-1)?.nodes ?? []
    expect(drawn.map((node) => node.id).sort()).toEqual(['a', 'b', 'c', 'd'])
    const placed = told.at(-1) ?? {}
    expect(Object.fromEntries(drawn.map((node) => [node.id, { x: node.x, y: node.y }]))).toEqual(
      placed,
    )
    expect(host.ready).toBe(true)
  })

  test('tells the driver where in its shape the notes are drawn', async () => {
    const host = await frame()
    const places: ('fill' | 'surface' | undefined)[] = []
    const { driver } = recording()
    connectGraph(
      host,
      { ...driver, shape: (place) => places.push(place) },
      { stencil: { height: 10, inside: () => true, place: 'surface', width: 10 } },
    )
    await settled(host)
    expect(places.at(-1)).toBe('surface')
  })

  test('shapes a graph with places of its own as well, so places kept from an earlier drawing come back in the shape', async () => {
    const host = await frame()
    const recorder = recording()
    const places: string[] = []
    connectGraph(
      host,
      { ...recorder.driver, shape: (place) => places.push(place ?? 'fill') },
      { stencil: { height: 10, inside: (x) => x < 5, width: 10 } },
    )
    await settled(host)
    expect([...recorder.unplaced()]).toEqual([])
    expect(places).toEqual(['fill'])
    expect(host.ready).toBe(true)
  })

  test('lays the graph out where the stencil has no inside to hold the notes, and says so', async () => {
    const host = await frame()
    const recorder = recording()
    const warn = console.warn
    const warned: unknown[] = []
    console.warn = (message: unknown) => warned.push(message)
    try {
      connectGraph(host, recorder.driver, {
        stencil: { height: 10, inside: () => false, width: 10 },
      })
      await settled(host)
    } finally {
      console.warn = warn
    }
    expect([...recorder.unplaced()].sort()).toEqual(['a', 'b', 'c'])
    expect(String(warned[0])).toContain('no inside')
  })

  test('keeps where the layout put each note when the page adds one', async () => {
    const host = await frame()
    const recorder = recording()
    connectGraph(host, recorder.driver)
    await settled(host)
    recorder.settle({ a: { x: 0, y: 0 }, b: { x: 5, y: 5 }, c: { x: -5, y: 5 } })
    host.nodes = [...host.nodes, { id: 'd' }]
    await settled(host)
    expect([...recorder.unplaced()]).toEqual(['d'])
    const b = recorder.asked.drawn.at(-1)?.nodes.find((node) => node.id === 'b')
    expect([b?.x, b?.y]).toEqual([5, 5])
  })

  test('is ready on the next frame where every note has a place and nothing needs a layout', async () => {
    const host = await frame()
    host.nodes = [{ id: 'a', x: 0, y: 0 }]
    await host.updateComplete
    connectGraph(host, recording(false).driver)
    await settled(host)
    expect(host.ready).toBe(true)
  })

  test('answers the frame’s pan and zoom', async () => {
    const host = await frame()
    const { asked, driver } = recording()
    connectGraph(host, driver)
    await settled(host)
    ;(part(host, 'zoom-in') as HTMLElement).click()
    ;(part(host, 'region') as HTMLElement).dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, composed: true, key: 'ArrowRight' }),
    )
    expect(asked.zoomed).toEqual([1])
    expect(asked.panned).toHaveLength(1)
  })

  test('a press in the drawing selects the note without moving it, and a choice in the list centers it', async () => {
    const host = await frame()
    const recorder = recording()
    connectGraph(host, recorder.driver)
    await settled(host)
    recorder.press('b')
    await settled(host)
    expect(host.active).toBe('b')
    expect(recorder.asked.centered).toEqual([])
    host.active = 'c'
    await settled(host)
    expect(recorder.asked.centered).toEqual(['c'])
  })

  test('a press on no note lets the selection go', async () => {
    const host = await frame()
    const recorder = recording()
    connectGraph(host, recorder.driver)
    await settled(host)
    recorder.press('b')
    await settled(host)
    expect(host.active).toBe('b')
    recorder.press(undefined)
    await settled(host)
    expect(host.active).toBe('')
  })

  test('a press the page refuses selects nothing', async () => {
    const host = await frame()
    const recorder = recording()
    connectGraph(host, recorder.driver)
    await settled(host)
    host.addEventListener('helix-before-activate', (event) => event.preventDefault())
    recorder.press('b')
    await settled(host)
    expect(host.active).toBe('')
  })

  test('tells the renderer the frame’s gestures, and gives them all back on disconnect', async () => {
    const host = await frame('gestures="activate"')
    const { asked, driver } = recording()
    const connection = connectGraph(host, driver)
    await settled(host)
    expect(asked.gestures.at(-1)).toBe('off')
    host.gestures = 'cooperative'
    await settled(host)
    expect(asked.gestures.at(-1)).toBe('cooperative')
    connection.disconnect()
    expect(asked.gestures.at(-1)).toBe('free')
    expect(asked.stopped).toBe(true)
    expect(host.ready).toBe(false)
  })

  test('a driver that can update is told only what changed, and the frame stays ready', async () => {
    const host = await frame()
    const recorder = recording(true, true)
    connectGraph(host, recorder.driver)
    await settled(host)
    recorder.settle({ a: { x: 0, y: 0 }, b: { x: 5, y: 5 }, c: { x: -5, y: 5 } })
    expect(host.ready).toBe(true)
    let told = 0
    host.addEventListener('helix-graph-ready', () => told++)
    host.nodes = [...host.nodes.filter((node) => node.id !== 'c'), { id: 'd', label: 'Delta' }]
    host.links = [...host.links, { source: 'd', target: 'a' }]
    await settled(host)
    expect(recorder.asked.drawn).toHaveLength(1)
    const changes = recorder.asked.updates.at(-1)
    expect(changes?.addNodes.map((node) => node.id)).toEqual(['d'])
    expect(changes?.removeNodes).toEqual(['c'])
    expect(changes?.addLinks).toEqual([{ label: undefined, source: 'd', target: 'a' }])
    expect([...recorder.unplaced()]).toEqual(['d'])
    expect(host.ready).toBe(true)
    expect(told).toBe(0)
  })

  test('a graph replaced with one that shares no note is drawn whole, to be framed afresh', async () => {
    const host = await frame()
    const recorder = recording(true, true)
    connectGraph(host, recorder.driver)
    await settled(host)
    host.nodes = [{ id: 'x' }, { id: 'y' }]
    host.links = [{ source: 'x', target: 'y' }]
    await settled(host)
    expect(recorder.asked.drawn).toHaveLength(2)
    expect(recorder.asked.drawn.at(-1)?.nodes.map((node) => node.id)).toEqual(['x', 'y'])
    expect(recorder.asked.updates).toHaveLength(0)
  })

  test('a layout cut short by the next change places its notes with the new ones', async () => {
    const host = await frame()
    const recorder = recording(true, true)
    connectGraph(host, recorder.driver)
    await settled(host)
    host.nodes = [...host.nodes, { id: 'd' }]
    await settled(host)
    expect([...recorder.unplaced()].sort()).toEqual(['b', 'c', 'd'])
  })

  test('a signal between two drawn notes reaches the driver, and one to a missing note does not', async () => {
    const host = (await frame()) as Frame & {
      signal(from: string, to: string, options?: { tone?: string }): void
    }
    const recorder = recording()
    connectGraph(host, recorder.driver)
    await settled(host)
    host.signal('a', 'b', { tone: 'success' })
    host.signal('a', 'nowhere')
    expect(recorder.asked.signals).toEqual([['a', 'b']])
  })

  test('a change during the first layout does not cost the frame its ready', async () => {
    const host = await frame()
    const recorder = recording(true, true)
    connectGraph(host, recorder.driver)
    await settled(host)
    host.nodes = [...host.nodes, { id: 'd' }]
    await settled(host)
    expect(host.ready).toBe(false)
    recorder.settle({ a: { x: 0, y: 0 }, b: { x: 5, y: 5 }, c: { x: -5, y: 5 }, d: { x: 1, y: 1 } })
    expect(host.ready).toBe(true)
  })

  test('a selection that arrives with the notes it names is framed once they are drawn', async () => {
    const host = await frame()
    const recorder = recording()
    connectGraph(host, recorder.driver)
    await settled(host)
    host.nodes = [...host.nodes, { id: 'd' }]
    host.active = 'd'
    await settled(host)
    expect(recorder.asked.centered).toEqual(['d'])
  })

  test('relayout lays out every note again, the places the page gave them as well', async () => {
    const host = await frame()
    const recorder = recording()
    const connection = connectGraph(host, recorder.driver)
    await settled(host)
    recorder.settle({ a: { x: 0, y: 0 }, b: { x: 5, y: 5 }, c: { x: -5, y: 5 } })
    connection.relayout()
    expect([...recorder.unplaced()].sort()).toEqual(['a', 'b', 'c'])
  })

  test('a layout that finishes after disconnect is not heard', async () => {
    const host = await frame()
    const recorder = recording()
    const told: unknown[] = []
    host.addEventListener('helix-graph-layout', (event) => told.push(event))
    let finish: ((positions: ReadonlyMap<string, GraphPoint>) => void) | undefined
    const connection = connectGraph(host, {
      ...recorder.driver,
      settle: (_, placed) => {
        finish = placed
        return () => {}
      },
    })
    await settled(host)
    connection.disconnect()
    finish?.(new Map([['a', { x: 0, y: 0 }]]))
    connection.relayout()
    expect(told).toEqual([])
  })

  test('a note without a size is drawn as large as it is connected', async () => {
    const host = await frame()
    const { asked, driver } = recording()
    connectGraph(host, driver)
    await settled(host)
    const sizes = Object.fromEntries(
      (asked.drawn.at(-1)?.nodes ?? []).map((node) => [node.id, node.size]),
    )
    /* `a` and `b` share one link; `c` has none. */
    expect(sizes).toEqual({ a: 2, b: 2, c: 1 })
  })
})
