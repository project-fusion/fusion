import type { ViewportGestureMode } from '@fusion.dev/helix-core'
import type { GraphGroup } from '../connect-graph/connect-graph.js'
import { type GraphLooks, mixRgb, rgbOf } from '../connect-graph/looks.js'

/*
 * What a driver draws over its renderer, the same whatever the renderer: the
 * frame's signals, each group's name, and the gestures it keeps from the
 * renderer for the page. A driver says where a note is on screen, and this
 * does the rest.
 */

/** Where a note is on screen and how large, or nothing where it is not drawn. */
export type OnScreen = (id: string) => { radius: number; x: number; y: number } | undefined

/**
 * How fast a signal crosses, in pixels a second, and the least and most time
 * a crossing takes, in milliseconds: at one speed, a short link is not
 * crawled along and a long one is not jumped.
 */
const SPEED = 340
const QUICKEST = 450
const SLOWEST = 1400

/** How long a note brightens and ripples when a signal reaches it, in milliseconds. */
const ARRIVAL = 520

/** The most signals in flight at once. A page sending more drops the oldest. */
const FLYING = 400

/** One signal on its way. */
interface Flight {
  animate: boolean
  /** How long the crossing takes, settled on its first frame from how far it goes. */
  crossing?: number
  from: string
  /** The color it leaves in, and the color it arrives in. */
  leaves: string
  arrives: string
  started: number
  to: string
}

/** An `rgb()` color with an alpha, for a gradient's stops. */
const withAlpha = (color: string, alpha: number): string => {
  const [red, green, blue] = rgbOf(color)
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

/** How far behind its head a signal's tail reaches, in pixels. */
const TAIL = 120

/** How many pieces a tail is drawn in, each a little wider and brighter than the one behind. */
const PIECES = 14

/** How long a signal's spark lasts as it leaves, as a share of its crossing. */
const SPARK = 0.22

type Point = { x: number; y: number }

/** A point on the line from `a` to `b`, `t` of the way along. */
const on = (a: Point, b: Point, t: number): Point => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
})

/** The link's path, traced. */
const trace = (context: CanvasRenderingContext2D, a: Point, b: Point): void => {
  context.beginPath()
  context.moveTo(a.x, a.y)
  context.lineTo(b.x, b.y)
}

/**
 * A signal on its way: a comet running along its link, **on the line the
 * link is drawn as**, so it is seen to travel the connection it passes
 * along; its tail tapering and fading into the line it came along and turning from one
 * note's color to the other's, a bright head blooming in its color, and the
 * path itself lit faintly while it passes. Quiet on purpose: on a busy feed
 * there are dozens at once.
 */
