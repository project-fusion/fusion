import type { ViewportGestureMode } from '@fusion.dev/helix-core'
import type { DrawnLink, DrawnNode, GraphDriver } from '../connect-graph/connect-graph.js'
import type { GraphLooks } from '../connect-graph/looks.js'
import type { GraphPoint } from '../connect-graph/seed.js'

/** A graphology graph, as far as the driver calls it. */
export interface SigmaGraph {
  addEdge(source: string, target: string, attributes?: Record<string, unknown>): unknown
  addNode(node: string, attributes?: Record<string, unknown>): unknown
  clear(): void
  forEachNode(callback: (node: string, attributes: Record<string, unknown>) => void): void
  getNodeAttributes(node: string): Record<string, unknown>
  hasEdge(source: string, target: string): boolean
  hasNode(node: string): boolean
  readonly order: number
  setNodeAttribute(node: string, name: string, value: unknown): unknown
}

/** Sigma's camera, as far as the driver calls it. */
export interface SigmaCamera {
  animate(
    state: { ratio?: number; x?: number; y?: number },
    options?: { duration?: number },
  ): unknown
  getState(): { angle: number; ratio: number; x: number; y: number }
  setState(state: { ratio?: number; x?: number; y?: number }): unknown
}

/** A Sigma renderer, as far as the driver calls it. */
export interface SigmaRenderer {
  getCamera(): SigmaCamera
  getContainer(): HTMLElement
  getDimensions(): { height: number; width: number }
  getGraph(): SigmaGraph
  getNodeDisplayData(node: string): { x: number; y: number } | undefined
  off(type: 'clickNode', listener: (payload: { node: string }) => void): unknown
  on(type: 'clickNode', listener: (payload: { node: string }) => void): unknown
  refresh(): unknown
  setSetting(
    name: 'edgeReducer' | 'labelColor' | 'labelFont' | 'nodeReducer',
    value: unknown,
  ): unknown
  viewportToFramedGraph(point: { x: number; y: number }): { x: number; y: number }
}

/** A layout that runs over a graphology graph until it is stopped, as ForceAtlas2's worker does. */
export interface SigmaLayout {
  kill(): void
  start(): void
  stop(): void
}

/** How the Sigma driver behaves where the page does not say. */
export interface SigmaDriverOptions {
  /**
   * Makes a layout for the graph, which the driver runs where notes have no
   * position and stops once they have settled. ForceAtlas2's worker is the
   * one to use:
   *
   * ```js
   * import FA2Layout from 'graphology-layout-forceatlas2/worker'
   * import forceAtlas2 from 'graphology-layout-forceatlas2'
   *
   * sigmaDriver(sigma, {
   *   layout: (graph) => new FA2Layout(graph, { settings: forceAtlas2.inferSettings(graph) }),
   * })
   * ```
   *
   * Without one, notes stay where the connector started them.
   */
  layout?: ((graph: SigmaGraph) => SigmaLayout) | undefined
  /** The longest a layout runs, in milliseconds, settled or not. 10 seconds by default, about where 10,000 notes settle. */
  layoutLimit?: number | undefined
}

/** How long a step of the view takes, in milliseconds. */
const STEP = 250

/** How far one zoom step goes. */
const ZOOM = 1.5

/** How often a running layout is asked whether it has settled, in milliseconds. */
const SAMPLE = 250

/**
 * How little the notes may move between two samples, on average and as a
 * share of the graph's extent, for the layout to count as still.
 *
 * **Measured on 1 October 2026, on graphs shaped like a knowledge base**:
 * clusters of notes about one subject, a few hubs in each, and sparse links
 * across. ForceAtlas2 settles a graph into its clusters and then jitters at
 * about 0.002 for as long as it runs, so 0.002 was a line a 2,000-note graph
 * never crossed. At 0.004, held for two samples, 500 notes stop at about 1.5
 * seconds, 2,000 at 5.8 and 10,000 at 9.8, each once its clusters had
 * stopped changing to the eye.
 */
