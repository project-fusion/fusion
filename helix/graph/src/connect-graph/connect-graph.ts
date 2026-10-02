import {
  HelixGraphPanEvent,
  HelixGraphPartChangeEvent,
  HelixGraphSignalEvent,
  HelixGraphZoomEvent,
  isRtl,
  type ViewportGestureMode,
  type ViewportPanDetail,
  type ViewportZoomDetail,
  watchTheme,
} from '@fusion.dev/helix-core'
import {
  type DrawnLink,
  type DrawnNode,
  diffGraph,
  type GraphChanges,
  isEmpty,
  linkKey,
} from './diff.js'
import {
  type GraphColors,
  type GraphLooks,
  graphColorsFrom,
  looksOf,
  type NoteFacts,
  toneColor,
} from './looks.js'
import { type GraphPoint, seedPositions } from './seed.js'

export type { DrawnLink, DrawnNode, GraphChanges } from './diff.js'

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
   * Applies what changed since the last drawing, in place: what to add, what
   * to take away and which notes moved or were renamed. `animate` says
   * whether the reader may watch it happen. Without one, every change is a
   * whole `draw`, which is right for a graph that changes now and then and
   * wasteful for one that changes on every message.
   */
  update?(changes: GraphChanges, animate: boolean): void
  /**
   * Draws something passing from one note to another, traveling the way it
   * went and arriving with a pulse, or, where `animate` is false, the link
   * between them lit for a moment. It leaves in `colors.from` and arrives in
   * `colors.to`, which are one color where the signal has a tone. `colors` is
   * undefined while the page's colors cannot be read.
   */
  signal?(
    from: string,
    to: string,
    colors: { from: string; to: string } | undefined,
    animate: boolean,
  ): void
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
  /**
   * Frames a set of notes, the selected one and its neighbors, in the middle
   * of the view at a zoom that holds them all, where the renderer can.
   */
  fit?(ids: readonly string[], animate: boolean): void
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
  /**
   * The graph's groups, each named over its notes, which is how a reader
   * finds their way while notes are named only on hover. `faded` while a note
   * outside the group is selected.
   */
  groups?(groups: readonly GraphGroup[]): void
  /** Removes whatever the driver added to the renderer or the page, when the connection ends. */
  stop?(): void
}

/** One group of notes, as the renderer names it over them. */
export interface GraphGroup {
  /** The group's color, which its name is drawn in. */
  color: string
  /** Whether a note outside the group is selected, which steps its name back. */
  faded: boolean
  /** The notes in the group, by `id`. */
  ids: readonly string[]
  /** The group's name, as the notes give it. */
  name: string
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
  /**
   * Reads the page's colors again. The connection hears a theme that changes
   * by a class, a mode or the reader's preference on its own; call this after
   * replacing a stylesheet, which no attribute shows.
   */
  restyle(): void
}

