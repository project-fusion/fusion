import type {
  DrawnLink,
  DrawnNode,
  GraphChanges,
  GraphDriver,
} from '../connect-graph/connect-graph.js'
import { linkKey } from '../connect-graph/diff.js'
import { type GraphLooks, type NodeLook, rgbOf } from '../connect-graph/looks.js'
import type { GraphPoint } from '../connect-graph/seed.js'
import {
  gesturesHeld,
  groupsOver,
  namesOver,
  type OnScreen,
  signalsOver,
} from '../overlay/overlay.js'

/** A cosmos.gl graph, as far as the driver calls it. */
export interface CosmosGraph {
  fitView(duration?: number, padding?: number): void
  fitViewByPointIndices(indices: number[], duration?: number, padding?: number): void
  getPointPositions(): number[]
  getTrackedPointPositionsMap(): ReadonlyMap<number, [number, number]>
  getZoomLevel(): number
  readonly isReady: boolean
  readonly ready: Promise<void>
  pause(): void
  render(simulationAlpha?: number, transitionDuration?: number): void
  screenToSpacePosition(screenPosition: [number, number]): [number, number]
  setConfigPartial(config: Record<string, unknown>): void
  setLinkColors(linkColors: Float32Array): void
  setLinks(links: Float32Array): void
  setLinkWidths(linkWidths: Float32Array): void
  setClusterPositions(clusterPositions: (number | undefined)[]): void
  setPinnedPoints(pinnedIndices: number[] | null): void
  setPointClusters(pointClusters: (number | undefined)[]): void
  setPointColors(pointColors: Float32Array): void
  setPointPositions(pointPositions: Float32Array, dontRescale?: boolean): void
  setPointShapes(pointShapes: Float32Array): void
  setPointSizes(pointSizes: Float32Array): void
  setZoomLevel(value: number, duration?: number): void
  setZoomTransformByPointPositions(
    positions: Float32Array,
    duration?: number,
    scale?: number,
    padding?: number,
  ): void
  spaceToScreenPosition(spacePosition: [number, number]): [number, number]
  spaceToScreenRadius(spaceRadius: number): number
  start(alpha?: number): void
  trackPointPositionsByIndices(indices: number[]): void
  zoomToPointByIndex(index: number, duration?: number, scale?: number, canZoomOut?: boolean): void
}

/** How the cosmos.gl driver behaves where the page does not say. */
export interface CosmosDriverOptions {
  /** Whether each group's name is drawn over its notes. On by default. */
  groupLabels?: boolean | undefined
  /**
   * The longest a layout runs, in milliseconds, settled or not. 15 seconds by
   * default, past where twenty thousand notes settle on a laptop's GPU.
   */
  layoutLimit?: number | undefined
  /** A note's shape where it does not say: `circle` by default, `square` or `diamond`. A `ring` is drawn as a circle. */
  shape?: NodeLook['shape']
  /** The size of cosmos.gl's space, as its own `spaceSize` says. 4096 by default. */
  spaceSize?: number | undefined
}

/** cosmos.gl's numbers for the shapes it draws, of the ones Helix names. A ring has none, and is a circle. */
const SHAPES = { circle: 0, diamond: 3, ring: 0, square: 1 } as const

/** How long a step of the view takes, in milliseconds. */
const STEP = 250

/** How clear a link is drawn across the whole graph, from 0 to 1. */
const FAINT = 0.16

/** How long notes take to glide to places they were moved to, in milliseconds. */
const MORPH = 1400

/** How far one zoom step goes. */
const ZOOM = 1.5

/** How many notes of each group are followed on screen, to place its name. */
const SAMPLE = 24

/**
 * A note's drawn diameter in pixels, from its relative size: half the Sigma
 * driver's, since cosmos.gl is for graphs ten times as dense, and a leaf
 * drawn any larger fills a group of thousands in solid.
 */
const pixels = (size: number): number => 0.5 * (1.6 + 1.35 * Math.max(size, 0))

/** How hard each group's notes are drawn toward its place, which keeps the groups apart. */
const CLUSTER = 0.1

/** How often the view is fitted to the layout as it opens out, in milliseconds. */
const FOLLOW = 1000