const STILL = 0.004

/** How many samples in a row the notes must hold still for, once they have moved, to count as settled. */
const HELD = 2

/** How long a layout may go without moving anything before it counts as having nothing to do, in milliseconds. */
const IDLE = 2000

/** A note's drawn radius in pixels, from its relative size: a note of size 4 is half again as wide as one of size 1. */
const pixels = (size: number): number => 2 + 2 * Math.sqrt(Math.max(size, 0))

/** Every note's position as the graph holds it now. */
const positionsOf = (graph: SigmaGraph): Map<string, GraphPoint> => {
  const positions = new Map<string, GraphPoint>()
  graph.forEachNode((node, attributes) => {
    positions.set(node, { x: Number(attributes.x), y: Number(attributes.y) })
  })
  return positions
}

/**
 * Drives Sigma.js for a Graph frame. Make the renderer with an empty
 * graphology graph and pass it here, and `connectGraph` fills it:
 *
 * ```js
 * const sigma = new Sigma(new Graph(), container)
 * connectGraph(frame, sigmaDriver(sigma, { layout }))
 * ```
 *
 * **Neither Sigma nor graphology is a dependency.** The driver types the
 * renderer by the calls it makes on it, so a page brings whichever version it
 * has, and a spec holds those shapes to the real classes.
 */
