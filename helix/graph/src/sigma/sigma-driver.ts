import type {
  DrawnLink,
  DrawnNode,
  GraphChanges,
  GraphDriver,
} from '../connect-graph/connect-graph.js'
import { type GraphLooks, type NodeLook, rgbOf } from '../connect-graph/looks.js'
import type { GraphPoint } from '../connect-graph/seed.js'
import { pixelsOf } from '../connect-graph/sizes.js'
import {
  ease,
  gesturesHeld,
  groupsOver,
  type Named,
  namesOver,
  type OnScreen,
  signalsOver,
} from '../overlay/overlay.js'
import { SPREAD } from './edge-program.js'
import { DIAMOND, EMPHASES, MATERIALS, SHAPES } from './node-program.js'
import { reducersOf } from './sigma-options.js'

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
  off(type: 'updated', listener: () => void): unknown
  on(type: 'updated', listener: () => void): unknown
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
  ): { size: number; visibility?: string; x: number; y: number } | undefined
  /** The primitives the renderer was made with, which say whether `sigmaOptions()` made it. */
  getPrimitives(): { nodes?: object | undefined }
  off(
    type: 'clickNode' | 'enterNode' | 'leaveNode',
    listener: (payload: { node: string }) => void,
  ): unknown
  off(type: 'afterRender' | 'clickStage', listener: () => void): unknown
  on(
    type: 'clickNode' | 'enterNode' | 'leaveNode',
    listener: (payload: { node: string }) => void,
  ): unknown
  on(type: 'afterRender' | 'clickStage', listener: () => void): unknown
  getSetting(name: SigmaSetting): unknown
  refresh(options?: { partialGraph?: { edges?: string[]; nodes?: string[] } }): unknown
  resize(force?: boolean): unknown
  scaleSize(size?: number): number
  setSetting(name: SigmaSetting, value: boolean): unknown
  viewportToFramedGraph(point: { x: number; y: number }): { x: number; y: number }
}

/** The settings the driver sets, and puts back as they were when it stops. */
type SigmaSetting = 'enableCameraPanning' | 'enableCameraZooming'

/** Every setting the driver sets, to be read before it does and put back when it stops. */
const SETTINGS: readonly SigmaSetting[] = ['enableCameraPanning', 'enableCameraZooming']

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
   * `glass`, a shaded sphere with a highlight and a lit rim; `frosted`, a
   * milky body with a soft fall of light; or `mark`, a flat dot of its color
   * with a faint ring and a soft glow around it, as a marker on a table is.
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

/** How long a new note takes to grow to its size, and a moved one to glide to its place, in milliseconds. */
const GROW = 300

