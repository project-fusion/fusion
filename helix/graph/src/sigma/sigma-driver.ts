import type {
  DrawnLink,
  DrawnNode,
  GraphChanges,
  GraphDriver,
} from '../connect-graph/connect-graph.js'
import type { GraphLooks, NodeLook } from '../connect-graph/looks.js'
import type { GraphPoint } from '../connect-graph/seed.js'
import { type Box, ease, gesturesHeld, groupsOver, signalsOver } from '../overlay/overlay.js'
import { EMPHASES, HelixNodeProgram, MATERIALS, SHAPES } from './node-program.js'

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
  off(
    type: 'clickNode' | 'enterNode' | 'leaveNode',
    listener: (payload: { node: string }) => void,
  ): unknown
  off(type: 'afterRender' | 'beforeRender' | 'clickStage', listener: () => void): unknown
  on(
    type: 'clickNode' | 'enterNode' | 'leaveNode',
    listener: (payload: { node: string }) => void,
  ): unknown
  on(type: 'afterRender' | 'beforeRender' | 'clickStage', listener: () => void): unknown
  getSetting(name: 'nodeProgramClasses'): Record<string, unknown>
  refresh(): unknown
  resize(force?: boolean): unknown
  scaleSize(size?: number): number
  setSetting(
    name:
      | 'defaultDrawNodeHover'
      | 'edgeReducer'
      | 'labelColor'
      | 'labelFont'
      | 'defaultDrawNodeLabel'
      | 'labelGridCellSize'
      | 'labelRenderedSizeThreshold'
      | 'labelSize'
      | 'minEdgeThickness'
      | 'nodeProgramClasses'
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
  /**
   * How heavily a note is drawn where it does not say: `solid`, filled, by
   * default; `outlined`, a ring; `subtle`, a tinted fill with a ring.
   */
  emphasis?: NodeLook['emphasis']
  /**
   * What a note is drawn as made of where it does not say: flat by default,
   * `glass`, a shaded sphere with a highlight and a lit rim, or `frosted`, a
   * milky body with a soft fall of light.
   */
  material?: NodeLook['material']
  /** A note's shape where it does not say: `circle` by default, `square`, `diamond` or `ring`. */
  shape?: NodeLook['shape']
  /**
   * Whether each group's name is drawn over its notes. On by default, which
   * is how a reader finds their way while notes are named only on hover.
   */
  groupLabels?: boolean | undefined
  /**
   * Which notes are named. `hover`, by default: the note under the pointer,
   * the selected note and its neighbors. `hubs`: the busiest notes as well, at
   * rest. `all`: every note, where its name does not cover another.
   */
  labels?: 'all' | 'hover' | 'hubs' | undefined
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

/** A note's drawn radius in pixels, from its relative size: a leaf about four, a busy hub about nine. */
const pixels = (size: number): number => 1.6 + 1.35 * Math.max(size, 0)

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

/** How long a new note takes to grow to its size, in milliseconds. */
const GROW = 300

/**
 * A note's name, ringed in the ground's color so it reads over the links it
 * crosses, and heavier on a larger note, so a hub's name leads.
 */
const labelOf =
  (looks: GraphLooks, claim: (box: Box, must: boolean) => boolean) =>
  (
    context: CanvasRenderingContext2D,
    data: HoverData & { forceLabel?: boolean; strong?: boolean },
    settings: { labelFont: string; labelSize: number },
  ): void => {
    if (!data.label) {
      return
    }
    /* **Quiet at rest and full where the reader is looking**: a name the
       graph shows unasked is the muted ink, a step smaller, and the selected
       note's and its neighbors' are the ink itself. */
    const strong = data.strong === true
    const size = strong ? settings.labelSize : settings.labelSize - 1
    context.font = `${strong ? 600 : 500} ${size}px ${settings.labelFont}`
    const x = data.x + data.size + 4
    const y = data.y + size / 3
    /* **A name that would cover one already drawn is left out**, the
       selected note's excepted, which is always drawn: Sigma's grid keeps
       one name a cell, and two notes either side of a cell's edge drew their
       names over each other. */
    const box = {
      bottom: y + 4,
      left: x - 2,
      right: x + context.measureText(data.label).width + 2,
      top: y - size,
    }
    if (!claim(box, data.forceLabel === true)) {
      return
    }
    context.lineJoin = 'round'
    context.lineWidth = 3
    context.strokeStyle = looks.ground
    context.strokeText(data.label, x, y)
    context.fillStyle = strong ? looks.ink : looks.quiet
    context.fillText(data.label, x, y)
  }

/** How large a note is drawn, in pixels, for `labels: 'hubs'` to name it at rest. */
const HUB = 6.5

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

  /* **The notes are drawn by Helix's own program**, which cuts each to its
     shape, draws its emphasis and its material, and lights its glow: added
     beside the page's programs and taken away again when the driver stops. */
  const programs = sigma.getSetting('nodeProgramClasses')
  sigma.setSetting('nodeProgramClasses', { ...programs, helix: HelixNodeProgram })

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

  /* The note under the pointer, whose links are lit. */
  let hovered: string | undefined
  const enter = ({ node }: { node: string }): void => {
    hovered = node
    sigma.refresh()
  }
  const leave = (): void => {
    hovered = undefined
    sigma.refresh()
  }
  sigma.on('enterNode', enter)
  sigma.on('leaveNode', leave)

  const naming = options.labels ?? 'hover'
  /* The boxes the names drawn this frame take, cleared as each frame starts. */
  let taken: Box[] = []
  /** Takes a name's box where it is free, or where the name must be drawn anyway, and says whether it did. */
  const claim = (box: Box, must: boolean): boolean => {
    const free = taken.every(
      (other) =>
        box.right < other.left ||
        box.left > other.right ||
        box.bottom < other.top ||
        box.top > other.bottom,
    )
    if (free || must) {
      taken.push(box)
    }
    return free || must
  }
  const clear = (): void => {
    taken = []
  }
  sigma.on('beforeRender', clear)
  const held = gesturesHeld(container)

  /** Where a note is on screen, and how large, or nothing where it is not drawn. */
  const onScreen = (id: string): { radius: number; x: number; y: number } | undefined => {
    const data = sigma.getNodeDisplayData(id)
    if (!data || data.hidden) {
      return undefined
    }
    const at = sigma.framedGraphToViewport(data)
    return { radius: sigma.scaleSize(data.size), x: at.x, y: at.y }
  }
  const signals = signalsOver(container, onScreen)
  const groups = groupsOver(container, onScreen)
  /* Group names follow the view: drawn again after every frame Sigma draws. */
  sigma.on('afterRender', groups.draw)

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
    fit: (ids, animate) => {
      let low = { x: Number.POSITIVE_INFINITY, y: Number.POSITIVE_INFINITY }
      let high = { x: Number.NEGATIVE_INFINITY, y: Number.NEGATIVE_INFINITY }
      for (const id of ids) {
        const at = sigma.getNodeDisplayData(id)
        if (at) {
          low = { x: Math.min(low.x, at.x), y: Math.min(low.y, at.y) }
          high = { x: Math.max(high.x, at.x), y: Math.max(high.y, at.y) }
        }
      }
      if (!Number.isFinite(low.x)) {
        return
      }
      /* The camera's ratio is the share of the whole graph the view shows, so
         the neighborhood's spread, with room around it, is the ratio that
         holds it. Never closer than an eighth, nor farther than the whole. */
      const state = {
        ratio: Math.min(Math.max(Math.max(high.x - low.x, high.y - low.y) * 2.4, 0.12), 1),
        x: (low.x + high.x) / 2,
        y: (low.y + high.y) / 2,
      }
      if (animate) {
        camera.animate(state, { duration: STEP * 2 })
      } else {
        camera.setState(state)
      }
    },
    gestures: (next) => {
      held.set(next)
    },
    groups: (next) => {
      if (options.groupLabels !== false) {
        groups.set(next)
      }
    },
    look: (looks: GraphLooks) => {
      signals.look(looks)
      groups.look(looks)
      sigma.setSetting('labelColor', { color: looks.ink })
      sigma.setSetting('labelSize', 13)
      /* Fine lines, which a graph of thousands needs: Sigma's floor drew every
         link nearly two pixels wide. */
      sigma.setSetting('minEdgeThickness', 0.8)
      sigma.setSetting('labelFont', looks.font)
      /* **Which notes are named is the reducer's**, by `labels`, and Sigma's
         grid keeps the names it is given apart, the larger note's first. */
      sigma.setSetting('labelRenderedSizeThreshold', 0)
      /* Cells wide enough for a name, so two names never share a line. */
      sigma.setSetting('labelGridCellSize', 130)
      sigma.setSetting('defaultDrawNodeLabel', labelOf(looks, claim))
      sigma.setSetting('defaultDrawNodeHover', hoverOf(looks))
      sigma.setSetting('nodeReducer', (node: string, data: Record<string, unknown>) => {
        const look = looks.node(node)
        /* The selected note half again its size, so it reads as the one, and
           its neighbors a quarter, so where two names would collide Sigma,
           which keeps the larger note's, keeps theirs. */
        const grown = look.selected ? 1.5 : look.raised ? 1.25 : 1
        /* Named as `labels` says: always the selected note, its neighbors
           where there is room, and the rest only as the page asked. */
        const named =
          look.label === 'always' ||
          (look.label === 'room' &&
            (look.raised ||
              naming === 'all' ||
              (naming === 'hubs' && typeof data.size === 'number' && data.size >= HUB)))
        return {
          ...data,
          color: look.color,
          emphasisCode: EMPHASES[look.emphasis ?? options.emphasis ?? 'solid'],
          forceLabel: look.label === 'always',
          glow: look.glow,
          hidden: look.hidden,
          label: named ? data.label : null,
          materialCode: MATERIALS[look.material ?? options.material ?? 'flat'],
          shapeCode: SHAPES[look.shape ?? options.shape ?? 'circle'],
          size: typeof data.size === 'number' ? data.size * grown : data.size,
          strong: look.selected || look.raised,
          type: 'helix',
          zIndex: look.selected ? 2 : look.raised ? 1 : 0,
        }
      })
      /* Sigma hands an edge reducer the edge's key and attributes and not its
         ends, so `draw` writes the ends onto it as `from` and `to`. */
      sigma.setSetting('edgeReducer', (_edge: string, data: Record<string, unknown>) => {
        const look = looks.link(String(data.from), String(data.to))
        /* The note under the pointer lights its links in its own color. */
        const lit = hovered !== undefined && (data.from === hovered || data.to === hovered)
        return {
          ...data,
          color: lit ? looks.node(hovered as string).color : look.color,
          hidden: look.hidden,
          size: look.raised || lit ? 1.6 : 0.8,
          zIndex: look.raised || lit ? 1 : 0,
        }
      })
      sigma.refresh()
    },
    onPress: (press) => {
      const listener = ({ node }: { node: string }): void => press(node)
      const away = (): void => press(undefined)
      sigma.on('clickNode', listener)
      sigma.on('clickStage', away)
      return () => {
        sigma.off('clickNode', listener)
        sigma.off('clickStage', away)
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
    signal: (from, to, colors, animate) => {
      signals.signal(from, to, colors, animate)
    },
    stop: () => {
      sigma.off('afterRender', groups.draw)
      sigma.off('beforeRender', clear)
      groups.stop()
      signals.stop()
      sigma.off('enterNode', enter)
      sigma.off('leaveNode', leave)
      sigma.setSetting('nodeProgramClasses', programs)
      sized?.disconnect()
      held.stop()
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
