import {
  HelixGraphPanEvent,
  HelixGraphPartChangeEvent,
  HelixGraphSignalEvent,
  HelixGraphZoomEvent,
  isRtl,
  reportRuntime,
  type ViewportGestureMode,
  type ViewportPanDetail,
  type ViewportZoomDetail,
  watchTheme,
} from '@fusion.dev/helix-core'
import { arrangeByGroup, hubsOf } from './arrange.js'
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
import { type GraphReach, reachOf } from './reach.js'
import { type GraphPoint, seedPositions } from './seed.js'
import { sizeOf } from './sizes.js'
import { fieldOf, fitInStencil, type GraphStencil, type StencilFrame } from './stencil.js'

export type { DrawnLink, DrawnNode, GraphChanges } from './diff.js'
export type { GraphReach } from './reach.js'

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
   * Draws the graph whole, replacing whatever was drawn, where each note is
   * placed, and frames it: the first drawing, a graph the page replaced with
   * one that shares no note, or every change for a driver without `update`.
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
  /**
   * Calls `press` with a note's `id` when the reader presses it in the
   * drawing, and with undefined when they press where no note is. Returns
   * what stops listening.
   */
  onPress?(press: (id: string | undefined) => void): () => void
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
  /**
   * Where in a shape the notes are drawn, where a `stencil` gives one:
   * `surface`, a shell, whose far side a renderer that draws in three
   * dimensions sets back so its near side reads; `fill`, all through it; or
   * undefined, no shape. `frame` is the shape and where it was put among the
   * notes, once the connector has drawn the notes in it, for a renderer that
   * draws the shape as well.
   */
  shape?(place: 'fill' | 'surface' | undefined, frame?: StencilFrame): void
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

/** Each note's group and then its hub, which a stencil gives a piece of its shape each. */
const clustersOf = (
  nodes: readonly { group?: string | undefined; id: string }[],
  hubOf: (id: string) => string,
): ((id: string) => readonly string[]) => {
  const groupOf = new Map(nodes.map((node) => [node.id, node.group ?? '']))
  return (id) => [groupOf.get(id) ?? '', hubOf(id)]
}

/** How a connection behaves where the page does not say. */
export interface ConnectGraphOptions {
  /**
   * Whether selecting a note in the list brings it into the middle of the
   * view. On by default. A note pressed in the drawing is never moved: the
   * reader is already looking at it.
   */
  center?: boolean | undefined
  /**
   * How far a selection reaches, which the drawing lights and a selection
   * made in the list frames: `links`, the notes it links to and from, which
   * is the default; `upstream`, everything a path of links leads from to it;
   * or `downstream`, everything a path leads to from it. Where each link runs
   * from what a note was derived from to the note, `upstream` lights all a
   * note came from.
   */
  reach?: GraphReach | undefined
  /**
   * A shape the notes are drawn in, such as a brain or a country's outline:
   * an SVG path and the box it is drawn in. **No layout runs**: each group
   * takes a region of the shape and each note sits by the hub it links to,
   * from the first frame. Every whole drawing is shaped, whatever places its
   * notes carry, so places a page kept from an earlier drawing are shaped
   * again the same way; a note added later is placed by the layout beside
   * its neighbors. A shape that holds none of the notes is warned of, and
   * the graph is laid out instead.
   */
  stencil?: GraphStencil | undefined
}

/** A connection, which is ended rather than left to leak. */
export interface GraphConnection {
  /** Stops answering the frame and puts back everything connecting changed. */
  disconnect(): void
  /**
   * Lays the graph out again from where it starts, ignoring where the last
   * layout put each note and the places the page gave its notes.
   */
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
 * `sigmaDriver` from `@fusion.dev/helix-graph/sigma`, `cosmosDriver` from
 * `./cosmos`, `threeDriver` from `./three`, or one of your own. The page
 * keeps the renderer it made: after `disconnect()`, kill or destroy it. The
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
  if (!('nodes' in frame) || typeof graph.requestActive !== 'function') {
    reportRuntime({
      detail: frame,
      kind: 'not-a-graph',
      message:
        'connectGraph: the element given is not a Graph frame (helix-graph or helix-headless-graph), so nothing will be drawn.',
      tag: frame.localName,
    })
  }
  let known = new Map<string, GraphPoint>()
  /* The selection the view was last framed on, so a selection that arrives
     with new notes is framed once they are drawn. */
  let framed: string | undefined
  /* Where the stencil was put among the notes, once the connector drew them in it. */
  let shapeFrame: StencilFrame | undefined
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