const comet = (
  context: CanvasRenderingContext2D,
  leaves: string,
  arrives: string,
  from: Point,
  to: Point,
  along: number,
  through: number,
  glowing: boolean,
): void => {
  /* Added light reads fainter than paint at the same strength, so on a dark
     ground the comet carries a little more of it. */
  const strength = glowing ? 1.25 : 1
  const length = Math.hypot(to.x - from.x, to.y - from.y) || 1
  const color = mixRgb(leaves, arrives, along)
  context.lineCap = 'round'
  /* The path lit while the comet is on it, rising and falling with it. */
  const line = context.createLinearGradient(from.x, from.y, to.x, to.y)
  line.addColorStop(0, withAlpha(leaves, 0.16 * Math.sin(Math.PI * through)))
  line.addColorStop(1, withAlpha(arrives, 0.16 * Math.sin(Math.PI * through)))
  context.strokeStyle = line
  context.lineWidth = 1
  trace(context, from, to)
  context.stroke()
  /* The tail, in pieces: fine and clear at its end, wider and brighter
     toward the head. */
  const reach = Math.min(TAIL / length, along)
  /* Butt ends, so the pieces meet and do not overlap into beads. */
  context.lineCap = 'butt'
  let behind = on(from, to, along - reach)
  for (let piece = 1; piece <= PIECES; piece++) {
    const share = piece / PIECES
    const t = along - reach * (1 - share)
    const ahead = on(from, to, t)
    context.strokeStyle = withAlpha(
      mixRgb(leaves, arrives, t),
      (glowing ? 0.85 : 1) * share * share,
    )
    context.lineWidth = (0.4 + 2.2 * share) * strength
    context.beginPath()
    context.moveTo(behind.x, behind.y)
    context.lineTo(ahead.x, ahead.y)
    context.stroke()
    behind = ahead
  }
  /* The head: white at its heart on a dark ground, blooming in the signal's
     color; on a light ground, where white is the ground, its own color at
     its heart. */
  const head = on(from, to, along)
  const bloom = 9 * strength
  const light = context.createRadialGradient(head.x, head.y, 0, head.x, head.y, bloom)
  light.addColorStop(0, glowing ? 'rgba(255, 255, 255, 0.95)' : withAlpha(color, 1))
  light.addColorStop(
    0.18,
    glowing ? withAlpha(mixRgb(color, 'rgb(255, 255, 255)', 0.5), 0.9) : withAlpha(color, 0.85),
  )
  light.addColorStop(0.45, withAlpha(color, 0.35))
  light.addColorStop(1, withAlpha(color, 0))
  context.fillStyle = light
  context.beginPath()
  context.arc(head.x, head.y, bloom, 0, Math.PI * 2)
  context.fill()
}

/** A signal leaving: a small ring spreading from the note it left, in its color. */
const spark = (
  context: CanvasRenderingContext2D,
  color: string,
  at: { radius: number; x: number; y: number },
  gone: number,
): void => {
  context.strokeStyle = withAlpha(color, 0.6 * (1 - gone) ** 2)
  context.lineWidth = 1.2
  context.beginPath()
  context.arc(at.x, at.y, at.radius + 2 + 8 * ease(gone), 0, Math.PI * 2)
  context.stroke()
}

/**
 * A signal arriving: the note it reached brightening, and a ring rippling
 * out from it and fading, in the color the signal arrived in.
 */
const arrive = (
  context: CanvasRenderingContext2D,
  color: string,
  at: { radius: number; x: number; y: number },
  gone: number,
): void => {
  const reach = at.radius + 7
  const glow = context.createRadialGradient(at.x, at.y, at.radius * 0.4, at.x, at.y, reach)
  glow.addColorStop(0, withAlpha(color, 0.55 * (1 - gone) ** 2))
  glow.addColorStop(1, withAlpha(color, 0))
  context.fillStyle = glow
  context.beginPath()
  context.arc(at.x, at.y, reach, 0, Math.PI * 2)
  context.fill()
  context.strokeStyle = withAlpha(color, 0.7 * (1 - gone) ** 1.5)
  context.lineWidth = 1.5 * (1 - gone) + 0.5
  context.beginPath()
  context.arc(at.x, at.y, at.radius + 3 + 16 * ease(gone), 0, Math.PI * 2)
  context.stroke()
}

