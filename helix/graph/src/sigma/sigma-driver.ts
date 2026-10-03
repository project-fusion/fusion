import type {
  DrawnLink,
  DrawnNode,
  GraphChanges,
  GraphDriver,
} from '../connect-graph/connect-graph.js'
import type { GraphLooks, NodeLook } from '../connect-graph/looks.js'
import type { GraphPoint } from '../connect-graph/seed.js'
import {
  type Box,
  chromeOver,
  clearOf,
  ease,
  gesturesHeld,
  groupsOver,
  nameStart,
  signalsOver,
} from '../overlay/overlay.js'
import { EMPHASES, HelixNodeProgram, MATERIALS, SHAPES } from './node-program.js'

/**
 * A graphology graph, as far as the driver calls it. Each member is
 * graphology's own, as its documentation describes it.
 */
export interface SigmaGraph {
  addEdge(source: string, target: string, attributes?: Record<string, unknown>): unknown
  addNode(node: string, attributes?: Record<string, unknown>): unknown
  clear(): void
  dropEdge(source: string, target: string): void
  dropNode(node: string): void
  edges(node: string): string[]
  forEachNode(callback: (node: string, attributes: Record<string, unknown>) => void): void
  getNodeAttributes(node: string): Record<string, unknown>
  hasEdge(source: string, target: string): boolean
  hasNode(node: string): boolean
  mergeNodeAttributes(node: string, attributes: Record<string, unknown>): unknown
  readonly order: number
  setNodeAttribute(node: string, name: string, value: unknown): unknown
}

/** Sigma's camera, as far as the driver calls it. Each member is Sigma's own. */
export interface SigmaCamera {
  animate(
    state: { ratio?: number; x?: number; y?: number },
    options?: { duration?: number },
  ): unknown
  getState(): { angle: number; ratio: number; x: number; y: number }
  setState(state: { ratio?: number; x?: number; y?: number }): unknown
}

/**
 * A Sigma renderer, as far as the driver calls it, over a graph of type `G`.
 * Each member is Sigma's own, as its documentation describes it.
 */
export interface SigmaRenderer<G extends SigmaGraph = SigmaGraph> {
  getCamera(): SigmaCamera
  getContainer(): HTMLElement
  getDimensions(): { height: number; width: number }
  getGraph(): G
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
  getSetting(name: SigmaSetting): unknown
  refresh(options?: { partialGraph?: { edges?: string[]; nodes?: string[] } }): unknown
  resize(force?: boolean): unknown
  scaleSize(size?: number): number
  setSetting(name: SigmaSetting, value: unknown): unknown
  viewportToFramedGraph(point: { x: number; y: number }): { x: number; y: number }
}

/** The settings the driver sets, and puts back as they were when it stops. */
type SigmaSetting =
  | 'defaultDrawNodeHover'
  | 'defaultDrawNodeLabel'
  | 'edgeReducer'
  | 'enableCameraPanning'
  | 'enableCameraZooming'
  | 'labelColor'
  | 'labelFont'
  | 'labelGridCellSize'
  | 'labelRenderedSizeThreshold'
  | 'labelSize'
  | 'minEdgeThickness'
  | 'nodeProgramClasses'
  | 'nodeReducer'

/** Every setting the driver sets, to be read before it does and put back when it stops. */
const SETTINGS: readonly SigmaSetting[] = [
  'defaultDrawNodeHover',
  'defaultDrawNodeLabel',
  'edgeReducer',
  'enableCameraPanning',
  'enableCameraZooming',
  'labelColor',
  'labelFont',
  'labelGridCellSize',
  'labelRenderedSizeThreshold',
  'labelSize',
  'minEdgeThickness',
  'nodeProgramClasses',
  'nodeReducer',
]

/** A layout that runs over a graphology graph until it is stopped, as ForceAtlas2's worker does. */
export interface SigmaLayout {
  kill(): void
  start(): void
  stop(): void
}

