import { motionPaused, reducedMotion } from '../page-motion/page-motion.js'
import { type ColorBytes, readColorAlpha } from '../read-color/read-color.js'

/** How `burstConfetti` bursts. */
export interface BurstConfettiOptions {
  /**
   * The colors of the pieces, as any CSS colors, such as `#e5677d`,
   * `var(--brand)`, or `light-dark(navy, skyblue)`, each read where the origin
   * is. Defaults to the theme's first six series colors,
   * `--helix-color-series-1` to `--helix-color-series-6`.
   */
  colors?: readonly string[] | undefined
  /** How many pieces burst. Defaults to 80, and at most 400 are drawn. */
  count?: number | undefined
}

/** One piece in flight. Lengths in CSS pixels, times in seconds, angles in radians. */
interface Piece {
  age: number
  angle: number
  back: string
  burst: Burst
  delay: number
  drag: number
  flip: number
  flipRate: number
  front: string
  height: number
  life: number
  round: boolean
  spin: number
  sway: number
  vx: number
  vy: number
  wobble: number
  wobbleRate: number
  width: number
  x: number
  y: number
}

/** One call, which resolves once its last piece is gone. */
interface Burst {
  done: () => void
  left: number
}

/** The one canvas every running burst draws on. */
interface Stage {
  canvas: HTMLCanvasElement
  context: CanvasRenderingContext2D
  height: number
  last: number | undefined
  pieces: Piece[]
  ratio: number
  width: number
}

/** How many pieces burst when the call does not say. */
const COUNT = 80

/** The most pieces one call draws, so a mistyped count cannot stall a page. */
const MOST = 400

/** Pixels a second, every second, downward. */
const GRAVITY = 900

/**
 * Used where the page has no Helix theme, or none of the colors it was given
 * can be read: six colors of one middle lightness and a moderate chroma, which
 * show on a light page and a dark one.
 */
const FALLBACK: readonly ColorBytes[] = [
  [91, 124, 250],
  [229, 103, 125],
  [242, 169, 59],
  [63, 182, 139],
  [155, 123, 240],
  [76, 184, 212],
]

/** How much darker the back of a piece is than its front. */
const BACK = 0.86

let stage: Stage | undefined

/** A number between two others. */
const between = (low: number, high: number): number => low + Math.random() * (high - low)

/** A color's front and back faces, as canvas fills. */
const faces = ([red, green, blue]: ColorBytes, alpha = 1): [string, string] => [
  `rgb(${red} ${green} ${blue} / ${alpha})`,
  `rgb(${Math.round(red * BACK)} ${Math.round(green * BACK)} ${Math.round(blue * BACK)} / ${alpha})`,
]

/**
 * Each color as front and back faces, read where the origin is.
 *
 * **A custom property comes back as the text that was written**, such as a
 * series token's `light-dark(oklch(...), oklch(...))`, which a canvas cannot
 * draw. So each color is set as the `color` of a hidden probe, which the engine
 * resolves, in the origin's color scheme and with `currentColor` as the
 * origin's color. Resolved is not converted, so `readColorAlpha` paints the
 * result and reads the pixel back.
 */
const readFaces = (origin: Element, colors: readonly string[] | undefined): [string, string][] => {
  const style = getComputedStyle(origin)
  const values =
    colors ??
    [1, 2, 3, 4, 5, 6]
      .map((step) => style.getPropertyValue(`--helix-color-series-${step}`).trim())
      .filter(Boolean)
  const read: [string, string][] = []
  if (values.length > 0) {
    const probe = document.createElement('span')
    probe.setAttribute('aria-hidden', 'true')
    probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none'
    probe.style.colorScheme = style.colorScheme
    document.body.append(probe)
    for (const value of values) {
      probe.style.color = ''
      probe.style.color = value.replace(/currentcolor/gi, style.color)
      /* A value the engine does not parse leaves the property empty. */
      if (!probe.style.color) {
        continue
      }
      const bytes = readColorAlpha(getComputedStyle(probe).color)
      if (bytes && bytes[3] > 0) {
        read.push(faces([bytes[0], bytes[1], bytes[2]], bytes[3]))
      }
    }
    probe.remove()
  }
  return read.length > 0 ? read : FALLBACK.map((bytes) => faces(bytes))
}

/** Sizes the canvas to the viewport, at the screen's density, where either changed. */
const fit = (open: Stage): void => {
  const width = open.canvas.clientWidth || innerWidth
  const height = open.canvas.clientHeight || innerHeight
  const ratio = Math.min(devicePixelRatio || 1, 3)
  if (width === open.width && height === open.height && ratio === open.ratio) {
    return
  }
  Object.assign(open, { height, ratio, width })
  open.canvas.width = Math.round(width * ratio)
  open.canvas.height = Math.round(height * ratio)
}