/** Whether an `rgb()` color is light, which a light ink says the ground is dark. */
export const isLight = (color: string): boolean => {
  const [red, green, blue] = rgbOf(color, 0)
  return (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255 > 0.5
}

/** Eases in and out, so a signal leaves and arrives gently. */
export const ease = (at: number): number => (at < 0.5 ? 2 * at * at : 1 - (-2 * at + 2) ** 2 / 2)

/** A name's box on screen, in pixels. */
export interface Box {
  bottom: number
  left: number
  right: number
  top: number
}

/** How many of a group's notes say where its name goes. */
const SAMPLED = 96

/**
 * Each group's name over the middle of its notes, in the group's color made
 * quiet, ringed in the ground's color, and stepped back while a note outside
 * it is selected. Not where a group is drawn too small for its name to say
 * which notes it means.
 */
const nameGroups = (
  context: CanvasRenderingContext2D,
  groups: readonly GraphGroup[],
  looks: GraphLooks,
  at: (id: string) => { x: number; y: number } | undefined,
  avoid: readonly Box[],
): void => {
  /* **Named as a map names a region**: small capitals spread wide, lit in the
     group's color, over a soft fall of the ground's color in place of a hard
     ring, so the name sits in the drawing and not on it. */
  context.font = `650 11px ${looks.font}`
  context.letterSpacing = '0.14em'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.shadowColor = looks.ground
  /* Where names already are, so two groups that meet on screen do not print
     one name over the other, nor over a note's name. */
  const taken: Box[] = [...avoid]
  for (const group of groups) {
    let x = 0
    let y = 0
    let count = 0
    const points: { x: number; y: number }[] = []
    /* **A sample of the group's notes, spread through it**, since the names
       are drawn again on every frame the view moves: where a group's middle
       is, read from a hundred of its notes, is where it is read from all. */
    const step = Math.max(1, Math.floor(group.ids.length / SAMPLED))
    let asked = 0
    for (let index = 0; index < group.ids.length; index += step) {
      asked += 1
      const point = at(group.ids[index] as string)
      if (point) {
        x += point.x
        y += point.y
        count += 1
        points.push(point)
      }
    }
    /* Named only where enough of the group is in view to say which notes
       the name means: a group mostly round the far side of a shape would be
       named over its neighbor's notes. */
    if (count < Math.max(2, asked * 0.3)) {
      continue
    }
    x /= count
    y /= count
    const spread =
      points.reduce((sum, point) => sum + Math.hypot(point.x - x, point.y - y), 0) / count
    if (spread < 12) {
      continue
    }
    const name = group.name.toLocaleUpperCase()
    const half = context.measureText(name).width / 2 + 4
    const boxAt = (middle: number): Box => ({
      bottom: middle + 9,
      left: x - half,
      right: x + half,
      top: middle - 9,
    })
    const clear = (box: Box): boolean =>
      taken.every(
        (other) =>
          box.right < other.left ||
          box.left > other.right ||
          box.bottom < other.top ||
          box.top > other.bottom,
      )
    /* Where it falls, or a line below or above it, and not at all where none is clear. */
    const line = [0, 18, -18].map((step) => y + step).find((middle) => clear(boxAt(middle)))
    if (line === undefined) {
      continue
    }
    y = line
    taken.push(boxAt(y))
    context.globalAlpha = group.faded ? 0.3 : 0.92
    context.fillStyle = mixRgb(group.color, looks.ink, 0.6)
    /* Twice: once with a wide shadow and once with a close one, which together
       clear the notes under the name without boxing it. */
    context.shadowBlur = 10
    context.fillText(name, x, y)
    context.shadowBlur = 3
    context.fillText(name, x, y)
  }
  context.shadowBlur = 0
  context.letterSpacing = '0px'
  context.globalAlpha = 1
}

/** A canvas laid over the renderer's, taking no pointer and said to no one. */
const layer = (container: HTMLElement, kind: 'groups' | 'names' | 'signals'): HTMLCanvasElement => {
  const canvas = document.createElement('canvas')
  canvas.setAttribute('aria-hidden', 'true')
  canvas.dataset.helixGraphLayer = kind
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none'
  /* Group names under the signals, whichever was made first. */
  const signals = container.querySelector('canvas[data-helix-graph-layer="signals"]')
  if (kind === 'groups' && signals) {
    container.insertBefore(canvas, signals)
  } else {
    container.append(canvas)
  }
  return canvas
}

/**
 * How many pixels a layer has for each of the page's: the screen's own, and
 * never fewer than two, so on a screen of one a name's edges and a signal's
 * tail are drawn twice as finely and smoothed down. At most three.
 */
export const overlayDensity = (): number => Math.min(Math.max(window.devicePixelRatio || 1, 2), 3)

/** Sizes a layer to its box at the overlay's density, and clears it. */
const fresh = (
  canvas: HTMLCanvasElement,
  container: HTMLElement,
): CanvasRenderingContext2D | null => {
  const context = canvas.getContext('2d')
  if (!context) {
    return null
  }
  const ratio = overlayDensity()
  const width = Math.round(container.clientWidth * ratio)
  const height = Math.round(container.clientHeight * ratio)
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
  }
  context.setTransform(ratio, 0, 0, ratio, 0, 0)
  context.clearRect(0, 0, width, height)
  return context
}