/** The room around the graph when the view is fitted to it, as a share of the view. */
const PADDING = 0.08

/** How long a signal's ends stay followed on screen, in milliseconds: past its slowest crossing and its arrival. */
const SIGNALED = 2500

/** Whether the reader asked for less motion, read each time, since they can change it while the page is open. */
const still = (): boolean =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** An `rgb()` color as cosmos.gl takes one: four channels from 0 to 1. */
const channels = (color: string, alpha = 1): [number, number, number, number] => {
  const [red, green, blue] = rgbOf(color)
  return [red / 255, green / 255, blue / 255, alpha]
}

/**
 * Drives cosmos.gl for a Graph frame: the layout and the drawing both run on
 * the GPU, which is the renderer to reach for past fifty thousand notes. Make
 * the graph in a box inside the frame and pass both here, and
 * `connectGraph` fills it:
 *
 * ```js
 * const graph = new Graph(box, { enableSimulation: true })
 * connectGraph(frame, cosmosDriver(graph, box))
 * ```
 *
 * **cosmos.gl draws notes with its own shaders**, so a note's shape is
 * honored and its `material` and `emphasis` are not, and it names nothing:
 * the driver names the hovered note, the selected one and its neighbors, and
 * each group, over the drawing, as the Sigma driver does.
 *
 * **It is `@cosmos.gl/graph`, which is MIT**, and not Cosmograph, which is
 * licensed for noncommercial use only. The graph is the page's: after
 * `disconnect()`, `graph.destroy()` frees it.
 */
