import type { ViewportGestureMode } from '@fusion.dev/helix-core'
import type { GraphGroup } from '../connect-graph/connect-graph.js'
import { type GraphLooks, mixRgb } from '../connect-graph/looks.js'

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

/** How long a note brightens when a signal reaches it, in milliseconds. */
const ARRIVAL = 380

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
  const [red = 128, green = 128, blue = 128] = color.match(/[\d.]+/g)?.map(Number) ?? []
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

/** How far behind its head a pulse's tail reaches, in pixels. */
const TAIL = 110

/**
 * A signal on its way: a fine pulse of light running along the link, its
 * tail fading into the line it came along, a small bright point at its head,
 * and the link itself lit faintly while it passes, as light runs along a
 * fiber. Quiet on purpose: on a busy feed there are dozens at once.
 */
const pulse = (
  context: CanvasRenderingContext2D,
  leaves: string,
  arrives: string,
  from: { x: number; y: number },
  to: { x: number; y: number },
  along: number,
  through: number,
  glowing: boolean,
): void => {
  /* Added light reads fainter than paint at the same strength, so on a dark
     ground the pulse carries a little more of it. */
  const strength = glowing ? 1.3 : 1
  /* The color where the head is, and where the tail ends: the signal turns
     from one note's color to the other's as it crosses. */
  const color = mixRgb(leaves, arrives, along)
  const length = Math.hypot(to.x - from.x, to.y - from.y) || 1
  const head = { x: from.x + (to.x - from.x) * along, y: from.y + (to.y - from.y) * along }
  const behind = Math.max(along - TAIL / length, 0)
  const tail = { x: from.x + (to.x - from.x) * behind, y: from.y + (to.y - from.y) * behind }
  context.lineCap = 'round'
  /* The link lit while the pulse is on it, rising and falling with it. */
  context.globalAlpha = 0.14 * Math.sin(Math.PI * through)
  const line = context.createLinearGradient(from.x, from.y, to.x, to.y)
  line.addColorStop(0, leaves)
  line.addColorStop(1, arrives)
  context.strokeStyle = line
  context.lineWidth = 1
  context.beginPath()
  context.moveTo(from.x, from.y)
  context.lineTo(to.x, to.y)
  context.stroke()
  /* The tail, fading in toward the head, soft and then fine. */
  const fade = context.createLinearGradient(tail.x, tail.y, head.x, head.y)
  const back = mixRgb(leaves, arrives, behind)
  fade.addColorStop(0, withAlpha(back, 0))
  fade.addColorStop(0.6, withAlpha(mixRgb(back, color, 0.6), 0.25))
  fade.addColorStop(1, withAlpha(color, 0.95))
  context.strokeStyle = fade
  context.shadowColor = color
  context.shadowBlur = 8
  context.globalAlpha = Math.min(0.35 * strength, 1)
  context.lineWidth = 3.5
  context.beginPath()
  context.moveTo(tail.x, tail.y)
  context.lineTo(head.x, head.y)
  context.stroke()
  context.shadowBlur = 0
  context.globalAlpha = 1
  context.lineWidth = 1.4 * strength
  context.stroke()
  /* The head: a point of white light in the signal's color. */
  const reach = 5 * strength
  const light = context.createRadialGradient(head.x, head.y, 0, head.x, head.y, reach)
  light.addColorStop(0, 'rgba(255, 255, 255, 0.9)')
  light.addColorStop(0.4, withAlpha(color, 0.75))
  light.addColorStop(1, withAlpha(color, 0))
  context.fillStyle = light
  context.beginPath()
  context.arc(head.x, head.y, reach, 0, Math.PI * 2)
  context.fill()
}

/** A signal arriving: the note it reached brightening for a moment, and nothing more. */
const arrive = (
  context: CanvasRenderingContext2D,
  color: string,
  at: { radius: number; x: number; y: number },
  gone: number,
): void => {
  const reach = at.radius + 6
  const glow = context.createRadialGradient(at.x, at.y, at.radius * 0.4, at.x, at.y, reach)
  glow.addColorStop(0, withAlpha(color, 0.5 * (1 - gone) ** 2))
  glow.addColorStop(1, withAlpha(color, 0))
  context.fillStyle = glow
  context.beginPath()
  context.arc(at.x, at.y, reach, 0, Math.PI * 2)
  context.fill()
}

