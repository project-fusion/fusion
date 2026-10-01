import {
  HelixGraphPanEvent,
  HelixGraphPartChangeEvent,
  HelixGraphZoomEvent,
  isRtl,
  type ViewportGestureMode,
  type ViewportPanDetail,
  type ViewportZoomDetail,
  watchTheme,
} from '@fusion.dev/helix-core'
import { type GraphColors, type GraphLooks, graphColorsFrom, looksOf } from './looks.js'
import { type GraphPoint, seedPositions } from './seed.js'

/** A note as the renderer draws it, placed. */
export interface DrawnNode {
  id: string
  label: string
  /** How large it is drawn, relative to the others: the note's `size`, or 1. */
  size: number
  x: number
  y: number
}

/** A link as the renderer draws it, between two notes the graph holds. */
export interface DrawnLink {
  label?: string | undefined
  source: string
  target: string
}

/**
 * What a renderer has to answer for the frame to drive it, and nothing that is
 * the same for every renderer: that is the connector's.
 *
 * **Pixels in, whatever the renderer calls them out.** The frame asks in
 * reading order and in fractions of the viewport, and the connector turns that
 * into pixels on screen before a driver sees it, so which way `start` is on a
 * right-to-left page is answered once.
 */
export interface GraphDriver {
  /**
   * Draws the graph, replacing whatever was drawn, where each note is placed.
   * Keep the view where it is: a note added to a graph is no reason to move.
   */
  draw(graph: { links: DrawnLink[]; nodes: DrawnNode[] }): void
  /**
   * How each note and link is drawn from now on, asked one at a time as the
   * renderer draws them: a selection or a theme changed.
   */
  look(looks: GraphLooks): void
  /** Moves the view by pixels on screen, over a short animation or at once. */
  panBy(x: number, y: number, animate: boolean): void
  /** Zooms the view one step about its middle: `1` in and `-1` out. */
  zoomBy(direction: 1 | -1, animate: boolean): void
  /** Brings a note into the middle of the view, where the renderer can. */
  center?(id: string, animate: boolean): void
  /** Calls `press` with a note's `id` when the reader presses it in the drawing. Returns what stops listening. */
  onPress?(press: (id: string) => void): () => void
  /**
   * Runs a layout over the drawn graph, moving the notes in `unplaced` and
   * holding the rest, and calls `placed` once it has settled with where every
   * note ended. Returns what stops it early. Without one, notes stay where the
   * connector started them.
   */
  settle?(
    unplaced: ReadonlySet<string>,
    placed: (positions: ReadonlyMap<string, GraphPoint>) => void,
  ): () => void
  /**
   * Which gestures the renderer takes from the page, as the frame's
   * `gestures` decides. `free` is what the renderer did before it was told
   * otherwise. `cooperative` leaves the wheel and one finger to the page and
   * takes the wheel with Ctrl or ⌘, and two fingers. `off` takes none.
   */
  gestures?(mode: ViewportGestureMode): void
  /** The element the renderer made focusable, which the connector takes out of the tab order. */
  focusTarget?(): HTMLElement | null
}

/** How a connection behaves where the page does not say. */
export interface ConnectGraphOptions {
  /**
   * Whether selecting a note in the list brings it into the middle of the
   * view. On by default. A note pressed in the drawing is never moved: the
   * reader is already looking at it.
   */
  center?: boolean | undefined
}

/** A connection, which is ended rather than left to leak. */
export interface GraphConnection {
  /** Stops answering the frame and puts back everything connecting changed. */
  disconnect(): void
  /** Lays the graph out again from where it starts, ignoring where the last layout put each note. */
  relayout(): void
}

/** The frame as the connector reads it: `helix-graph` or `helix-headless-graph`. */
interface Frame extends HTMLElement {
  active?: string
  drawn?(whole?: boolean): void
  gestureMode?: ViewportGestureMode
  laidOut?(positions: Record<string, GraphPoint>): void
  links?: readonly { label?: string | undefined; source: string; target: string }[]
  nodes?: readonly {
    group?: string | undefined
    id: string
    label?: string | undefined
    size?: number | undefined
    x?: number | undefined
    y?: number | undefined
  }[]
  requestActive?(id: string): boolean
  shown?: ReadonlySet<string> | undefined
  updateComplete?: Promise<unknown>
}

/** The box the graph is drawn in, which a pan is a fraction of. */
const viewportOf = (frame: HTMLElement): { width: number; height: number } => {
  const box = (
    frame.shadowRoot?.querySelector('[part="viewport"]') ?? frame
  ).getBoundingClientRect()
  return { height: box.height, width: box.width }
}

/** Whether the page asks for movement to be kept to a minimum. */
const still = (): boolean =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Connects a Graph frame to whatever draws the graph.
 *
 * The frame is `helix-graph` or `helix-headless-graph`, and the driver is
 * `sigmaDriver` from `@fusion.dev/helix-graph/sigma` or one of your own. The
 * connection draws the frame's `nodes` and `links`, lays out the notes that
 * have no position and says where it put them in `helix-graph-layout`, answers
 * the frame's pan and zoom, keeps the selection the same in the list and the
 * drawing, colors the graph from the page's tokens, and tells the renderer
 * which gestures it may take.
 */