/** How the Sigma driver behaves where the page does not say, over a graph of type `G`. */
export interface SigmaDriverOptions<G extends SigmaGraph = SigmaGraph> {
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
  layout?: ((graph: G) => SigmaLayout) | undefined
  /**
   * How heavily a note is drawn where it does not say: `solid`, filled, by
   * default; `outlined`, a ring; `subtle`, a tinted fill with a ring.
   */
  emphasis?: NodeLook['emphasis']
  /**
   * What a note is drawn as made of where it does not say: `flat` by default,
   * `glass`, a shaded sphere with a highlight and a lit rim, or `frosted`, a
   * milky body with a soft fall of light.
   */
  material?: NodeLook['material'] | 'flat'
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

/** How long a new note takes to grow to its size, and a moved one to glide to its place, in milliseconds. */
const GROW = 300

/**
 * A note's name, ringed in the ground's color so it reads over the links it
 * crosses, and heavier on a larger note, so a hub's name leads.
 */
const labelOf =
  (
    looks: GraphLooks,
    claim: (box: Box, must: boolean) => boolean,
    start: (at: { radius: number; x: number }, width: number, box: (from: number) => Box) => number,
  ) =>
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
    const width = context.measureText(data.label).width
    const y = data.y + size / 3
    const boxAt = (from: number): Box => ({
      bottom: y + 4,
      left: from - 2,
      right: from + width + 2,
      top: y - size,
    })
    /* After the note, or before it where after it would run under the
       frame's controls or off the drawing. */
    const x = start({ radius: data.size, x: data.x }, width, boxAt)
    /* **A name that would cover one already drawn is left out**, the
       selected note's excepted, which is always drawn: Sigma's grid keeps
       one name a cell, and two notes either side of a cell's edge drew their
       names over each other. */
    const box = boxAt(x)
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
 * has, and a spec holds those shapes to the real classes. The renderer is the
 * page's: after `disconnect()`, `sigma.kill()` frees it.
 */
export const sigmaDriver = <G extends SigmaGraph>(
  sigma: SigmaRenderer<G>,
  options: SigmaDriverOptions<G> = {},
): GraphDriver => {
  const graph = sigma.getGraph()
  const container = sigma.getContainer()
  const camera = sigma.getCamera()

  /* Every setting the driver changes, as the page left it, put back when it stops. */
  const before = new Map(SETTINGS.map((name) => [name, sigma.getSetting(name)]))

  /* **The notes are drawn by Helix's own program**, which cuts each to its
     shape, draws its emphasis and its material, and lights its glow: added
     beside the page's programs and taken away again when the driver stops. */
  const programs = before.get('nodeProgramClasses') as Record<string, unknown> | undefined
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

  /* The note under the pointer, whose links are lit, and the pointer a hand
     over it, as over anything a press chooses. */
  let hovered: string | undefined
  const cursor = container.style.cursor
  /** Draws again only the links of the note the pointer left and the one it is over. */
  const relight = (from: string | undefined, to: string | undefined): void => {
    const edges = [from, to].flatMap((id) =>
      id !== undefined && graph.hasNode(id) ? graph.edges(id) : [],
    )
    /* Indexed again, so a lit link is drawn over the rest; the reducers run for these links alone. */
    sigma.refresh({ partialGraph: { edges } })
  }
  const enter = ({ node }: { node: string }): void => {
    const was = hovered
    hovered = node
    container.style.cursor = 'pointer'
    relight(was, node)
  }
  const leave = (): void => {
    const was = hovered
    hovered = undefined
    container.style.cursor = cursor
    relight(was, undefined)
  }
  sigma.on('enterNode', enter)
  sigma.on('leaveNode', leave)

  const naming = options.labels ?? 'hover'
  /* The boxes the names drawn this frame take, cleared as each frame starts. */
  let taken: Box[] = []
  /** Takes a name's box where it is free, or where the name must be drawn anyway, and says whether it did. */
  const claim = (box: Box, must: boolean): boolean => {
    const free = clearOf(box, taken)
    if (free || must) {
      taken.push(box)
    }
    return free || must
  }
  const clear = (): void => {
    /* The frame's controls first, so no name is drawn under them. */
    taken = chromeOver(container)
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
  /* Group names keep clear of the notes' names Sigma drew this frame. */
  const groups = groupsOver(container, onScreen, () => taken)
  /* Group names follow the view: drawn again after every frame Sigma draws. */
  sigma.on('afterRender', groups.draw)

  /* The frame a glide or a growth waits on, canceled when the driver stops. */
  let gliding = 0
  /**
   * Grows notes from nothing to their size, so a note arriving is seen to
   * arrive, and glides notes that moved from where they were to where they
   * are, so a change of places is seen as the same notes moving.
   */
  const glide = (
    sizes: ReadonlyMap<string, number>,
    moves: ReadonlyMap<string, { from: GraphPoint; to: GraphPoint }>,
  ): void => {
    cancelAnimationFrame(gliding)
    const started = performance.now()
    const step = (): void => {
      const along = Math.min((performance.now() - started) / GROW, 1)
      const eased = ease(along)
      for (const [id, size] of sizes) {
        if (graph.hasNode(id)) {
          graph.setNodeAttribute(id, 'size', size * eased)
        }
      }
      for (const [id, { from, to }] of moves) {
        if (graph.hasNode(id)) {
          graph.mergeNodeAttributes(id, {
            x: from.x + (to.x - from.x) * eased,
            y: from.y + (to.y - from.y) * eased,
          })
        }
      }
      gliding = along < 1 ? requestAnimationFrame(step) : 0
    }
    gliding = requestAnimationFrame(step)
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
      /* Framed afresh: Sigma frames the whole graph at its resting camera. */
      camera.setState({ ratio: 1, x: 0.5, y: 0.5 })
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
         holds it. Never closer than a quarter, where a note and its one
         neighbor filled the view and left the graph, nor farther than the whole. */
      const state = {
        ratio: Math.min(Math.max(Math.max(high.x - low.x, high.y - low.y) * 2.4, 0.25), 1),
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
      /* A double click zooms in Sigma, which no listener before its own can
         keep from it, since it counts the clicks itself: off is off there too.
         The camera still moves for the frame's buttons. */
      sigma.setSetting('enableCameraZooming', next !== 'off')
      sigma.setSetting('enableCameraPanning', next !== 'off')
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
      /* **Cells wide enough for a name**, so two names never share a line, for
         a graph that names its notes on hover and at its hubs. Fine where it
         names every note it can: the driver keeps names off each other
         itself, and a grid as wide as a name left one name in each cell. */
      sigma.setSetting('labelGridCellSize', naming === 'all' ? 24 : 130)
      sigma.setSetting(
        'defaultDrawNodeLabel',
        labelOf(looks, claim, (at, width, box) =>
          nameStart(at, width, box, taken, container.clientWidth),
        ),
      )
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
      cancelAnimationFrame(gliding)
      container.style.cursor = cursor
      /* The renderer as the page made it: its programs, reducers and settings. */
      for (const [name, value] of before) {
        sigma.setSetting(name, value)
      }
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
      const moves = new Map<string, { from: GraphPoint; to: GraphPoint }>()
      for (const node of changes.changeNodes) {
        const was = graph.getNodeAttributes(node.id)
        const from = { x: Number(was.x), y: Number(was.y) }
        const moved = from.x !== node.x || from.y !== node.y
        if (animate && moved && Number.isFinite(from.x) && Number.isFinite(from.y)) {
          moves.set(node.id, { from, to: { x: node.x, y: node.y } })
        }
        graph.mergeNodeAttributes(node.id, {
          label: node.label,
          size: pixels(node.size),
          ...(moves.has(node.id) ? {} : { x: node.x, y: node.y }),
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
      if (growing.size > 0 || moves.size > 0) {
        glide(growing, moves)
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
            const make = options.layout as (graph: G) => SigmaLayout
            /* The notes that have a place keep it: ForceAtlas2 leaves a note
               marked `fixed` where it is. */
            graph.forEachNode((node) => {
              graph.setNodeAttribute(node, 'fixed', !unplaced.has(node))
            })
            const layout = make(graph)
            layout.start()
            const limit = options.layoutLimit ?? 10000
            let started = performance.now()
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
            /* Whether the layout is paused while its box is off the page. */
            let paused = false
            const timer = setInterval(() => {
              /* **Paused while its box is off the page**, where every move it
                 makes is a frame Sigma draws for no one, and taken up again
                 where it left off when the box is back, its time limit
                 counting only the time it ran. */
              if (!container.isConnected) {
                if (!paused) {
                  paused = true
                  layout.stop()
                }
                started += SAMPLE
                return
              }
              if (paused) {
                paused = false
                layout.start()
              }
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
              /* No note stays held where it is for a layout that will not run. */
              graph.forEachNode((node) => {
                graph.setNodeAttribute(node, 'fixed', false)
              })
            }
          },
        }
      : {}),
  }
}
