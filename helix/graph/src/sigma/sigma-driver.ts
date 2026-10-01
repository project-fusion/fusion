import type { ViewportGestureMode } from '@fusion.dev/helix-core'
import type {
  DrawnLink,
  DrawnNode,
  GraphChanges,
  GraphDriver,
} from '../connect-graph/connect-graph.js'
import type { GraphLooks } from '../connect-graph/looks.js'
import type { GraphPoint } from '../connect-graph/seed.js'

/** A graphology graph, as far as the driver calls it. */
export interface SigmaGraph {
  addEdge(source: string, target: string, attributes?: Record<string, unknown>): unknown
  addNode(node: string, attributes?: Record<string, unknown>): unknown
  clear(): void
  dropEdge(source: string, target: string): void
  dropNode(node: string): void
  forEachNode(callback: (node: string, attributes: Record<string, unknown>) => void): void
  getNodeAttributes(node: string): Record<string, unknown>
  hasEdge(source: string, target: string): boolean
  hasNode(node: string): boolean
  mergeNodeAttributes(node: string, attributes: Record<string, unknown>): unknown
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
  framedGraphToViewport(point: { x: number; y: number }): { x: number; y: number }
  getNodeDisplayData(
    node: string,
  ): { hidden?: boolean; size: number; x: number; y: number } | undefined
  off(type: 'clickNode', listener: (payload: { node: string }) => void): unknown
  on(type: 'clickNode', listener: (payload: { node: string }) => void): unknown
  refresh(): unknown
  resize(force?: boolean): unknown
  scaleSize(size?: number): number
  setSetting(
    name:
      | 'defaultDrawNodeHover'
      | 'edgeReducer'
      | 'labelColor'
      | 'labelFont'
      | 'labelRenderedSizeThreshold'
      | 'nodeReducer',
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

/** What Sigma hands a hover drawing: where the note is drawn, its size and its name. */
interface HoverData {
  label?: string | null | undefined
  size: number
  x: number
  y: number
}

/**
 * The name of the note the pointer is over, on the theme's overlay in the
 * theme's ink.
 *
 * **Sigma's own is a white box**, which in a dark theme held white letters on
 * white. This draws the box the way a tooltip is drawn here: the overlay
 * surface, a soft shadow, a small radius.
 */
const hoverOf =
  (looks: GraphLooks) =>
  (
    context: CanvasRenderingContext2D,
    data: HoverData,
    settings: { labelFont: string; labelSize: number; labelWeight: string },
  ): void => {
    if (!data.label) {
      return
    }
    const size = settings.labelSize
    context.font = `${settings.labelWeight} ${size}px ${settings.labelFont}`
    const width = context.measureText(data.label).width
    const x = data.x + data.size + 2
    const height = size + 8
    context.save()
    context.shadowBlur = 8
    context.shadowColor = 'rgba(0, 0, 0, 0.25)'
    context.fillStyle = looks.overlay
    context.beginPath()
    context.roundRect(x - 4, data.y - height / 2, width + 8, height, 4)
    context.fill()
    context.restore()
    context.fillStyle = looks.ink
    context.fillText(data.label, x, data.y + size / 3)
  }

/** How long a signal takes to cross from one note to the other, in milliseconds. */
const TRAVEL = 700

/** How long the pulse on arrival lasts, in milliseconds. */
const PULSE = 450

/** How long a new note takes to grow to its size, in milliseconds. */
const GROW = 300

/** The most signals in flight at once. A page sending more drops the oldest. */
const FLYING = 400

/** One signal on its way. */
interface Flight {
  animate: boolean
  color: string
  from: string
  started: number
  to: string
}

/** Eases in and out, so a signal leaves and arrives gently. */
const ease = (at: number): number => (at < 0.5 ? 2 * at * at : 1 - (-2 * at + 2) ** 2 / 2)

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

  /* **Its own box, and not only the window.** Sigma measures its container
     when the window resizes, and a frame filling the screen, or settling its
     height, changes the box with the window as it was: the drawing stretched
     to the old size until something else made Sigma look. */
  const sized =
    typeof ResizeObserver === 'function'
      ? new ResizeObserver(() => {
          sigma.resize(true)
          sigma.refresh()
        })
      : undefined
  sized?.observe(container)

  /* **Signals are drawn on a canvas of the driver's own**, over Sigma's, so a
     signal never makes Sigma redraw the graph: ten signals a second over ten
     thousand notes draw ten dots. It draws only while something is in
     flight, and takes no pointer, so a press reaches the note under it. */
  let overlay: HTMLCanvasElement | undefined
  let flights: Flight[] = []
  let flying = 0
  let ink = 'rgb(128, 128, 128)'

  /** Where a note is on screen, and how large, or nothing where it is not drawn. */
  const onScreen = (id: string): { radius: number; x: number; y: number } | undefined => {
    const data = sigma.getNodeDisplayData(id)
    if (!data || data.hidden) {
      return undefined
    }
    const at = sigma.framedGraphToViewport(data)
    return { radius: sigma.scaleSize(data.size), x: at.x, y: at.y }
  }

  const fly = (now: number): void => {
    const context = overlay?.getContext('2d')
    if (!overlay || !context) {
      flights = []
      return
    }
    const ratio = window.devicePixelRatio || 1
    const width = Math.round(container.clientWidth * ratio)
    const height = Math.round(container.clientHeight * ratio)
    if (overlay.width !== width || overlay.height !== height) {
      overlay.width = width
      overlay.height = height
    }
    context.setTransform(ratio, 0, 0, ratio, 0, 0)
    context.clearRect(0, 0, width, height)
    flights = flights.filter((flight) => {
      const from = onScreen(flight.from)
      const to = onScreen(flight.to)
      const gone = (now - flight.started) / TRAVEL
      if (!from || !to || gone >= 1 + PULSE / TRAVEL) {
        return false
      }
      context.save()
      context.strokeStyle = flight.color
      context.fillStyle = flight.color
      if (gone < 1) {
        if (flight.animate) {
          /* A dot crossing, with the path it has come lit faintly behind it. */
          const along = ease(gone)
          const x = from.x + (to.x - from.x) * along
          const y = from.y + (to.y - from.y) * along
          context.globalAlpha = 0.6
          context.lineWidth = 2
          context.beginPath()
          context.moveTo(from.x, from.y)
          context.lineTo(x, y)
          context.stroke()
          context.globalAlpha = 1
          context.shadowBlur = 14
          context.shadowColor = flight.color
          context.beginPath()
          context.arc(x, y, 5, 0, Math.PI * 2)
          context.fill()
          /* A pale core, so a signal reads over a note of its own color. */
          context.shadowBlur = 0
          context.fillStyle = 'rgba(255, 255, 255, 0.85)'
          context.beginPath()
          context.arc(x, y, 2, 0, Math.PI * 2)
          context.fill()
        } else {
          /* For a reader who asked for less motion, the link lit for a moment. */
          context.globalAlpha = 1 - gone
          context.lineWidth = 2
          context.beginPath()
          context.moveTo(from.x, from.y)
          context.lineTo(to.x, to.y)
          context.stroke()
        }
      } else if (flight.animate) {
        /* The arrival: a ring opening out from the note it reached. */
        const opened = (gone - 1) / (PULSE / TRAVEL)
        context.globalAlpha = 1 - opened
        context.lineWidth = 2.5
        context.beginPath()
        context.arc(to.x, to.y, to.radius + 2 + opened * 16, 0, Math.PI * 2)
        context.stroke()
      }
      context.restore()
      return true
    })
    flying = flights.length > 0 ? requestAnimationFrame(fly) : 0
  }

  /** Grows notes from nothing to their size, so a note arriving is seen to arrive. */
  const grow = (sizes: Map<string, number>): void => {
    const started = performance.now()
    const step = (now: number): void => {
      const along = Math.min((now - started) / GROW, 1)
      for (const [id, size] of sizes) {
        if (graph.hasNode(id)) {
          graph.setNodeAttribute(id, 'size', size * ease(along))
        }
      }
      if (along < 1) {
        requestAnimationFrame(step)
      }
    }
    requestAnimationFrame(step)
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
      ink = looks.ink
      sigma.setSetting('labelColor', { color: looks.ink })
      sigma.setSetting('labelFont', looks.font)
      /* **Named wherever there is room, and not only once drawn large.**
         Sigma names a note only from six pixels across, which every note in a
         graph of thousands is under until zoomed: a selected note's
         neighbors went unnamed. Its own grid still keeps names apart, the
         larger note's first. */
      sigma.setSetting('labelRenderedSizeThreshold', 0)
      sigma.setSetting('defaultDrawNodeHover', hoverOf(looks))
      sigma.setSetting('nodeReducer', (node: string, data: Record<string, unknown>) => {
        const look = looks.node(node)
        /* The selected note half again its size, so it reads as the one, and
           its neighbors a quarter, so where two names would collide Sigma,
           which keeps the larger note's, keeps theirs. */
        const grown = look.selected ? 1.5 : look.raised ? 1.25 : 1
        return {
          ...data,
          color: look.color,
          forceLabel: look.label === 'always',
          hidden: look.hidden,
          label: look.label === 'never' ? null : data.label,
          size: typeof data.size === 'number' ? data.size * grown : data.size,
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
    signal: (from, to, color, animate) => {
      if (!overlay) {
        overlay = document.createElement('canvas')
        overlay.setAttribute('aria-hidden', 'true')
        overlay.style.cssText =
          'position:absolute;inset:0;width:100%;height:100%;pointer-events:none'
        container.append(overlay)
      }
      flights.push({ animate, color: color ?? ink, from, started: performance.now(), to })
      if (flights.length > FLYING) {
        flights = flights.slice(-FLYING)
      }
      if (!flying) {
        flying = requestAnimationFrame(fly)
      }
    },
    stop: () => {
      cancelAnimationFrame(flying)
      flying = 0
      flights = []
      overlay?.remove()
      overlay = undefined
      sized?.disconnect()
      for (const type of held) {
        container.removeEventListener(type, hold, { capture: true })
      }
      container.style.touchAction = touchAction
    },
    update: (changes: GraphChanges, animate: boolean) => {
      for (const id of changes.removeNodes) {
        if (graph.hasNode(id)) {
          graph.dropNode(id)
        }
      }
      for (const link of changes.removeLinks) {
        if (graph.hasEdge(link.source, link.target)) {
          graph.dropEdge(link.source, link.target)
        }
      }
      const growing = new Map<string, number>()
      for (const node of changes.addNodes) {
        const size = pixels(node.size)
        graph.addNode(node.id, {
          label: node.label,
          size: animate ? 0 : size,
          x: node.x,
          y: node.y,
        })
        if (animate) {
          growing.set(node.id, size)
        }
      }
      for (const node of changes.changeNodes) {
        graph.mergeNodeAttributes(node.id, {
          label: node.label,
          size: pixels(node.size),
          x: node.x,
          y: node.y,
        })
      }
      for (const link of changes.addLinks) {
        if (
          graph.hasNode(link.source) &&
          graph.hasNode(link.target) &&
          !graph.hasEdge(link.source, link.target)
        ) {
          graph.addEdge(link.source, link.target, {
            from: link.source,
            label: link.label,
            size: 1,
            to: link.target,
          })
        }
      }
      if (growing.size > 0) {
        grow(growing)
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