export const cosmosDriver = (
  graph: CosmosGraph,
  container: HTMLElement,
  options: CosmosDriverOptions = {},
): GraphDriver => {
  /* Each note's place in cosmos.gl's arrays, which are by index. */
  let ids: string[] = []
  let index = new Map<string, number>()
  /* The notes as the connector last drew them, which an update starts from. */
  let drawnNow = new Map<string, DrawnNode>()
  let links: DrawnLink[] = []
  let sizes: number[] = []
  let looks: GraphLooks | undefined
  let hovered: number | undefined
  let selected: string | undefined
  let near = new Set<string>()
  let groupSample: number[] = []
  let following = new Set<number>()
  /* The ends of signals in flight, followed until each is due to have landed. */
  const signaled = new Map<number, number>()
  /* Whether the reader has moved the view since the graph was drawn, after
     which the view is theirs and the layout no longer fits it. */
  let moved = false
  /* Whether the connector has stopped the driver, after which the page may
     destroy the graph, and nothing here touches it again: a fit or a read
     still waiting would reach a graph with no GPU. */
  let stopped = false
  /* How many notes cosmos.gl has on the GPU. None until it has started with
     notes to draw: a graph first drawn empty, as a frame is before its page
     gives it notes, has no places on the GPU, and reading them throws. */
  let uploaded = 0
  /** Whether cosmos.gl's places can be read: it has the GPU, notes on it, and still has it. */
  const live = (): boolean => graph.isReady && uploaded > 0 && !stopped

  /* Each note's group, by index, as cosmos.gl was last given it. */
  let clustered: (number | undefined)[] = []

  /* **Positions in the connector's units**, scaled into cosmos.gl's space by
     the driver, so what a layout reports is what the page keeps whichever
     renderer drew it. Settled on the first drawing, from how far its notes
     spread. */
  const space = options.spaceSize ?? 4096
  let scale = 1
  const toSpace = (point: GraphPoint): [number, number] => [
    space / 2 + point.x * scale,
    space / 2 + point.y * scale,
  ]
  const fromSpace = (x: number, y: number): GraphPoint => ({
    x: (x - space / 2) / scale,
    y: (y - space / 2) / scale,
  })

  /** The notes followed on screen: the ones named, signaled, or sampled to name a group. */
  const follow = (extra: readonly number[] = []): void => {
    const next = new Set<number>(groupSample)
    for (const id of [selected, ...near]) {
      const at = id === undefined ? undefined : index.get(id)
      if (at !== undefined) {
        next.add(at)
      }
    }
    if (hovered !== undefined) {
      next.add(hovered)
    }
    const now = performance.now()
    for (const at of extra) {
      signaled.set(at, now + SIGNALED)
    }
    for (const [at, until] of signaled) {
      if (until < now) {
        signaled.delete(at)
      } else {
        next.add(at)
      }
    }
    if (next.size !== following.size || [...next].some((at) => !following.has(at))) {
      following = next
      graph.trackPointPositionsByIndices([...next])
    }
  }

  /* **The followed positions read once a frame**: cosmos.gl reads them back
     from the GPU, and reading them for each name stalled the GPU for a
     minute on twenty thousand notes. */
  let tracked: ReadonlyMap<number, [number, number]> = new Map()
  let trackedAt = Number.NEGATIVE_INFINITY
  const positionsNow = (): ReadonlyMap<number, [number, number]> => {
    const now = performance.now()
    if (now - trackedAt > 8 && live()) {
      tracked = graph.getTrackedPointPositionsMap()
      trackedAt = now
    }
    return tracked
  }

  const onScreen: OnScreen = (id) => {
    const at = index.get(id)
    const point = at === undefined ? undefined : positionsNow().get(at)
    if (!point || at === undefined) {
      return undefined
    }
    const [x, y] = graph.spaceToScreenPosition(point)
    return { radius: (sizes[at] ?? 8) / 2, x, y }
  }

  const held = gesturesHeld(container)
  const signals = signalsOver(container, onScreen)
  /* Group names keep clear of the notes' names, drawn first. */
  const groups = groupsOver(container, onScreen, () => names.boxes())

  /* **Names over the drawing**, since cosmos.gl draws none: the note under
     the pointer, the selected note and its neighbors where there is room,
     drawn again whenever the view or the layout moves. */
  const names = namesOver(container, onScreen)
  const drawNames = (): void => {
    const lit = hovered === undefined ? undefined : ids[hovered]
    const shown = [...new Set([selected, lit, ...near])].flatMap((id) =>
      id === undefined
        ? []
        : [{ id, name: drawnNow.get(id)?.label ?? id, strong: id === selected || id === lit }],
    )
    names.draw(looks, shown)
  }
  const redraw = (): void => {
    drawNames()
    groups.draw()
  }

  /**
   * Where cosmos.gl has each note now, flat, by index. **The places last
   * drawn while cosmos.gl is starting**: the places it has are on the GPU,
   * and reading them before it has the GPU throws.
   */
  const flatNow = (): number[] =>
    live()
      ? graph.getPointPositions()
      : ids.flatMap((id) => toSpace(drawnNow.get(id) ?? { x: 0, y: 0 }))

  /** Fits the view to the whole graph, unless the reader has moved it. */
  const fitAll = (asked: number): void => {
    if (stopped) {
      return
    }
    const duration = still() ? 0 : asked
    /* A fit before cosmos.gl has the GPU and its size measures nothing, so
       it waits for both: the start, and the frame after. */
    if (!graph.isReady) {
      void graph.ready.then(() => requestAnimationFrame(() => fitAll(duration)))
      return
    }
    if (!moved && live()) {
      graph.fitView(duration, PADDING)
      clearTimeout(overviewing)
      overviewing = setTimeout(() => {
        overview = graph.getZoomLevel()
        grow()
      }, duration + 20)
    }
  }

  /* **Notes grow as the reader zooms in**, from fine points across the whole
     graph to the size the Sigma driver draws a note, so the overview reads as
     a field of light and a neighborhood as notes. */
  let overview = 0
  let overviewing: ReturnType<typeof setTimeout> | undefined
  let grown = 1
  const grow = (): void => {
    const by =
      overview > 0 ? Math.min(Math.max(Math.sqrt(graph.getZoomLevel() / overview), 0.7), 2.4) : 1
    if (Math.abs(by - grown) > 0.01) {
      grown = by
      graph.setConfigPartial({ pointSizeScale: by })
      if (Math.abs(clarity() - painted) > 0.04) {
        paintLinks()
        graph.render(undefined, 0)
      }
    }
  }

  /* **Links faint across the whole graph and whole up close**: thousands of
     them would cover the notes and the shape the notes make, and a reader
     zoomed in to a neighborhood is there to follow them. The selected
     note's links and the hovered note's are always whole. */
  const clarity = (): number => FAINT + (1 - FAINT) * Math.min(Math.max((grown - 1) / 0.8, 0), 1)
  let painted = 1

  /* The links' colors and widths, kept between paints so a hover writes only
     the links it lights and dims, and the arrays are made again only when the
     links change. */
  let linkColors = new Float32Array(0)
  let widths = new Float32Array(0)
  /* Each note's links, by index into `links`, which a hover lights. */
  let linksOf = new Map<string, number[]>()

  /** One link's color and width, from the looks, the hovered note, and how far the reader has zoomed in. */
  const paintLink = (at: number, lit: string | undefined): void => {
    const link = links[at] as DrawnLink
    const look = (looks as GraphLooks).link(link.source, link.target)
    const touches = lit !== undefined && (link.source === lit || link.target === lit)
    const whole = look.raised || touches
    linkColors.set(
      channels(
        touches ? (looks as GraphLooks).node(lit).color : look.color,
        look.hidden ? 0 : whole ? 1 : painted,
      ),
      at * 4,
    )
    widths[at] = whole ? 1.6 : 0.8
  }

  /** The links' colors and widths, from the looks and how far the reader has zoomed in. */
  const paintLinks = (): void => {
    if (!looks) {
      return
    }
    painted = clarity()
    if (linkColors.length !== links.length * 4) {
      linkColors = new Float32Array(links.length * 4)
      widths = new Float32Array(links.length)
    }
    const lit = hovered === undefined ? undefined : ids[hovered]
    for (let at = 0; at < links.length; at++) {
      paintLink(at, lit)
    }
    graph.setLinkColors(linkColors)
    graph.setLinkWidths(widths)
  }

  /** Lights the links of the note under the pointer, and puts back those of the note it left. */
  const hover = (next: number | undefined): void => {
    const was = hovered === undefined ? undefined : ids[hovered]
    hovered = next
    container.style.cursor = next === undefined ? cursor : 'pointer'
    if (!looks) {
      return
    }
    const lit = next === undefined ? undefined : ids[next]
    for (const id of [was, lit]) {
      for (const at of id === undefined ? [] : (linksOf.get(id) ?? [])) {
        paintLink(at, lit)
      }
    }
    graph.setLinkColors(linkColors)
    graph.setLinkWidths(widths)
    follow()
    /* At once: a hover drawn over cosmos.gl's own transition lagged the pointer. */
    graph.render(undefined, 0)
    redraw()
  }
  const cursor = container.style.cursor

  /** Colors, sizes and shapes from the looks, and the links' colors and widths. */
  const paint = (transition = 0): void => {
    if (!looks) {
      return
    }
    const colors = new Float32Array(ids.length * 4)
    const drawn = new Float32Array(ids.length)
    const shapes = new Float32Array(ids.length)
    selected = undefined
    near = new Set()
    ids.forEach((id, at) => {
      const look = (looks as GraphLooks).node(id)
      /* **A leaf is drawn partly clear and a hub solid**, so where thousands
         of leaves crowd they build into a bright core with a mist at its
         edge, and the hubs stand out of it. */
      const weight = Math.min(Math.max(((drawnNow.get(id)?.size ?? 1) - 1) / 6, 0), 1)
      const alpha = look.selected || look.raised ? 1 : 0.5 + 0.5 * weight
      colors.set(channels(look.color, look.hidden ? 0 : alpha), at * 4)
      drawn[at] = (sizes[at] ?? 8) * (look.selected ? 1.5 : look.raised ? 1.25 : 1)
      shapes[at] = SHAPES[look.shape ?? options.shape ?? 'circle']
      if (look.selected) {
        selected = id
      } else if (look.raised) {
        near.add(id)
      }
    })
    graph.setPointColors(colors)
    graph.setPointSizes(drawn)
    graph.setPointShapes(shapes)
    paintLinks()
    const focused = selected === undefined ? undefined : index.get(selected)
    graph.setConfigPartial({
      focusedPointIndex: focused,
      focusedPointRingColor:
        selected === undefined ? undefined : channels((looks as GraphLooks).node(selected).color),
      hoveredPointRingColor: channels(looks.ink, 0.6),
    })
    follow()
    /* At once unless notes are gliding to new places: cosmos.gl's own
       transition, the default, held a recolor back most of a second. */
    graph.render(undefined, still() ? 0 : transition)
    redraw()
  }

  /** Puts the whole graph into cosmos.gl's arrays, at the given places. */
  const load = (
    nodes: readonly DrawnNode[],
    next: readonly DrawnLink[],
    positions: Float32Array,
    transition = 0,
  ): void => {
    ids = nodes.map((node) => node.id)
    index = new Map(ids.map((id, at) => [id, at]))
    drawnNow = new Map(nodes.map((node) => [node.id, node]))
    sizes = nodes.map((node) => pixels(node.size))
    /* A note under the pointer before is not one now, whatever is at its index. */
    hovered = undefined
    links = next.filter((link) => index.has(link.source) && index.has(link.target))
    linksOf = new Map()
    links.forEach((link, at) => {
      for (const end of [link.source, link.target]) {
        const list = linksOf.get(end)
        if (list) {
          list.push(at)
        } else {
          linksOf.set(end, [at])
        }
      }
    })
    const pairs = new Float32Array(links.length * 2)
    links.forEach((link, at) => {
      pairs[at * 2] = index.get(link.source) as number
      pairs[at * 2 + 1] = index.get(link.target) as number
    })
    graph.setPointPositions(positions, true)
    graph.setLinks(pairs)
    paint(transition)
    /* On the GPU now, or once cosmos.gl has started and drawn what it was given. */
    uploaded = 0
    if (graph.isReady) {
      uploaded = ids.length
    } else {
      void graph.ready.then(() => {
        uploaded = ids.length
      })
    }
  }

  graph.setConfigPartial({
    /* The page's ground shows through, so the drawing is the frame's color. */
    backgroundColor: [0, 0, 0, 0],
    onPointMouseOut: () => hover(undefined),
    onPointMouseOver: (at: number) => hover(at),
    onSimulationTick: redraw,
    onTransition: redraw,
    onZoom: () => {
      grow()
      redraw()
    },
    onZoomStart: (_: unknown, userDriven: boolean) => {
      moved ||= userDriven
    },
    /* **Cooled eight times as fast as cosmos.gl's own**, which runs a large
       graph for most of a minute: a reader is waiting for it to settle. A
       step is a frame, so this is ten seconds at sixty frames a second. */
    simulationDecay: 600,
    /* **Longer, softer links, a far stronger push apart, and a pull to the
       middle that holds it in** than cosmos.gl's own, which pack a group of
       thousands into a solid disc: these open each group out until its
       notes and the fan around each hub can be told apart, and the pull
       keeps them off the edge of the space. */
    simulationGravity: 1.5,
    simulationLinkDistance: 30,
    simulationLinkSpring: 0.15,
    simulationRepulsion: 30,
    spaceSize: space,
  })

  return {
    center: (id, animate) => {
      const at = index.get(id)
      if (at !== undefined) {
        /* The view is the reader's from here: a layout still running no longer fits it. */
        moved = true
        graph.zoomToPointByIndex(at, animate ? STEP * 2 : 0, graph.getZoomLevel(), true)
      }
    },
    draw: ({ links: next, nodes }) => {
      /* Spread so the notes take a quarter of the space, which leaves the
         layout room to open them out. */
      /* A loop, not a spread: a spread of a hundred thousand notes overflows the stack. */
      let reach = 1
      for (const node of nodes) {
        reach = Math.max(reach, Math.abs(node.x), Math.abs(node.y))
      }
      scale = (space * 0.12) / reach
      moved = false
      const positions = new Float32Array(nodes.length * 2)
      nodes.forEach((node, at) => {
        positions.set(toSpace(node), at * 2)
      })
      load(nodes, next, positions)
      /* **Still until a layout is asked for**: cosmos.gl runs its own from
         the moment it has notes, which would pull notes drawn in their
         places, as a stencil draws them, out of those places. */
      graph.pause()
      /* Fitted now, which a graph drawn in its places, with no layout to
         follow, needs, and which marks how far out the whole graph is. */
      fitAll(0)
    },
    fit: (fitted, animate) => {
      const flat = flatNow()
      const box = { bottom: -Infinity, left: Infinity, right: -Infinity, top: Infinity }
      for (const id of fitted) {
        const at = index.get(id)
        if (at !== undefined) {
          const x = flat[at * 2] ?? 0
          const y = flat[at * 2 + 1] ?? 0
          box.left = Math.min(box.left, x)
          box.right = Math.max(box.right, x)
          box.top = Math.min(box.top, y)
          box.bottom = Math.max(box.bottom, y)
        }
      }
      if (!Number.isFinite(box.left)) {
        return
      }
      /* **Never closer than a fifth of the whole graph across**: a note and
         its one neighbor, fitted alone, filled the view and left the rest of
         the graph out of it. */
      let low = Infinity
      let high = -Infinity
      for (let at = 0; at < flat.length; at++) {
        low = Math.min(low, flat[at] as number)
        high = Math.max(high, flat[at] as number)
      }
      const least = Math.max((high - low) * 0.2, 1)
      const middle = { x: (box.left + box.right) / 2, y: (box.top + box.bottom) / 2 }
      const half = {
        x: Math.max(box.right - box.left, least) / 2,
        y: Math.max(box.bottom - box.top, least) / 2,
      }
      moved = true
      graph.setZoomTransformByPointPositions(
        new Float32Array([
          middle.x - half.x,
          middle.y - half.y,
          middle.x + half.x,
          middle.y + half.y,
        ]),
        animate && !still() ? STEP * 2 : 0,
        undefined,
        0.25,
      )
    },
    gestures: (next) => {
      held.set(next)
    },
    groups: (next) => {
      if (options.groupLabels === false) {
        return
      }
      /* A sample of each group, followed on screen, places its name. */
      groupSample = next.flatMap((group) =>
        group.ids.slice(0, SAMPLE).flatMap((id) => {
          const at = index.get(id)
          return at === undefined ? [] : [at]
        }),
      )
      follow()
      /* Each group named from its sample, the notes followed on screen. */
      groups.set(next.map((group) => ({ ...group, ids: group.ids.slice(0, SAMPLE) })))
      /* **Each group gets a place of its own**, around a circle, and its notes
         are drawn toward it, so ten groups of thousands come apart into ten
         regions and not one blob. */
      const cluster = new Map<string, number>()
      next.forEach((group, at) => {
        for (const id of group.ids) {
          cluster.set(id, at)
        }
      })
      const clusters = ids.map((id) => cluster.get(id))
      /* The groups are given again on every hover, and their places are
         uploaded to the GPU only when a note has changed group. */
      if (
        clusters.length === clustered.length &&
        clusters.every((at, position) => at === clustered[position])
      ) {
        return
      }
      clustered = clusters
      graph.setPointClusters(clusters)
      graph.setClusterPositions(
        next.flatMap((_, at) => {
          const turn = (at / Math.max(next.length, 1)) * Math.PI * 2
          return [
            space / 2 + Math.cos(turn) * space * 0.2,
            space / 2 + Math.sin(turn) * space * 0.2,
          ]
        }),
      )
      graph.setConfigPartial({ simulationCluster: next.length > 1 ? CLUSTER : 0 })
      /* cosmos.gl takes its clusters to the GPU on its next render. */
      graph.render()
    },
    look: (next) => {
      looks = next
      signals.look(next)
      groups.look(next)
      paint()
    },
    onPress: (press) => {
      graph.setConfigPartial({
        onBackgroundClick: () => press(undefined),
        onPointClick: (at: number) => {
          const id = ids[at]
          if (id !== undefined) {
            press(id)
          }
        },
      })
      return () => graph.setConfigPartial({ onBackgroundClick: undefined, onPointClick: undefined })
    },
    panBy: (x, y, animate) => {
      const { height, width } = container.getBoundingClientRect()
      const to = graph.screenToSpacePosition([width / 2 + x, height / 2 + y])
      moved = true
      graph.setZoomTransformByPointPositions(
        new Float32Array(to),
        animate ? STEP : 0,
        graph.getZoomLevel(),
      )
    },
    settle: (unplaced, placed) => {
      /* The notes that have a place keep it, pinned, while the GPU places the rest. */
      graph.setPinnedPoints(ids.flatMap((id, at) => (unplaced.has(id) ? [] : [at])))
      let done = false
      const finish = (): void => {
        if (done) {
          return
        }
        done = true
        clearTimeout(limit)
        clearInterval(fitting)
        graph.setPinnedPoints(null)
        graph.pause()
        fitAll(STEP * 2)
        const flat = flatNow()
        placed(
          new Map(ids.map((id, at) => [id, fromSpace(flat[at * 2] ?? 0, flat[at * 2 + 1] ?? 0)])),
        )
      }
      graph.setConfigPartial({ onSimulationEnd: finish })
      graph.start(1)
      const limit = setTimeout(finish, options.layoutLimit ?? 15000)
      /* The view follows the layout as it opens out, so the reader watches
         all of it settle, until they move the view themselves. */
      const fitting = setInterval(() => fitAll(FOLLOW), FOLLOW)
      return () => {
        done = true
        clearTimeout(limit)
        clearInterval(fitting)
        graph.setConfigPartial({ onSimulationEnd: undefined })
        graph.setPinnedPoints(null)
        /* A layout cut short stops moving the notes, and the next one starts from where they are. */
        graph.pause()
      }
    },
    signal: (from, to, colors, animate) => {
      const ends = [index.get(from), index.get(to)].filter((at): at is number => at !== undefined)
      follow(ends)
      signals.signal(from, to, colors, animate)
    },
    stop: () => {
      stopped = true
      clearTimeout(overviewing)
      container.style.cursor = cursor
      graph.setConfigPartial({
        onBackgroundClick: undefined,
        onPointClick: undefined,
        onPointMouseOut: undefined,
        onPointMouseOver: undefined,
        onSimulationEnd: undefined,
        onSimulationTick: undefined,
        onTransition: undefined,
        onZoom: undefined,
      })
      signals.stop()
      groups.stop()
      names.stop()
      held.stop()
    },
    update: (changes: GraphChanges, animate) => {
      /* cosmos.gl is by index, so a change is the arrays again: every note
         that stays where the layout has it now, unless the page moved it. */
      const flat = flatNow()
      const kept = new Map<string, DrawnNode>()
      ids.forEach((id, at) => {
        const node = drawnNow.get(id)
        if (node) {
          kept.set(id, { ...node, ...fromSpace(flat[at * 2] ?? 0, flat[at * 2 + 1] ?? 0) })
        }
      })
      for (const id of changes.removeNodes) {
        kept.delete(id)
      }
      let shifted = false
      for (const node of changes.changeNodes) {
        const was = drawnNow.get(node.id)
        const moved = was !== undefined && (was.x !== node.x || was.y !== node.y)
        shifted ||= moved
        const now = kept.get(node.id)
        kept.set(node.id, moved || !now ? node : { ...node, x: now.x, y: now.y })
      }
      for (const node of changes.addNodes) {
        kept.set(node.id, node)
      }
      const removed = new Set(changes.removeLinks.map(linkKey))
      const next = [...links.filter((link) => !removed.has(linkKey(link))), ...changes.addLinks]
      const nodes = [...kept.values()]
      const positions = new Float32Array(nodes.length * 2)
      nodes.forEach((node, at) => {
        positions.set(toSpace(node), at * 2)
      })
      /* Notes the page or a stencil moved glide to their new places, and the
         view follows them unless the reader has moved it. */
      const glide = shifted && animate ? MORPH : 0
      load(nodes, next, positions, glide)
      if (shifted) {
        fitAll(glide)
      }
    },
    zoomBy: (direction, animate) => {
      moved = true
      graph.setZoomLevel(
        graph.getZoomLevel() * (direction > 0 ? ZOOM : 1 / ZOOM),
        animate ? STEP : 0,
      )
    },
  }
}