/** Whether an `rgb()` color is light, which a light ink says the ground is dark. */
const isLight = (color: string): boolean => {
  const [red = 0, green = 0, blue = 0] = color.match(/[\d.]+/g)?.map(Number) ?? []
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
): void => {
  context.font = `600 13px ${looks.font}`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.lineJoin = 'round'
  context.lineWidth = 4
  for (const group of groups) {
    let x = 0
    let y = 0
    let count = 0
    const points: { x: number; y: number }[] = []
    for (const id of group.ids) {
      const point = at(id)
      if (point) {
        x += point.x
        y += point.y
        count += 1
        points.push(point)
      }
    }
    if (count < 2) {
      continue
    }
    x /= count
    y /= count
    const spread =
      points.reduce((sum, point) => sum + Math.hypot(point.x - x, point.y - y), 0) / count
    if (spread < 12) {
      continue
    }
    context.globalAlpha = group.faded ? 0.3 : 0.85
    context.strokeStyle = looks.ground
    context.strokeText(group.name, x, y)
    context.fillStyle = mixRgb(group.color, looks.ink, 0.35)
    context.fillText(group.name, x, y)
  }
  context.globalAlpha = 1
}

/** A canvas laid over the renderer's, taking no pointer and said to no one. */
const layer = (container: HTMLElement, kind: 'groups' | 'signals'): HTMLCanvasElement => {
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

/** Sizes a layer to its box at the screen's density, and clears it. */
const fresh = (
  canvas: HTMLCanvasElement,
  container: HTMLElement,
): CanvasRenderingContext2D | null => {
  const context = canvas.getContext('2d')
  if (!context) {
    return null
  }
  const ratio = window.devicePixelRatio || 1
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
    const context = overlay ? fresh(overlay, container) : null
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
          pulse(context, flight.leaves, flight.arrives, from, to, ease(gone), gone, glowing)
        } else {
          /* For a reader who asked for less motion, the link lit for a moment. */
          const line = context.createLinearGradient(from.x, from.y, to.x, to.y)
          line.addColorStop(0, flight.leaves)
          line.addColorStop(1, flight.arrives)
          context.globalAlpha = 1 - gone
          context.strokeStyle = line
          context.lineWidth = 2
          context.beginPath()
          context.moveTo(from.x, from.y)
          context.lineTo(to.x, to.y)
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
 * **Group names are drawn on a canvas of their own**, under the signals', and
 * drawn again whenever the driver says the view moved, so they follow it.
 */
export const groupsOver = (container: HTMLElement, onScreen: OnScreen) => {
  let canvas: HTMLCanvasElement | undefined
  let groups: readonly GraphGroup[] = []
  let looks: GraphLooks | undefined
  const draw = (): void => {
    const context = canvas && looks ? fresh(canvas, container) : null
    if (context && looks) {
      nameGroups(context, groups, looks, onScreen)
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

/**
 * **Held back from the renderer rather than switched off in it.** A
 * renderer's own switches turn its zoom and pan off for code as well, so the
 * frame's buttons stopped working with them. A listener on the container in
 * the capture phase runs before the renderer's, and keeps from it what the
 * page has: the plain wheel and one finger while cooperative, and every
 * gesture while a waiting surface is off.
 */
export const gesturesHeld = (container: HTMLElement) => {
  let mode: ViewportGestureMode = 'free'
  const touchAction = container.style.touchAction
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
    /**
     * Which gestures the renderer takes. One finger scrolls the page past a
     * graph that shares its gestures, and every finger does past one that is
     * off.
     */
    set: (next: ViewportGestureMode): void => {
      mode = next
      container.style.touchAction =
        next === 'free' ? touchAction : next === 'cooperative' ? 'pan-x pan-y' : 'auto'
    },
    stop: (): void => {
      for (const type of held) {
        container.removeEventListener(type, hold, { capture: true })
      }
      container.style.touchAction = touchAction
    },
  }
}