export const connectGraph = (
  frame: HTMLElement,
  driver: GraphDriver,
  options: ConnectGraphOptions = {},
): GraphConnection => {
  const graph = frame as Frame
  let known = new Map<string, GraphPoint>()
  let colors: GraphColors | null = null
  let stopSettling: (() => void) | undefined
  let pressed: string | undefined
  let pending = 0
  let connected = true

  const restyle = (): void => {
    colors ??= graphColorsFrom(frame)
    if (!colors) {
      return
    }
    const nodes = graph.nodes ?? []
    const links = graph.links ?? []
    const selected = graph.active || undefined
    const near = new Set<string>()
    if (selected !== undefined) {
      for (const { source, target } of links) {
        if (source === selected) {
          near.add(target)
        } else if (target === selected) {
          near.add(source)
        }
      }
    }
    const groups = new Map(nodes.map((node) => [node.id, node.group]))
    driver.look(
      looksOf({
        colors,
        /* The theme's face, unquoted, which Sigma writes into a canvas font. */
        font: getComputedStyle(frame)
          .fontFamily.split(',')[0]
          ?.trim()
          .replace(/^["']|["']$/g, ''),
        groupOf: (id) => groups.get(id),
        groups: nodes.flatMap((node) => (node.group === undefined ? [] : [node.group])),
        near,
        selected,
        shown: graph.shown,
      }),
    )
  }

  const draw = (): void => {
    stopSettling?.()
    stopSettling = undefined
    cancelAnimationFrame(pending)
    const nodes = graph.nodes ?? []
    const ids = new Set(nodes.map((node) => node.id))
    /* A link to a note the graph does not hold is left out of the drawing,
       which has nothing to draw it to; the list keeps counting it. */
    const links = (graph.links ?? []).filter(
      ({ source, target }) => source !== target && ids.has(source) && ids.has(target),
    )
    const { positions, unplaced } = seedPositions(nodes, links, known)
    graph.drawn?.(false)
    driver.draw({
      links: links.map(({ label, source, target }) => ({ label, source, target })),
      nodes: nodes.map((node) => {
        const at = positions.get(node.id) as GraphPoint
        return {
          id: node.id,
          label: node.label || node.id,
          size: Number.isFinite(node.size) ? (node.size as number) : 1,
          x: at.x,
          y: at.y,
        }
      }),
    })
    restyle()
    if (unplaced.size > 0 && driver.settle) {
      stopSettling = driver.settle(unplaced, (settled) => {
        stopSettling = undefined
        known = new Map(settled)
        graph.laidOut?.(Object.fromEntries([...settled].map(([id, at]) => [id, { ...at }])))
        graph.drawn?.(true)
      })
      return
    }
    known = positions
    /* Drawn on the renderer's next frame, which is when what was drawn is
       on screen. */
    pending = requestAnimationFrame(() => {
      if (connected) {
        graph.drawn?.(true)
      }
    })
  }

  const handlePartChange = (event: Event): void => {
    const { kind } = (event as HelixGraphPartChangeEvent).detail
    if (kind === 'data') {
      draw()
    } else if (kind === 'focus') {
      restyle()
      const selected = graph.active
      if (selected && selected !== pressed && options.center !== false) {
        driver.center?.(selected, !still())
      }
      pressed = undefined
    } else {
      driver.gestures?.(graph.gestureMode ?? 'free')
    }
  }

  const handlePan = (event: Event): void => {
    const { by, to } = (event as CustomEvent<ViewportPanDetail>).detail
    const { height, width } = viewportOf(frame)
    const inline = (to === 'end' ? 1 : to === 'start' ? -1 : 0) * (isRtl(frame) ? -1 : 1)
    const block = to === 'down' ? 1 : to === 'up' ? -1 : 0
    driver.panBy(inline * width * by, block * height * by, !still())
  }

  const handleZoom = (event: Event): void => {
    const { by } = (event as CustomEvent<ViewportZoomDetail>).detail
    if (by !== 0) {
      driver.zoomBy(by > 0 ? 1 : -1, !still())
    }
  }

  frame.addEventListener(HelixGraphPartChangeEvent.eventName, handlePartChange)
  frame.addEventListener(HelixGraphPanEvent.eventName, handlePan)
  frame.addEventListener(HelixGraphZoomEvent.eventName, handleZoom)

  /* A press in the drawing asks the frame, which a page can refuse, and the
     note pressed is not moved: the reader is looking at it. */
  const stopPress = driver.onPress?.((id) => {
    pressed = id
    if (graph.requestActive?.(id) === false || graph.active !== id) {
      pressed = undefined
    }
  })

  /* The frame's region is the one tab stop, as the map's is. */
  const focusable = driver.focusTarget?.() ?? null
  const tabIndex = focusable?.getAttribute('tabindex') ?? null
  focusable?.setAttribute('tabindex', '-1')

  const stopTheme = watchTheme(frame, () => {
    colors = null
    restyle()
  })

  /* After the frame's first render, which is when it holds what the page
     gave it and knows its gestures. */
  void Promise.resolve(graph.updateComplete).then(() => {
    if (!connected) {
      return
    }
    driver.gestures?.(graph.gestureMode ?? 'free')
    draw()
  })

  return {
    disconnect: () => {
      connected = false
      cancelAnimationFrame(pending)
      stopSettling?.()
      stopPress?.()
      stopTheme()
      frame.removeEventListener(HelixGraphPartChangeEvent.eventName, handlePartChange)
      frame.removeEventListener(HelixGraphPanEvent.eventName, handlePan)
      frame.removeEventListener(HelixGraphZoomEvent.eventName, handleZoom)
      if (focusable) {
        if (tabIndex === null) {
          focusable.removeAttribute('tabindex')
        } else {
          focusable.setAttribute('tabindex', tabIndex)
        }
      }
      driver.gestures?.('free')
      graph.drawn?.(false)
    },
    relayout: () => {
      known = new Map()
      draw()
    },
  }
}