export const sigmaDriver = (
  sigma: SigmaRenderer,
  options: SigmaDriverOptions = {},
): GraphDriver => {
  const graph = sigma.getGraph()
  const container = sigma.getContainer()
  const camera = sigma.getCamera()
  let mode: ViewportGestureMode = 'free'
  const touchAction = container.style.touchAction

  /* **Held back from Sigma rather than switched off in it.** Sigma's own
     switches turn the camera's zoom and pan off for code as well, so the
     frame's buttons stopped working with them. A listener on the container
     in the capture phase runs before Sigma's, and keeps from it what the
     page has: the plain wheel and one finger while cooperative, and every
     gesture while a waiting map is off. */
  const hold = (event: Event): void => {
    if (mode === 'free') {
      return
    }
    if (mode === 'off') {
      event.stopImmediatePropagation()
      return
    }
    if (event instanceof WheelEvent) {
      if (!(event.ctrlKey || event.metaKey)) {
        event.stopImmediatePropagation()
      }
      return
    }
    if (typeof TouchEvent !== 'undefined' && event instanceof TouchEvent) {
      if (event.touches.length < 2) {
        event.stopImmediatePropagation()
      } else if (event.type === 'touchstart' && event.cancelable) {
        /* Two fingers are the graph's, so the page stops scrolling. */
        event.preventDefault()
      }
    }
  }
  const held = ['wheel', 'touchstart', 'touchmove', 'mousedown'] as const
  for (const type of held) {
    container.addEventListener(type, hold, { capture: true, passive: false })
  }

  return {
    center: (id, animate) => {
      const at = sigma.getNodeDisplayData(id)
      if (!at) {
        return
      }
      if (animate) {
        camera.animate({ x: at.x, y: at.y }, { duration: STEP * 2 })
      } else {
        camera.setState({ x: at.x, y: at.y })
      }
    },
    draw: ({ links, nodes }: { links: DrawnLink[]; nodes: DrawnNode[] }) => {
      graph.clear()
      for (const node of nodes) {
        graph.addNode(node.id, {
          label: node.label,
          size: pixels(node.size),
          x: node.x,
          y: node.y,
        })
      }
      for (const link of links) {
        if (!graph.hasEdge(link.source, link.target)) {
          graph.addEdge(link.source, link.target, {
            from: link.source,
            label: link.label,
            size: 1,
            to: link.target,
          })
        }
      }
    },
    gestures: (next) => {
      mode = next
      /* One finger scrolls the page past a graph that shares its gestures, and
         every finger does past one that is off. */
      container.style.touchAction =
        next === 'free' ? touchAction : next === 'cooperative' ? 'pan-x pan-y' : 'auto'
    },
    look: (looks: GraphLooks) => {
      sigma.setSetting('labelColor', { color: looks.ink })
      sigma.setSetting('labelFont', looks.font)
      sigma.setSetting('nodeReducer', (node: string, data: Record<string, unknown>) => {
        const look = looks.node(node)
        return {
          ...data,
          color: look.color,
          forceLabel: look.label,
          hidden: look.hidden,
          /* The selected note half again its size, so it reads as the one. */
          size: look.selected && typeof data.size === 'number' ? data.size * 1.5 : data.size,
          zIndex: look.selected ? 2 : look.raised ? 1 : 0,
        }
      })
      /* Sigma hands an edge reducer the edge's key and attributes and not its
         ends, so `draw` writes the ends onto it as `from` and `to`. */
      sigma.setSetting('edgeReducer', (_edge: string, data: Record<string, unknown>) => {
        const look = looks.link(String(data.from), String(data.to))
        return {
          ...data,
          color: look.color,
          hidden: look.hidden,
          size: look.raised ? 1.5 : 1,
          zIndex: look.raised ? 1 : 0,
        }
      })
      sigma.refresh()
    },
    onPress: (press) => {
      const listener = ({ node }: { node: string }): void => press(node)
      sigma.on('clickNode', listener)
      return () => {
        sigma.off('clickNode', listener)
      }
    },
    panBy: (x, y, animate) => {
      const { height, width } = sigma.getDimensions()
      const to = sigma.viewportToFramedGraph({ x: width / 2 + x, y: height / 2 + y })
      if (animate) {
        camera.animate(to, { duration: STEP })
      } else {
        camera.setState(to)
      }
    },
    zoomBy: (direction, animate) => {
      const ratio = camera.getState().ratio * (direction > 0 ? 1 / ZOOM : ZOOM)
      if (animate) {
        camera.animate({ ratio }, { duration: STEP })
      } else {
        camera.setState({ ratio })
      }
    },
    ...(options.layout
      ? {
          settle: (unplaced, placed) => {
            const make = options.layout as (graph: SigmaGraph) => SigmaLayout
            /* The notes that have a place keep it: ForceAtlas2 leaves a note
               marked `fixed` where it is. */
            graph.forEachNode((node) => {
              graph.setNodeAttribute(node, 'fixed', !unplaced.has(node))
            })
            const layout = make(graph)
            layout.start()
            const limit = options.layoutLimit ?? 10000
            const started = performance.now()
            let last = positionsOf(graph)
            let done = false
            /* **Settled is still after moving, never still before it.** The
               worker posts its first positions a while after it starts, and
               a layout read as settled in that gap stopped before it ran. */
            let moving = false
            let held = 0
            const finish = (): void => {
              if (done) {
                return
              }
              done = true
              clearInterval(timer)
              layout.stop()
              layout.kill()
              graph.forEachNode((node) => {
                graph.setNodeAttribute(node, 'fixed', false)
              })
              placed(positionsOf(graph))
            }
            const timer = setInterval(() => {
              const now = positionsOf(graph)
              let moved = 0
              let low = Number.POSITIVE_INFINITY
              let high = Number.NEGATIVE_INFINITY
              for (const [id, at] of now) {
                const was = last.get(id)
                if (was) {
                  moved += Math.hypot(at.x - was.x, at.y - was.y)
                }
                low = Math.min(low, at.x, at.y)
                high = Math.max(high, at.x, at.y)
              }
              last = now
              const extent = Math.max(high - low, 1)
              if (moved / Math.max(now.size, 1) / extent >= STILL) {
                moving = true
                held = 0
              } else if (moving) {
                held += 1
              }
              const elapsed = performance.now() - started
              if ((moving && held >= HELD) || (!moving && elapsed > IDLE) || elapsed > limit) {
                finish()
              }
            }, SAMPLE)
            return () => {
              if (done) {
                return
              }
              done = true
              clearInterval(timer)
              layout.stop()
              layout.kill()
            }
          },
        }
      : {}),
  }
}