/** A color the looks give, `rgb()`, at an opacity from 0 to 1. */
const faded = (color: string, opacity: number): string => {
  const [red, green, blue] = rgbOf(color)
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`
}

/**
 * The screen's device pixels a CSS pixel, which a backdrop's padding and blur
 * are given in. **Sigma 4.0.3's backdrop adds them to a radius it measures in
 * device pixels**, unscaled, so on a screen of two device pixels a CSS pixel
 * a ring sat at half its distance and a glow spread half as far. Its quad is
 * sized from the same values scaled, so scaled here it is only larger.
 */
const devicePixels = (): number =>
  typeof devicePixelRatio === 'number' && devicePixelRatio > 0 ? devicePixelRatio : 1

/**
 * **Sigma 3's name grid, kept**: the width of the cell a name holds, one name
 * a cell, the larger note's. Wide enough for a name where a graph names its
 * notes on hover and at its hubs, so two names never share a line, and fine
 * where it names every note it can, since the overlay keeps names off each
 * other itself, and a grid as wide as a name left one name in each cell.
 */
const cellOf = (labels: 'all' | 'hover' | 'hubs'): number => (labels === 'all' ? 8 : 130)

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
 * The notes to name this frame, in the order the overlay makes room for them:
 * the ones that must be named first, the selected note, the one under the
 * pointer and the one the keys are on, then the larger notes, as Sigma's grid
 * kept the larger note's name. Named as `labels` says: the selected note's
 * neighbors where there is room, and the rest only as the page asked.
 */
export const namedOf = (
  graph: SigmaGraph,
  looks: GraphLooks,
  labels: 'all' | 'hover' | 'hubs',
  hovered: string | undefined,
  onScreen: OnScreen,
): Named[] => {
  const asked: (Named & { size: number; x: number; y: number })[] = []
  graph.forEachNode((id, attributes) => {
    const look = looks.node(id)
    const size = Number(attributes.size)
    /* The note the keys are on in the frame's list named as the note under
       the pointer is, so a reader moving by the keys sees it. */
    const must = look.label === 'always' || id === hovered || look.keyed === true
    const named =
      must ||
      (look.label === 'room' &&
        (look.raised || labels === 'all' || (labels === 'hubs' && size >= HUB)))
    const name = attributes.label
    if (!named || typeof name !== 'string' || name === '') {
      return
    }
    const at = onScreen(id)
    if (at) {
      asked.push({ id, must, name, size, strong: must || look.raised, x: at.x, y: at.y })
    }
  })
  asked.sort((one, other) => Number(other.must) - Number(one.must) || other.size - one.size)
  /* One name a cell, the first, beside every name that must be drawn, which
     holds no cell: Sigma's grid drew those apart from the rest. */
  const cell = cellOf(labels)
  const cells = new Set<string>()
  return asked.flatMap(({ id, must, name, strong, x, y }) => {
    const at = `${Math.floor(x / cell)}:${Math.floor(y / cell)}`
    if (!must) {
      if (cells.has(at)) {
        return []
      }
      cells.add(at)
    }
    return [{ id, must, name, strong }]
  })
}

/**
 * Drives Sigma.js for a Graph frame. Make the renderer with an empty
 * graphology graph and `sigmaOptions()`, pass it here, and `connectGraph`
 * fills it:
 *
 * ```js
 * const sigma = new Sigma(new Graph(), container, sigmaOptions())
 * connectGraph(frame, sigmaDriver(sigma, { layout }))
 * ```
 *
 * **`sigmaOptions()` is what draws the notes and links as Helix draws them.**
 * Sigma 4 takes its programs and reducers only when it is made, so the driver
 * cannot add them to a renderer made without them, and refuses one.
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
  const reducers = reducersOf(sigma)
  if (!reducers) {
    throw new TypeError(
      'sigmaDriver: make the renderer with sigmaOptions(), as new Sigma(graph, box, sigmaOptions()). Sigma 4 takes its programs only when it is made.',
    )
  }
  const graph = sigma.getGraph()
  const container = sigma.getContainer()
  const camera = sigma.getCamera()

  /* Every setting the driver changes, as the page left it, put back when it stops. */
  const before = new Map(SETTINGS.map((name) => [name, sigma.getSetting(name)]))

  /* **Drawn only into a box that is there.** Sigma measures its container
     before every render and throws when it has no width or no height, which
     is what a container taken off the page measures. A page that leaves
     while its graph is drawn removes the box first and disconnects after, so
     a draw made then threw out of the page's teardown: on fusion.dev, leaving
     /cortex once its trace had drawn replaced the whole site with its error
     page. When the box is back, the observer below draws it again. */
  const boxed = (): boolean =>
    container.isConnected && container.offsetWidth > 0 && container.offsetHeight > 0

  /* **Its own box, and not only the window.** Sigma measures its container
     when the window resizes, and a frame filling the screen, or settling its
     height, changes the box with the window as it was: the drawing stretched
     to the old size until something else made Sigma look. A box that shrinks
     to nothing, as it does leaving the page, is not drawn into. */
  const sized =
    typeof ResizeObserver === 'function'
      ? new ResizeObserver(() => {
          if (!boxed()) {
            return
          }
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
  const held = gesturesHeld(container)

  /** Where a note is on screen, and how large, or nothing where it is not drawn. */
  const onScreen = (id: string): { radius: number; x: number; y: number } | undefined => {
    const data = sigma.getNodeDisplayData(id)
    if (!data || data.visibility === 'hidden') {
      return undefined
    }
    const at = sigma.framedGraphToViewport(data)
    return { radius: sigma.scaleSize(data.size), x: at.x, y: at.y }
  }
  const signals = signalsOver(container, onScreen)

  /* **Names over the drawing**, which Sigma 4 draws in WebGL with no say in
     where a name goes: the selected note's always, the note under the
     pointer's, and the rest as `labels` asks, where there is room. */
  const names = namesOver(container, onScreen)
  let looks: GraphLooks | undefined
  const drawNames = (): void => {
    if (looks) {
      names.draw(looks, namedOf(graph, looks, naming, hovered, onScreen))
    }
  }
  /* Group names keep clear of the notes' names, drawn first. */
  const groups = groupsOver(container, onScreen, () => names.boxes())
  /* Names follow the view: drawn again after every frame Sigma draws. */
  const redraw = (): void => {
    drawNames()
    groups.draw()
  }
  sigma.on('afterRender', redraw)

  /* The notes drawn with a ring or a glow, which are measured in their radius
     on screen, and so drawn again for their own when the view zooms. */
  const ringed = new Set<string>()
  const rezoomed = (): void => {
    if (ringed.size > 0) {
      sigma.refresh({ partialGraph: { nodes: [...ringed].filter((id) => graph.hasNode(id)) } })
    }
  }
  camera.on('updated', rezoomed)

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
          size: pixelsOf(node.size),
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
    look: (next: GraphLooks) => {
      looks = next
      signals.look(next)
      groups.look(next)
      reducers.node = (node, attributes) => {
        const look = next.node(node)
        const density = devicePixels()
        const shape = look.shape ?? options.shape ?? 'circle'
        const material = look.material ?? options.material ?? 'flat'
        /* The selected note half again its size, so it reads as the one, and
           its neighbors a quarter, so where two names would collide the
           larger note's, which is theirs, is kept. */
        const grown = look.selected ? 1.5 : look.raised ? 1.25 : 1
        const size = Number(attributes.size) * grown
        /* The note's radius on screen now, which the ring and the glow are
           measured in, so they keep their place around it at any zoom. */
        const radius = sigma.scaleSize(size) * density
        /* **The glow is the backdrop's**, outside the note, where Sigma draws
           nothing of a note's own pass: a crisp ring clear of the edge, with
           the ground showing between, and a soft light falling away beyond it
           where the note is selected, and a mark's band of its color and faint
           light at rest, both in the note's own color. In pixels, from the
           note's size. */
        const glow =
          look.glow > 0
            ? {
                backdropBorderColor: faded(look.color, 0.8 * look.glow),
                /* As wide as Sigma 3's ring, a seventh of the radius, its
                   middle a third of the radius clear of the edge. */
                backdropBorderWidth: Math.max(radius * 0.14, 1.5 * density),
                backdropColor: next.ground,
                backdropPadding: radius * 0.32 + Math.max(radius * 0.07, 0.75 * density),
                backdropShadowBlur: radius * 2,
                backdropShadowColor: faded(look.color, 0.6 * look.glow),
                backdropVisibility: 'visible',
              }
            : material === 'mark'
              ? {
                  backdropBorderWidth: 0,
                  backdropColor: faded(look.color, 0.22),
                  backdropPadding: radius * 0.4,
                  backdropShadowBlur: radius * 0.9,
                  backdropShadowColor: faded(look.color, 0.3),
                  backdropVisibility: 'visible',
                }
              : { backdropVisibility: 'hidden' }
        /* **The note the keys are on in the frame's list is ringed in the
           ink**, as the note under the pointer is named, so a reader moving by
           the keys sees where they are. */
        const keyed =
          look.keyed === true
            ? {
                backdropBorderColor: next.ink,
                backdropBorderWidth: 2 * density,
                backdropColor: next.ground,
                backdropPadding: Math.max(radius * 0.32, 3 * density),
                backdropVisibility: 'visible',
              }
            : {}
        if (glow.backdropVisibility === 'visible' || look.keyed === true) {
          ringed.add(node)
        } else {
          ringed.delete(node)
        }
        return {
          ...glow,
          ...keyed,
          backdropArea: 'node',
          color: look.color,
          /* A ring is a circle drawn outlined, whatever its emphasis says. */
          emphasisCode:
            shape === 'ring'
              ? EMPHASES.outlined
              : EMPHASES[look.emphasis ?? options.emphasis ?? 'solid'],
          /* How strongly the note glows, which its backdrop draws: said on its
             display data as well, for whoever reads the drawing. */
          glow: look.glow,
          materialCode: MATERIALS[material],
          shape: SHAPES[shape],
          size: shape === 'diamond' ? size * DIAMOND : size,
          visibility: look.hidden ? 'hidden' : 'visible',
          zIndex: look.selected ? 2 : look.raised ? 1 : 0,
        }
      }
      /* Sigma hands an edge reducer the edge's key and attributes and not its
         ends, so `draw` writes the ends onto it as `from` and `to`. */
      reducers.edge = (_edge, attributes) => {
        const look = next.link(String(attributes.from), String(attributes.to))
        /* The note under the pointer lights its links in its own color, and
           the note the keys are on where the pointer is on none. */
        const near = hovered ?? next.keyed
        const lit = near !== undefined && (attributes.from === near || attributes.to === near)
        /* A link the selection raises or the pointer lights is strong: heavier,
           glowing, and headed at the note it arrives at. Drawn as wide as its
           glow, which the layer draws the line in the middle of. */
        const strong = look.raised || lit
        return {
          color: lit ? next.node(near as string).color : look.color,
          depth: strong ? 'topEdges' : 'edges',
          glow: strong ? 1 : 0,
          /* No head into a glowing note, whose glow covers where it would be. */
          head: strong && next.node(String(attributes.to)).glow === 0 ? 'arrow' : 'none',
          size: strong ? 2.6 * SPREAD : 1.6,
          visibility: look.hidden ? 'hidden' : 'visible',
          zIndex: strong ? 1 : 0,
        }
      }
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
      sized?.disconnect()
      sigma.off('afterRender', redraw)
      camera.off('updated', rezoomed)
      names.stop()
      groups.stop()
      signals.stop()
      sigma.off('enterNode', enter)
      sigma.off('leaveNode', leave)
      cancelAnimationFrame(gliding)
      container.style.cursor = cursor
      /* The renderer as the page made it: Sigma's own drawing, through no
         reducer, and its settings. */
      reducers.edge = undefined
      reducers.node = undefined
      for (const [name, value] of before) {
        sigma.setSetting(name, value !== false)
      }
      held.stop()
      /* Drawn as the page made it where the renderer is still on the page.
         Off it, the settings put back above have asked Sigma for a frame,
         and the `kill()` a page makes after `disconnect()` cancels it. */
      if (boxed()) {
        sigma.refresh()
      }
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
        const size = pixelsOf(node.size)
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
          size: pixelsOf(node.size),
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
            return (keep = false) => {
              if (done) {
                return
              }
              /* Ended where the notes stand, and heard. */
              if (keep) {
                finish()
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