/**
 * The canvas, made and shown where no burst is running, or brought back to
 * the top where one is.
 *
 * **In the top layer**, as a manual popover, so a burst for an action in an
 * open modal `Dialog` is drawn over the dialog. Where popovers are not
 * supported it is fixed, and drawn over the page by its stacking order.
 */
const openStage = (): Stage | undefined => {
  if (stage) {
    if (stage.canvas.matches(':popover-open')) {
      try {
        stage.canvas.hidePopover()
        stage.canvas.showPopover()
      } catch {
        /* Still drawn where it was. */
      }
    }
    return stage
  }
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) {
    return undefined
  }
  canvas.setAttribute('aria-hidden', 'true')
  /* Every property the popover's own styles set is set again, so it is the
     whole viewport, see-through, and takes no pointer. */
  canvas.style.cssText =
    'position:fixed;inset:0;display:block;width:100%;height:100%;max-width:none;max-height:none;margin:0;padding:0;border:0;overflow:visible;background:transparent;pointer-events:none;z-index:2147483647'
  const popover = typeof canvas.showPopover === 'function'
  if (popover) {
    canvas.setAttribute('popover', 'manual')
  }
  document.body.append(canvas)
  if (popover) {
    try {
      canvas.showPopover()
    } catch {
      /* Drawn by its stacking order instead. */
    }
  }
  stage = { canvas, context, height: 0, last: undefined, pieces: [], ratio: 0, width: 0 }
  fit(stage)
  return stage
}

/** Takes the canvas away and resolves every burst still waiting. */
const closeStage = (): void => {
  const open = stage
  if (!open) {
    return
  }
  stage = undefined
  open.canvas.remove()
  for (const piece of open.pieces) {
    piece.burst.done()
  }
  open.pieces = []
}

/** Moves one piece on by `dt` seconds. */
const advance = (piece: Piece, dt: number): void => {
  piece.age += dt
  if (piece.age < piece.delay) {
    return
  }
  /* Drag as an exponential decay toward the speed gravity and drag settle on,
     so the step is the same however long the frame was. */
  const slowed = Math.exp(-piece.drag * dt)
  piece.vx *= slowed
  piece.vy = piece.vy * slowed + (GRAVITY / piece.drag) * (1 - slowed)
  piece.x += piece.vx * dt
  piece.y += piece.vy * dt
  piece.angle += piece.spin * dt
  piece.flip += piece.flipRate * dt
  piece.wobble += piece.wobbleRate * dt
}

/** Draws one piece. */
const draw = (open: Stage, piece: Piece): void => {
  const flown = piece.age - piece.delay
  if (flown < 0) {
    return
  }
  const { context, ratio } = open
  /* Fades over the last third of its life, slowly at first. */
  const left = 1 - flown / piece.life
  context.globalAlpha = left > 0.35 ? 1 : (left / 0.35) ** 1.5
  /* Turning over is a cosine scale across the piece, with the back drawn
     darker, and a sliver left at edge-on so a piece never vanishes. */
  const turned = Math.cos(piece.flip)
  const across = Math.sign(turned || 1) * Math.max(Math.abs(turned), 0.08)
  context.fillStyle = turned >= 0 ? piece.front : piece.back
  /* The sway grows as the piece slows, which is a flutter as it falls. */
  const x = piece.x + Math.sin(piece.wobble) * piece.sway * Math.min(1, flown / 0.4)
  const cos = Math.cos(piece.angle)
  const sin = Math.sin(piece.angle)
  context.setTransform(
    ratio * cos,
    ratio * sin,
    -ratio * sin * across,
    ratio * cos * across,
    ratio * x,
    ratio * piece.y,
  )
  if (piece.round) {
    context.beginPath()
    context.arc(0, 0, piece.width / 2, 0, Math.PI * 2)
    context.fill()
  } else {
    context.fillRect(-piece.width / 2, -piece.height / 2, piece.width, piece.height)
  }
}