/**
 * **Signals are drawn on a canvas of the driver's own**, over the renderer's,
 * so a signal never makes the renderer redraw the graph: ten signals a second
 * over ten thousand notes draw ten dots. It draws only while something is in
 * flight, and takes no pointer, so a press reaches the note under it.
 */
export const signalsOver = (container: HTMLElement, onScreen: OnScreen) => {
  let overlay: HTMLCanvasElement | undefined
  let flights: Flight[] = []
  let flying = 0
  let ink = 'rgb(128, 128, 128)'
  /* Whether the drawing's ground is dark, read from its ink, which decides how
     a signal's light is laid over it. */
  let glowing = false

  const fly = (now: number): void => {
    /* A drawing taken off the page draws nothing, and its signals are dropped. */
    const context = overlay && container.isConnected ? fresh(overlay, container) : null
    if (!context) {
      flights = []
      return
    }
    /* **Light added to light on a dark ground**, so a pulse glows and two
       crossing brighten where they meet. On a light ground the same blend
       washes to white, so there a pulse is laid over the drawing as paint. */
    context.globalCompositeOperation = glowing ? 'lighter' : 'source-over'
    flights = flights.filter((flight) => {
      const from = onScreen(flight.from)
      const to = onScreen(flight.to)
      if (!from || !to) {
        return false
      }
      /* How long the crossing takes, from how far it goes, at one speed. */
      flight.crossing ??= Math.min(
        Math.max((Math.hypot(to.x - from.x, to.y - from.y) / SPEED) * 1000, QUICKEST),
        SLOWEST,
      )
      const crossing = flight.crossing
      const gone = (now - flight.started) / crossing
      if (gone >= 1 + ARRIVAL / crossing) {
        return false
      }
      context.save()
      if (gone < 1) {
        if (flight.animate) {
          comet(context, flight.leaves, flight.arrives, from, to, ease(gone), gone, glowing)
          if (gone < SPARK) {
            spark(context, flight.leaves, from, gone / SPARK)
          }
        } else {
          /* For a reader who asked for less motion, the path lit for a moment. */
          const line = context.createLinearGradient(from.x, from.y, to.x, to.y)
          line.addColorStop(0, flight.leaves)
          line.addColorStop(1, flight.arrives)
          context.globalAlpha = 1 - gone
          context.strokeStyle = line
          context.lineWidth = 2
          trace(context, from, to)
          context.stroke()
        }
      } else if (flight.animate) {
        arrive(context, flight.arrives, to, (gone - 1) / (ARRIVAL / crossing))
      }
      context.restore()
      return true
    })
    flying = flights.length > 0 ? requestAnimationFrame(fly) : 0
  }

  return {
    look: (looks: GraphLooks): void => {
      ink = looks.ink
      glowing = isLight(looks.ink)
    },
    signal: (
      from: string,
      to: string,
      colors: { from: string; to: string } | undefined,
      animate: boolean,
    ): void => {
      if (!container.isConnected) {
        return
      }
      overlay ??= layer(container, 'signals')
      flights.push({
        animate,
        arrives: colors?.to ?? ink,
        from,
        leaves: colors?.from ?? ink,
        started: performance.now(),
        to,
      })
      if (flights.length > FLYING) {
        flights = flights.slice(-FLYING)
      }
      if (!flying) {
        flying = requestAnimationFrame(fly)
      }
    },
    stop: (): void => {
      cancelAnimationFrame(flying)
      flying = 0
      flights = []
      overlay?.remove()
      overlay = undefined
    },
  }
}