  /* **A snapshot drawn on the server is taken away once the renderer has
     drawn over it**, faded at the page's pace for a step, or at once for a
     reader who asked for less motion. Until then it is the graph, which is
     the point of it: the page has one from its first paint. **Hidden and
     not removed**, since the page's framework may own the element and
     remove it itself later, and an element already gone is an error there. */
  const snapshots = [...frame.querySelectorAll<HTMLElement>(':scope > [data-helix-graph-snapshot]')]
  const away = (snapshot: HTMLElement): void => {
    snapshot.hidden = true
    snapshot.style.display = 'none'
  }
  const ready = (): void => {
    graph.drawn?.(true)
    if (snapshots.length === 0) {
      return
    }
    const style = getComputedStyle(frame)
    const time = /^\s*(\d*\.?\d+)(ms|s)\s*$/i.exec(
      style.getPropertyValue('--helix-duration-normal'),
    )
    const duration = time ? Number(time[1]) * (time[2]?.toLowerCase() === 's' ? 1000 : 1) : 200
    const easing = style.getPropertyValue('--helix-easing-standard').trim() || 'ease'
    for (const snapshot of snapshots.splice(0)) {
      if (still() || duration <= 0 || typeof snapshot.animate !== 'function') {
        away(snapshot)
        continue
      }
      let fade: Animation
      try {
        fade = snapshot.animate([{ opacity: 1 }, { opacity: 0 }], { duration, easing })
      } catch {
        /* A curve the browser cannot animate by, which a theme may write. */
        fade = snapshot.animate([{ opacity: 1 }, { opacity: 0 }], { duration })
      }
      fade.finished.then(
        () => away(snapshot),
        () => away(snapshot),
      )
    }
  }

  /** The selected note, where the graph still holds it: a selection whose note was taken away is none. */
  const selectedNote = (): string | undefined => {
    const active = graph.active
    return active && (graph.nodes ?? []).some((node) => node.id === active) ? active : undefined
  }