/** One frame for every piece on the canvas. */
const tick = (now: number): void => {
  const open = stage
  if (!open) {
    return
  }
  /* A press on `Motion Toggle` mid-burst ends it. */
  if (motionPaused()) {
    closeStage()
    return
  }
  const dt =
    open.last === undefined ? 1 / 60 : Math.min(Math.max(now - open.last, 0) / 1000, 1 / 30)
  open.last = now
  fit(open)
  const { canvas, context } = open
  context.setTransform(1, 0, 0, 1, 0, 0)
  context.clearRect(0, 0, canvas.width, canvas.height)
  let kept = 0
  for (const piece of open.pieces) {
    advance(piece, dt)
    if (piece.age >= piece.delay + piece.life) {
      piece.burst.left -= 1
      if (piece.burst.left === 0) {
        piece.burst.done()
      }
      continue
    }
    draw(open, piece)
    open.pieces[kept] = piece
    kept += 1
  }
  open.pieces.length = kept
  context.globalAlpha = 1
  if (kept === 0) {
    closeStage()
    return
  }
  requestAnimationFrame(tick)
}

/** The pieces of one burst from a box, in the given colors. */
const makePieces = (
  box: DOMRect,
  count: number,
  colors: readonly [string, string][],
  burst: Burst,
): Piece[] => {
  const centerX = box.left + box.width / 2
  const centerY = box.top + box.height * 0.3
  const spreadX = Math.min(box.width, 160) * 0.3
  const spreadY = Math.min(box.height, 48) * 0.15
  /* Up, and out to either side by at most about fifty degrees. */
  const cone = 0.88
  const offset = Math.floor(Math.random() * colors.length)
  const pieces: Piece[] = []
  for (let index = 0; index < count; index++) {
    const lean = between(-1, 1)
    const heading = -Math.PI / 2 + lean * cone
    /* Slower toward the sides, so the burst opens as a dome. */
    const speed = between(680, 1150) * (1 - 0.22 * Math.abs(lean))
    const round = Math.random() < 0.2
    const width = round ? between(4.5, 6.5) : between(6, 10)
    const [front, back] = colors[(index + offset) % colors.length] ?? ['gray', 'gray']
    pieces.push({
      age: 0,
      angle: between(0, Math.PI * 2),
      back,
      burst,
      delay: between(0, 0.08),
      drag: between(2.7, 3.7),
      flip: between(0, Math.PI * 2),
      flipRate: between(7, 15) * (Math.random() < 0.5 ? -1 : 1),
      front,
      height: round ? width : between(3.5, 5.5),
      life: between(1.1, 1.45),
      round,
      spin: between(1, 5) * (Math.random() < 0.5 ? -1 : 1),
      sway: between(3, 9),
      vx: Math.cos(heading) * speed,
      vy: Math.sin(heading) * speed,
      width,
      wobble: between(0, Math.PI * 2),
      wobbleRate: between(5, 10),
      x: centerX + between(-1, 1) * spreadX,
      y: centerY + between(-1, 1) * spreadY,
    })
  }
  return pieces
}

/**
 * Bursts confetti up and out of an element, once, for an action that has
 * finished, such as a reader completing onboarding or publishing a page.
 * Resolves once the last piece is gone, about a second and a half later.
 *
 * ```js
 * import { burstConfetti } from '@fusion.dev/helix-core'
 *
 * await publish()
 * burstConfetti(document.querySelector('#publish'))
 * ```
 *
 * **Call it once the action is done.** The press that starts an action can
 * still fail. The pieces fly up from the element, fall, turn, and fade. A
 * second burst while one runs is drawn with it.
 *
 * **Drawn on one canvas over the whole viewport**, which takes no pointer, is
 * hidden from screen readers, and is removed when the last piece is gone. It
 * sits in the top layer where the browser has one, so a burst from inside an
 * open modal `Dialog` is drawn over the dialog.
 *
 * **A burst is decoration**, so say that the action is done in words as well.
 * Nothing is drawn, and the promise resolves at once, for a reader who asked
 * for less motion, while the page's motion is paused, on a server, and while
 * the page is hidden. Pausing the page's motion mid-burst ends it.
 */
export const burstConfetti = (origin: Element, options: BurstConfettiOptions = {}): Promise<void> =>
  new Promise<void>((resolve) => {
    if (
      typeof document === 'undefined' ||
      document.hidden ||
      !origin.isConnected ||
      reducedMotion() ||
      motionPaused()
    ) {
      resolve()
      return
    }
    const asked = Math.round(options.count ?? COUNT)
    const count = Number.isFinite(asked) ? Math.min(Math.max(asked, 0), MOST) : COUNT
    if (count === 0) {
      resolve()
      return
    }
    const colors = readFaces(origin, options.colors)
    const open = openStage()
    if (!open) {
      resolve()
      return
    }
    const burst: Burst = { done: resolve, left: count }
    open.pieces.push(...makePieces(origin.getBoundingClientRect(), count, colors, burst))
    if (open.pieces.length === count) {
      open.last = undefined
      requestAnimationFrame(tick)
    }
  })