/**
 * Where the frame's own controls lie over the drawing, in the drawing's
 * pixels: its zoom buttons, and its list where it opens over the drawing.
 * Names keep clear of them, since a name under a button can be read by
 * nobody. Read from the frame the drawing is in, where there is one.
 */
export const chromeOver = (container: HTMLElement): Box[] => {
  const frame = container.closest('helix-graph, helix-headless-graph')
  const parts = frame?.shadowRoot?.querySelectorAll('[part="controls"], [part="panel"]') ?? []
  const origin = container.getBoundingClientRect()
  const boxes: Box[] = []
  for (const part of parts) {
    const at = part.getBoundingClientRect()
    if (at.width > 0 && at.height > 0) {
      boxes.push({
        bottom: at.bottom - origin.top,
        left: at.left - origin.left,
        right: at.right - origin.left,
        top: at.top - origin.top,
      })
    }
  }
  return boxes
}

/** Whether a box overlaps none of `others`. */
export const clearOf = (box: Box, others: readonly Box[]): boolean =>
  others.every(
    (other) =>
      box.right < other.left ||
      box.left > other.right ||
      box.bottom < other.top ||
      box.top > other.bottom,
  )

/**
 * Where a note's name starts, along the line: after the note, or before it
 * where after it would run under the frame's controls or off the drawing.
 * `box` gives the name's box for a start.
 */
export const nameStart = (
  at: { radius: number; x: number },
  width: number,
  box: (start: number) => Box,
  avoid: readonly Box[],
  room: number,
): number => {
  const after = at.x + at.radius + 4
  const fits = (start: number): boolean => {
    const placed = box(start)
    return placed.left >= 0 && placed.right <= room && clearOf(placed, avoid)
  }
  if (fits(after)) {
    return after
  }
  const before = at.x - at.radius - 4 - width
  return fits(before) ? before : after
}

/** A note to name over the drawing: its name, and whether it is the one the reader is on. */
export interface Named {
  id: string
  name: string
  strong: boolean
}

/**
 * **Names on a canvas of their own**, for a renderer that draws none: each
 * note given, beside it, ringed in the ground's color so it reads over the
 * links. The strong ones always, and the rest where there is room, in the
 * order given.
 */
export const namesOver = (container: HTMLElement, onScreen: OnScreen) => {
  const canvas = layer(container, 'names')
  /* The boxes the names last drawn take, which group names keep clear of. */
  let taken: Box[] = []
  return {
    /** The boxes the names last drawn take. */
    boxes: (): readonly Box[] => taken,
    draw: (looks: GraphLooks | undefined, named: readonly Named[]): void => {
      const context = looks ? fresh(canvas, container) : null
      if (!context || !looks) {
        return
      }
      /* The frame's controls first, so no name is drawn under them. */
      taken = chromeOver(container)
      for (const { id, name, strong } of named) {
        const at = onScreen(id)
        if (!at || looks.node(id).hidden) {
          continue
        }
        context.font = `${strong ? 600 : 500} ${strong ? 13 : 12}px ${looks.font}`
        const width = context.measureText(name).width
        const y = at.y + 4
        const boxAt = (start: number): Box => ({
          bottom: y + 4,
          left: start - 2,
          right: start + width + 2,
          top: y - 13,
        })
        const x = nameStart(at, width, boxAt, taken, container.clientWidth)
        const box = boxAt(x)
        if (!clearOf(box, taken) && !strong) {
          continue
        }
        taken.push(box)
        context.lineJoin = 'round'
        context.lineWidth = 3
        context.strokeStyle = looks.ground
        context.strokeText(name, x, y)
        context.fillStyle = strong ? looks.ink : looks.quiet
        context.fillText(name, x, y)
      }
    },
    stop: (): void => {
      canvas.remove()
    },
  }
}