  const restyle = (): void => {
    if (!connected) {
      return
    }
    colors ??= graphColorsFrom(frame)
    if (!colors) {
      return
    }
    const nodes = graph.nodes ?? []
    const links = graph.links ?? []
    const selected = selectedNote()
    const reached =
      selected === undefined ? undefined : reachOf(selected, links, options.reach ?? 'links')
    const notes = new Map(nodes.map((node) => [node.id, node]))
    current = looksOf({
      along: reached?.along,
      colors,
      /* The theme's face, unquoted, which Sigma writes into a canvas font. */
      font: getComputedStyle(frame)
        .fontFamily.split(',')[0]
        ?.trim()
        .replace(/^["']|["']$/g, ''),
      groups: nodes.flatMap((node) => (node.group === undefined ? [] : [node.group])),
      links: links.length,
      near: reached?.near ?? new Set(),
      noteOf: (id) => notes.get(id),
      selected,
      shown: graph.shown,
    })
    driver.look(current)
    if (driver.groups) {
      /* **Named over the notes the drawing shows**, so a group the legend
         turned off, or one the local graph leaves out whole, is not named
         over nothing. */
      const members = new Map<string, string[]>()
      const shown = graph.shown
      for (const node of nodes) {
        if (node.group !== undefined && (!shown || shown.has(node.id))) {
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
  const draw = (whole = false, fresh = false): void => {
    if (stopSettling) {
      stopSettling()
      stopSettling = undefined
    }
    cancelAnimationFrame(pending)
    const nodes = graph.nodes ?? []
    const ids = new Set(nodes.map((node) => node.id))
    /* **A graph replaced whole is drawn as a new one**: none of its notes was
       drawn before, so the view the reader had is over nothing, and the new
       graph is framed afresh. A change that keeps any note keeps the view. */
    if (
      !first &&
      drawnNodes.size > 0 &&
      ids.size > 0 &&
      ![...ids].some((id) => drawnNodes.has(id))
    ) {
      whole = true
    }
    /* A link to a note the graph does not hold is left out of the drawing,
       which has nothing to draw it to; the list keeps counting it. One link
       a pair, whatever the page repeats. */
    const nextLinks = new Map<string, DrawnLink>()
    for (const { label, source, target } of graph.links ?? []) {
      if (source !== target && ids.has(source) && ids.has(target)) {
        nextLinks.set(linkKey({ source, target }), { label, source, target })
      }
    }
    const linkList = [...nextLinks.values()]
    /* A fresh layout starts from nothing: the page's own places as well as the last layout's. */
    let { positions, unplaced } = seedPositions(
      fresh ? nodes.map(({ id }) => ({ id })) : nodes,
      linkList,
      fresh ? new Map() : known,
    )
    /* **A stencil places every note itself, from the graph's structure**, so
       the shape is drawn from the first frame and there is no layout to
       wait for: a layout run first and fitted after showed the graph in
       some other shape for seconds before it became this one. Every whole
       drawing is shaped, the places a page kept with it, and a drawing whose
       notes are all new; notes added to a shaped graph are laid out beside
       their neighbors. */
    const shaping =
      options.stencil !== undefined &&
      ids.size > 0 &&
      (first || whole || unplaced.size === ids.size)
    let fit: ReturnType<typeof fitInStencil> | undefined
    if (shaping && options.stencil) {
      const hubs = hubsOf(nodes, linkList)
      fit = fitInStencil(
        arrangeByGroup(nodes, linkList, { hubs, solid: fieldOf(options.stencil).depth > 0 }),
        options.stencil,
        { clustersOf: clustersOf(nodes, hubs.hubOf) },
      )
    }
    /* A shape that held the notes; where it held none, the layout's places instead. */
    const shaped = fit?.frame ? fit.positions : undefined
    if (fit?.frame) {
      shapeFrame = fit.frame
    } else if (shaping) {
      reportRuntime({
        detail: options.stencil,
        kind: 'stencil-without-inside',
        message:
          'connectGraph: the stencil has no inside to place the notes in, so the graph is laid out instead.',
        tag: frame.localName,
      })
      positions = seedPositions(
        nodes.map(({ id }) => ({ id })),
        linkList,
        new Map(),
      ).positions
      unplaced = new Set(ids)
    }
    driver.shape?.(options.stencil ? (options.stencil.place ?? 'fill') : undefined, shapeFrame)
    if (shaped) {
      positions = shaped
      unplaced = new Set()
      known = new Map(shaped)
    }
    /* As large as it is connected, where the note gives no size: `sizeOf`. */
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
        size: sizeOf(node.size, degree.get(node.id) ?? 0),
        x: at.x,
        y: at.y,
        ...(at.z === undefined ? {} : { z: at.z }),
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
      driver.draw({ links: linkList, nodes: [...nextNodes.values()] })
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
        /* A driver that finishes after the connection ended is not heard. */
        if (!connected) {
          return
        }
        waiting = new Set()
        known = new Map(settled)
        for (const [id, at] of settled) {
          const node = drawnNodes.get(id)
          if (node) {
            drawnNodes.set(id, { ...node, x: at.x, y: at.y, z: at.z })
          }
        }
        graph.laidOut?.(Object.fromEntries([...settled].map(([id, at]) => [id, { ...at }])))
        if (owed) {
          owed = false
          ready()
        }
      })
      return
    }
    waiting = new Set()
    /* Where the stencil put each note, said as a layout's places are, so a
       page keeps them as it keeps those. */
    if (shaped) {
      graph.laidOut?.(Object.fromEntries([...shaped].map(([id, at]) => [id, { ...at }])))
    }
    if (owed) {
      /* Drawn on the renderer's next frame, which is when what was drawn is
         on screen. */
      pending = requestAnimationFrame(() => {
        if (connected && owed) {
          owed = false
          ready()
        }
      })
    }
  }

  /** Something passed between two notes, which the renderer draws in the tone's color. */
  const handleSignal = (event: Event): void => {
    const { from, to, tone } = (event as HelixGraphSignalEvent).detail
    /* Nor between notes the drawing hides, by `depth` or the legend: a pulse
       crossing empty ground says something passed between nothing. */
    const shown = graph.shown
    if (
      !driver.signal ||
      !drawnNodes.has(from) ||
      !drawnNodes.has(to) ||
      (shown && !(shown.has(from) && shown.has(to)))
    ) {
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

  /**
   * Frames the selected note with its neighbors, where the selection changed
   * and was not pressed in the drawing, where the reader is already looking.
   */
  const frameSelection = (): void => {
    const selected = selectedNote()
    if (selected === framed) {
      pressed = undefined
      return
    }
    framed = selected
    if (
      selected !== undefined &&
      selected !== pressed &&
      options.center !== false &&
      drawnNodes.has(selected)
    ) {
      /* The note and the notes it reaches, framed together, so a
         neighborhood opens out to be read rather than sitting in a knot. */
      const near = [
        selected,
        ...reachOf(selected, drawnLinks.values(), options.reach ?? 'links').near,
      ]
      if (driver.fit && near.length > 1) {
        driver.fit(near, !still())
      } else {
        driver.center?.(selected, !still())
      }
    }
    pressed = undefined
  }

  const handlePartChange = (event: Event): void => {
    const { kind } = (event as HelixGraphPartChangeEvent).detail
    if (kind === 'data') {
      draw()
      /* A selection that came with the notes, as a page that loads a graph
         with a note chosen, is framed once they are drawn. */
      frameSelection()
    } else if (kind === 'focus') {
      restyle()
      frameSelection()
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
     note pressed is not moved: the reader is looking at it. **A press on no
     note lets the selection go**, so the graph's colors come back, as a
     click away from a selection does anywhere else. */
  const stopPress = driver.onPress?.((id) => {
    if (id === undefined) {
      pressed = undefined
      if (graph.active) {
        graph.requestActive?.('')
      }
      return
    }
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
      if (!connected) {
        return
      }
      known = new Map()
      waiting = new Set()
      draw(true, true)
    },
    restyle: () => {
      colors = null
      restyle()
    },
  }
}
