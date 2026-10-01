import { beforeAll, describe, expect, test } from 'bun:test'
import type { ViewportGestureMode } from '@fusion.dev/helix-core'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'
import type { DrawnLink, DrawnNode, GraphDriver } from './connect-graph.js'
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
  nodes: { id: string; label?: string; x?: number; y?: number }[]
  ready: boolean
  updateComplete: Promise<boolean>
}

/** A driver that records what it was asked, and settles when told to. */
const recording = (withLayout = true) => {
  const asked = {
    centered: [] as string[],
    drawn: [] as { links: DrawnLink[]; nodes: DrawnNode[] }[],
    gestures: [] as ViewportGestureMode[],
    panned: [] as [number, number][],
    stopped: false,
    zoomed: [] as number[],
  }
  let press: ((id: string) => void) | undefined
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
    press: (id: string) => press?.(id),
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
})