/**
 * **Group names are drawn on a canvas of their own**, under the signals', and
 * drawn again whenever the driver says the view moved, so they follow it.
 * `avoid` says where notes' names are drawn, which a group's name keeps
 * clear of: moved a line, or left out where no line is clear.
 */
export const groupsOver = (
  container: HTMLElement,
  onScreen: OnScreen,
  avoid: () => readonly Box[] = () => [],
) => {
  let canvas: HTMLCanvasElement | undefined
  let groups: readonly GraphGroup[] = []
  let looks: GraphLooks | undefined
  const draw = (): void => {
    const context = canvas && looks ? fresh(canvas, container) : null
    if (context && looks) {
      nameGroups(context, groups, looks, onScreen, avoid())
    }
  }
  return {
    draw,
    look: (next: GraphLooks): void => {
      looks = next
      draw()
    },
    set: (next: readonly GraphGroup[]): void => {
      canvas ??= layer(container, 'groups')
      groups = next
      draw()
    },
    stop: (): void => {
      canvas?.remove()
      canvas = undefined
    },
  }
}

/** The attribute that says which gestures a renderer's container keeps from it. */
const GESTURES = 'data-helix-graph-gestures'

/**
 * The rule that gives the page its touches over every canvas a renderer made,
 * in the document or shadow root the container is in, added once there.
 * **A renderer sets `touch-action: none` on its own canvases**, which the
 * container's own `touch-action` cannot undo, since a touch takes the action
 * of the element it lands on; only a rule with `!important` outranks the
 * renderer's inline style.
 */
const touchRule = (container: HTMLElement): void => {
  const root = container.getRootNode()
  const holder = root instanceof ShadowRoot ? root : document.head
  if (!holder || holder.querySelector(`style[${GESTURES}]`)) {
    return
  }
  const style = document.createElement('style')
  style.setAttribute(GESTURES, '')
  style.textContent = `[${GESTURES}="cooperative"], [${GESTURES}="cooperative"] * { touch-action: pan-x pan-y !important; }
[${GESTURES}="off"], [${GESTURES}="off"] * { touch-action: auto !important; }`
  holder.append(style)
}

/**
 * **Held back from the renderer rather than switched off in it.** A
 * renderer's own switches turn its zoom and pan off for code as well, so the
 * frame's buttons stopped working with them. A listener on the container in
 * the capture phase runs before the renderer's, and keeps from it what the
 * page has: the plain wheel and one finger while cooperative, and every
 * gesture while a waiting surface is off, a double click among them, which
 * zooms where a renderer zooms on one. A single click still selects a note.
 */
export const gesturesHeld = (container: HTMLElement) => {
  let mode: ViewportGestureMode = 'free'
  const hold = (event: Event): void => {
    if (mode === 'free') {
      return
    }
    if (mode === 'off') {
      /* The first click of two still selects; the second, which makes it a double click, is held. */
      if (event.type === 'click' && (event as MouseEvent).detail < 2) {
        return
      }
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
  const held = ['wheel', 'touchstart', 'touchmove', 'mousedown', 'click', 'dblclick'] as const
  for (const type of held) {
    container.addEventListener(type, hold, { capture: true, passive: false })
  }
  return {
    /**
     * Which gestures the renderer takes. One finger scrolls the page past a
     * graph that shares its gestures, and every finger does past one that is
     * off.
     */
    set: (next: ViewportGestureMode): void => {
      mode = next
      if (next === 'free') {
        container.removeAttribute(GESTURES)
      } else {
        touchRule(container)
        container.setAttribute(GESTURES, next)
      }
    },
    stop: (): void => {
      for (const type of held) {
        container.removeEventListener(type, hold, { capture: true })
      }
      container.removeAttribute(GESTURES)
    },
  }
}