/** The frame as the connector reads it: `helix-graph` or `helix-headless-graph`. */
interface Frame extends HTMLElement {
  active?: string
  drawn?(whole?: boolean): void
  gestureMode?: ViewportGestureMode
  laidOut?(positions: Record<string, GraphPoint>): void
  links?: readonly { label?: string | undefined; source: string; target: string }[]
  nodes?: readonly (NoteFacts & {
    id: string
    label?: string | undefined
    size?: number | undefined
    x?: number | undefined
    y?: number | undefined
  })[]
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
 * drawing, colors the graph from the page's tokens, tells the renderer which
 * gestures it may take, and draws the frame's `signal()`s.
 *
 * **A page changes the graph by handing the frame new arrays**, as often as
 * it likes: the connection compares them with what is drawn and the renderer
 * is told only what changed.
 */
export const connectGraph = (
  frame: HTMLElement,
  driver: GraphDriver,
  options: ConnectGraphOptions = {},
): GraphConnection => {
  const graph = frame as Frame
  let known = new Map<string, GraphPoint>()
  /* What the renderer holds now, which the next drawing is compared with. */
  let drawnNodes = new Map<string, DrawnNode>()
  let drawnLinks = new Map<string, DrawnLink>()
  let first = true
  /* The notes a layout was placing when the next change cut it short, which
     the next layout places with the new ones. */
  let waiting = new Set<string>()
  /* Whether the frame is still owed its first `drawn()`. Kept apart from the
     drawing that owes it: a change arriving while the first layout runs cuts
     that layout short, and the layout after it pays the debt. */
  let owed = false
  let colors: GraphColors | null = null
  /* The looks last handed the driver, which a signal takes its colors from. */
  let current: GraphLooks | undefined
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
    const notes = new Map(nodes.map((node) => [node.id, node]))
    current = looksOf({
      colors,
      /* The theme's face, unquoted, which Sigma writes into a canvas font. */
      font: getComputedStyle(frame)
        .fontFamily.split(',')[0]
        ?.trim()
        .replace(/^["']|["']$/g, ''),
      groups: nodes.flatMap((node) => (node.group === undefined ? [] : [node.group])),
      near,
      noteOf: (id) => notes.get(id),
      selected,
      shown: graph.shown,
    })
    driver.look(current)
    if (driver.groups) {
      const members = new Map<string, string[]>()
      for (const node of nodes) {
        if (node.group !== undefined) {
          const list = members.get(node.group)
          if (list) {
            list.push(node.id)
          } else {
            members.set(node.group, [node.id])
          }
        }
      }
      const own = selected === undefined ? undefined : notes.get(selected)?.group
      const looks = current
      driver.groups(
        [...members].map(([name, ids]) => ({
          /* A group's color is its notes' own, read from the first without a
             tone, since a tone colors a note over its group. */
          color: looks.colorOf(ids.find((id) => notes.get(id)?.tone === undefined) ?? ids[0] ?? ''),
          faded: selected !== undefined && own !== name,
          ids,
          name,
        })),
      )
    }
  }

  /**
   * Draws the frame's notes and links: the whole graph the first time, and
   * after that only what changed, so a graph fed by a busy page redraws one
   * note for one note added. A layout places the notes that have nowhere to
   * be, with the rest held, and the frame stays ready while it runs: the
   * graph was drawn whole once, and a note arriving does not undo that.
   */
  const draw = (whole = false): void => {
    if (stopSettling) {
      stopSettling()
      stopSettling = undefined
    }
    cancelAnimationFrame(pending)
    const nodes = graph.nodes ?? []
    const ids = new Set(nodes.map((node) => node.id))
    /* A link to a note the graph does not hold is left out of the drawing,
       which has nothing to draw it to; the list keeps counting it. One link
       a pair, whatever the page repeats. */
    const nextLinks = new Map<string, DrawnLink>()
    for (const { label, source, target } of graph.links ?? []) {
      if (source !== target && ids.has(source) && ids.has(target)) {
        nextLinks.set(linkKey({ source, target }), { label, source, target })
      }
    }
    const { positions, unplaced } = seedPositions(nodes, [...nextLinks.values()], known)
    /* **A note without a size is as large as it is connected**, so a hub
       reads as one at a glance and the graph's shape shows before a word of
       it is read. The square root, so a note with a hundred links is not ten
       times the size of one with ten, and no larger than a note with
       thirty-six, so a hub with thousands does not cover its own region. */
    const degree = new Map<string, number>()
    for (const { source, target } of nextLinks.values()) {
      degree.set(source, (degree.get(source) ?? 0) + 1)
      degree.set(target, (degree.get(target) ?? 0) + 1)
    }
    const nextNodes = new Map<string, DrawnNode>()
    for (const node of nodes) {
      const at = positions.get(node.id) as GraphPoint
      nextNodes.set(node.id, {
        id: node.id,
        label: node.label || node.id,
        size: Number.isFinite(node.size)
          ? (node.size as number)
          : 1 + Math.min(Math.sqrt(degree.get(node.id) ?? 0), 6),
        x: at.x,
        y: at.y,
      })
    }
    for (const id of waiting) {
      if (ids.has(id)) {
        unplaced.add(id)
      }
    }
    const incremental = !first && !whole && driver.update !== undefined
    if (incremental) {
      const changes = diffGraph(
        { links: drawnLinks, nodes: drawnNodes },
        { links: nextLinks, nodes: nextNodes },
      )
      if (!isEmpty(changes)) {
        driver.update?.(changes, !still())
      }
    } else {
      graph.drawn?.(false)
      driver.draw({ links: [...nextLinks.values()], nodes: [...nextNodes.values()] })
    }
    drawnNodes = nextNodes
    drawnLinks = nextLinks
    known = positions
    restyle()
    if (first || whole) {
      owed = true
    }
    first = false
    if (unplaced.size > 0 && driver.settle) {
      waiting = unplaced
      stopSettling = driver.settle(unplaced, (settled) => {
        stopSettling = undefined
        waiting = new Set()
        known = new Map(settled)
        for (const [id, at] of settled) {
          const node = drawnNodes.get(id)
          if (node) {
            drawnNodes.set(id, { ...node, x: at.x, y: at.y })
          }
        }
        graph.laidOut?.(Object.fromEntries([...settled].map(([id, at]) => [id, { ...at }])))
        if (owed) {
          owed = false
          graph.drawn?.(true)
        }
      })
      return
    }
    waiting = new Set()
    if (owed) {
      /* Drawn on the renderer's next frame, which is when what was drawn is
         on screen. */
      pending = requestAnimationFrame(() => {
        if (connected && owed) {
          owed = false
          graph.drawn?.(true)
        }
      })
    }
  }

  /** Something passed between two notes, which the renderer draws in the tone's color. */
  const handleSignal = (event: Event): void => {
    const { from, to, tone } = (event as HelixGraphSignalEvent).detail
    if (!driver.signal || !drawnNodes.has(from) || !drawnNodes.has(to)) {
      return
    }
    colors ??= graphColorsFrom(frame)
    /* **From one note's color to the other's**, so a message between two
       clusters is seen to cross from one to the other. A tone is what the
       signal means, which outranks where it came from, so a toned signal is
       its tone the whole way. */
    const toned = tone !== undefined && colors ? toneColor(colors, tone) : undefined
    driver.signal(
      from,
      to,
      toned
        ? { from: toned, to: toned }
        : current
          ? { from: current.colorOf(from), to: current.colorOf(to) }
          : undefined,
      !still(),
    )
  }

  const handlePartChange = (event: Event): void => {
    const { kind } = (event as HelixGraphPartChangeEvent).detail
    if (kind === 'data') {
      draw()
    } else if (kind === 'focus') {
      restyle()
      const selected = graph.active
      if (selected && selected !== pressed && options.center !== false) {
        /* The note and the notes it links to and from, framed together, so a
           neighborhood opens out to be read rather than sitting in a knot. */
        const near = [selected]
        for (const { source, target } of drawnLinks.values()) {
          if (source === selected) {
            near.push(target)
          } else if (target === selected) {
            near.push(source)
          }
        }
        if (driver.fit && near.length > 1) {
          driver.fit(near, !still())
        } else {
          driver.center?.(selected, !still())
        }
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
  frame.addEventListener(HelixGraphSignalEvent.eventName, handleSignal)
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
      frame.removeEventListener(HelixGraphSignalEvent.eventName, handleSignal)
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
      driver.stop?.()
      graph.drawn?.(false)
    },
    relayout: () => {
      known = new Map()
      waiting = new Set()
      draw(true)
    },
    restyle: () => {
      colors = null
      restyle()
    },
  }
}
