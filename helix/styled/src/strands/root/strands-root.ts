import {
  customElement,
  drawsInSoftware,
  elementById,
  HelixElement,
  HelixStrandsFallbackEvent,
  MAX_FRAME_STEP,
  PaintGateController,
  readColor,
} from '@fusion.dev/helix-core'
import type { CSSResultGroup, PropertyValues, TemplateResult } from 'lit'
import { html } from 'lit'
import { property } from 'lit/decorators.js'
import { paletteOf, RESTING_PALETTE, type StrandsPalette } from '../palette.js'
import {
  arcLengths,
  boxPath,
  lookup,
  MAX_POINTS,
  type PathPoint,
  type PlacedStop,
  pagePath,
  type StrandsVariant,
  visibleRange,
} from '../path.js'
import { DUST, MAX_DUST, MAX_STRANDS, MIN_STRANDS, StrandsRenderer } from '../renderer.js'
import { styles } from './strands-root.css.js'

/** The widest either edge of the drawing buffer may get, in device pixels. Aura's ceiling, for Aura's reason. */
const MAX_CANVAS_EDGE = 4096

/**
 * The most device pixels the drawing buffer may hold, at 2048 squared.
 *
 * Every pixel is blended once per strand that crosses it and then bloomed, so
 * this is the fill rate: a full-screen ribbon on a 6K display would otherwise
 * be four times the work for strands nobody can resolve at that density.
 */
const MAX_CANVAS_PIXELS = 4_194_304

/** How long the opening frame will wait for the box to stop changing, in ms. Aura's settle. */
const OPENING_PATIENCE = 500

/**
 * How quickly the drawn position catches the scroll position in `travel`, as a
 * time constant in seconds.
 *
 * A wheel moves the page in steps, and a ribbon pinned to each step jumps with
 * it. Eased over about a tenth of a second the steps join into one glide, and
 * the ribbon still arrives before a reader notices it was behind.
 */
const TRAVEL_EASE = 0.09

/**
 * How fast a `speed` of `1` moves, against the time the motion was written
 * in. A slow drift reads as depth; at the written pace the strands' crossings
 * flicker past before a reader can follow one.
 */
const PACE = 0.25

/**
 * @summary A ribbon of fine strands of light, drawn in your theme's colors, in its own box or down a whole page.
 *
 * @description
 * Hundreds of thin strands are drawn as one ribbon, and the light they add
 * together is bloomed, so where they converge the ribbon burns hot. The ribbon
 * moves on its own all the time: it sways and breathes, its strands wave and
 * roll over one another, and light runs along them.
 *
 * Its palette comes from the tokens. The strands are `--helix-color-primary`,
 * a few are `--helix-color-accent` for depth, and the page they light is
 * `--helix-color-background`. On a light page the light becomes ink, because
 * light added to near-white cannot be seen.
 *
 * **Three forms, set with `variant`.** `bend` turns bright strands through one tight point, with its
 * arms opening to the right. `ribbon`, the default, is a broad, soft ribbon in
 * long curves. `waves` is sharp strands crossing the full width.
 *
 * **In its own box, by default.** The element fills the box it is given, the
 * way an image does, and `at` places the bend's apex or the ribbon's axis across
 * it. Content placed inside sits over the ribbon, in the `content` part.
 *
 * **Down the whole page, with `travel`.** The element fixes itself behind the
 * page, on `--helix-layer-beneath`, and lays one ribbon from the top of the page to the
 * bottom, so scrolling travels along it. Put `helix-strands-stop` elements
 * inside to pin a form to a section: each names an element with `for` and says
 * which form the ribbon takes there. Between stops the ribbon fills the gap in
 * its own `variant`, and between two waves less than a screen and a half
 * apart it turns off screen so each wave reads alone. Set `z-index` on the
 * element to move it.
 *
 * The ribbon stops moving in these cases:
 * - `prefers-reduced-motion` is set. The element shows one still frame, and in
 *   `travel` still follows the scroll, without easing.
 * - The element is off screen or in a background tab.
 *
 * It shows a gradient from the same tokens in these cases, and matches
 * `:state(fallback)` and sends `helix-strands-fallback` with the reason:
 * - The renderer draws on the CPU, such as a headless browser or a machine with
 *   no usable GPU.
 * - There is no WebGL, or the browser took the drawing context back.
 *
 * Strands is styled only and has behavior, as `Aura` does: its behavior is
 * drawing to a canvas, so there is no structure for a headless version to hold.
 *
 * @since 0.147.0
 * @status experimental
 * @category media
 * @aliases Ribbon, Filaments, Light strands, Fibers
 * @documentation https://fusion.dev/helix/components/strands
 *
 * @slot - Content drawn over the ribbon, such as a heading, and the `helix-strands-stop` elements that pin its forms in `travel`.
 *
 * @event {HelixStrandsFallbackEvent} helix-strands-fallback - Fired each time the element stops drawing its ribbon and shows its gradient, with the reason.
 *
 * @csspart canvas - The surface the ribbon draws into.
 * @csspart content - The box over the ribbon that holds the content. It covers the element.
 *
 * @cssproperty --strands-glow - The color of most strands. Defaults to `--helix-color-primary`.
 * @cssproperty --strands-ground - The page the light is added to. Defaults to `--helix-color-background`.
 * @cssproperty --strands-peak - The hottest strands, and on a light page the ink the light darkens toward. Defaults to `--helix-color-primary-hover` on a dark page and `--helix-color-primary-active` on a light one.
 * @cssproperty --strands-tint - The color of a few strands, for depth. Defaults to `--helix-color-accent`, which is the primary itself unless the theme relates an accent to the brand, as `accent: { from: 'brand', rotate: 40 }` does.
 *
 * @cssstate fallback - The element shows its gradient: the renderer draws on the CPU, there is no WebGL, or the browser took the context back. Cleared once the ribbon draws again.
 */
@customElement('helix-strands')
export class HelixStrands extends HelixElement {
  static override styles: CSSResultGroup = styles

  /**
   * Where the form sits across the box, as a share of the width: the bend's
   * apex or the ribbon's axis. `0` is the left edge and `1` the right. A wave
   * crosses the whole width and does not read it. Unset, a bend's apex sits at `0.5`
   * and a ribbon runs down the middle.
   *
   * **A share rather than a length**, so the ribbon keeps its place when the
   * box changes shape. Read inside a box only; in `travel` each stop has its
   * own.
   */
  @property({ type: Number })
  at?: number

  /**
   * How much the glow around the strands adds, as a multiplier. `0` draws the
   * strands alone, crisp and dimmer, and `1` is the default glow.
   */
  @property({ type: Number })
  bloom = 1

  /**
   * How far apart the brightest and dimmest strands are, from `0`, most of
   * them alike, to `1`, a few burning bright over many faint ones. Clamped to
   * that range. The ribbon as a whole keeps its strength.
   */
  @property({ type: Number })
  contrast = 1

  /**
   * How many strands the ribbon has, from `0`, sixty, to `1`, three hundred and
   * forty. Clamped to that range.
   */
  @property({ type: Number })
  density = 0.8

  /**
   * How much the ribbon's depth shows, from `0`, flat, to `1`. Clamped to that
   * range. The strands at the front of the ribbon's roll are drawn thicker,
   * brighter, and further from its axis, and those at the back thinner, dimmer,
   * and out of focus.
   */
  @property({ type: Number })
  depth = 1

  /**
   * How differently each strand moves, from `0`, the whole ribbon rolling and
   * waving as one, to `1`, each strand at its own pace and angle, crossing
   * over the others. Clamped to that range.
   */
  @property({ type: Number })
  drift = 1

  /**
   * How many specks of dust drift around the strands, as a multiplier: `0`
   * draws none, `1` six hundred, and `4`, the most, two thousand four
   * hundred. They gather where the ribbon is brightest.
   */
  @property({ type: Number })
  dust = 1

  /** Overall brightness, as a multiplier on the light. */
  @property({ type: Number })
  gain = 1

  /**
   * The share of strands drawn out of focus where the ribbon is wide, from `0`,
   * every strand sharp, to `1`, every one soft. Clamped to that range. A tight
   * form, such as a bend's apex or a wave, stays sharp whatever this says.
   */
  @property({ type: Number })
  softness = 0

  /** How fast the ribbon moves, as a multiplier on time. `0` holds it still. */
  @property({ type: Number })
  speed = 1

  /** How wide the ribbon is, as a multiplier on each form's own width. */
  @property({ type: Number })
  spread = 1

  /**
   * Whether the ribbon is laid down the whole page, so scrolling travels along
   * it.
   *
   * Reflected because the stylesheet selects on it: in `travel` the host fixes
   * itself to the viewport, behind the page.
   */
  @property({ reflect: true, type: Boolean })
  travel = false

  /**
   * The form the ribbon takes. When it is not set, the form is `ribbon`. In
   * `travel`, the form of every stretch no stop claims.
   */
  @property()
  variant?: StrandsVariant

  /** The colors, resolved from what the canvas carries. Aura's approach, in `readPalette`. */
  private palette: StrandsPalette = { ...RESTING_PALETTE }

  /** The canvas's live computed style, and the five colors it last carried. */
  private carried: { canvas: HTMLCanvasElement; style: CSSStyleDeclaration; text: string } | null =
    null

  /** Why the gradient shows, while it does, or `undefined` while the ribbon draws. */
  private fallback: HelixStrandsFallbackEvent['detail']['reason'] | undefined

  /** Why the last `build` drew nothing, for the fallback it leads to. */
  private refused: HelixStrandsFallbackEvent['detail']['reason'] = 'unavailable'

  private canvas: HTMLCanvasElement | null = null
  private gl: WebGL2RenderingContext | null = null
  private renderer: StrandsRenderer | null = null

  /** The pending context release, or `0`. Canceled by a reconnection. */
  private release = 0

  /** What every context is asked for, the same as Aura's and the probe's. */
  private static readonly CONTEXT: WebGLContextAttributes = {
    alpha: true,
    antialias: false,
    depth: false,
    powerPreference: 'low-power',
    stencil: false,
  }

  /** Seconds of motion so far, accumulated so a paused tab resumes where it was. */
  private elapsed = 0

  /** The drawing buffer, in device pixels, and the ratio it was sized at. */
  private width = 0
  private height = 0
  private dpr = 1

  /** The element's box, in CSS pixels, from the last measurement. */
  private box = { height: 1, width: 1 }

  /** The path, padded to the shader's array, and how many points are in use. */
  private readonly points = new Float32Array(MAX_POINTS * 4)
  private count = 0

  /** How far along the path each point is, in pixels, four to a slot as the shader reads them. */
  private lengths = new Float32Array(MAX_POINTS)

  /** In `travel`, the path's `y` at even steps of its parameter. */
  private table: Float32Array = new Float32Array(1)

  /** In `travel`, the scroll position the ribbon is drawn at, easing toward the page's. */
  private offset = 0

  /** Whether the opening frame has been drawn. Aura's settle: see `open`. */
  private opened = false
  private opening = 0
  private openBy = 0

  /** A layout booked for the next frame, so a burst of changes lays out once. */
  private laying = 0

  /** In `travel`, what tells the element that the page or its stops moved. */
  private pageObserver: ResizeObserver | null = null
  private stopObserver: MutationObserver | null = null

  private readonly gate = new PaintGateController(this, {
    canRun: () => !!this.gl && !this.gl.isContextLost() && this.width > 0 && this.opened,
    onFrame: (delta) => {
      this.advance(delta)
    },
    onMotion: (reduced) => {
      if (reduced) {
        this.paintOnce()
      }
    },
    onResize: () => {
      this.resized()
    },
  })

  protected override render(): TemplateResult {
    /* `aria-hidden` on the canvas rather than on the host, as on Aura: a
       consumer may label the region this sits behind. */
    return html`<canvas part="canvas" aria-hidden="true"></canvas>
      <div part="content"><slot></slot></div>`
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.start()
  }

  protected override updated(changed: PropertyValues): void {
    if (changed.has('travel') && this.hasUpdated && this.canvas) {
      this.watchPage(this.travel)
    }
    if (changed.has('variant') || changed.has('at') || changed.has('travel')) {
      this.layout()
    }
    this.paintOnce()
  }

  override connectedCallback(): void {
    super.connectedCallback()
    if (this.release) {
      clearTimeout(this.release)
      this.release = 0
    }
    if (this.hasUpdated) {
      this.start()
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    if (this.opening) {
      cancelAnimationFrame(this.opening)
      this.opening = 0
      this.openBy = 0
    }
    if (this.laying) {
      cancelAnimationFrame(this.laying)
      this.laying = 0
    }
    this.canvas?.removeEventListener('webglcontextlost', this.handleLost)
    this.canvas?.removeEventListener('webglcontextrestored', this.handleRestored)
    this.canvas?.removeEventListener('transitionend', this.handleRestyle)
    this.watchPage(false)
    /* Deferred by a task and canceled by a reconnection, so a framework moving
       the element costs no GL work. Aura's `disconnectedCallback` measures it. */
    this.release = window.setTimeout(this.drop, 0)
  }

  /** Everything the canvas needs, from either lifecycle. Aura's `start`, line for line in intent. */
  private start(): void {
    if (!this.isConnected) {
      return
    }
    if (!this.renderRoot.querySelector('canvas')) {
      return
    }
    if (this.renderer && this.gl?.isContextLost()) {
      this.renderer = null
      this.gl = null
    }
    if (!this.renderer && !this.gl?.isContextLost() && !this.build()) {
      this.fallBack(this.refused)
      return
    }
    this.canvas?.addEventListener('webglcontextlost', this.handleLost)
    this.canvas?.addEventListener('webglcontextrestored', this.handleRestored)
    this.canvas?.addEventListener('transitionend', this.handleRestyle)
    this.gate.watch()
    this.watchPage(this.travel)
    if (this.measure() || (this.width && !this.opened)) {
      this.open()
    }
  }

  /**
   * The context and the pipeline, from whatever canvas can still give one. A
   * spent canvas is replaced rather than re-asked, for the reason Aura's
   * `build` records.
   */
  private build(): boolean {
    let canvas = this.renderRoot.querySelector('canvas')
    if (!canvas) {
      return false
    }
    if (drawsInSoftware(HelixStrands.CONTEXT)) {
      this.refused = 'software'
      return false
    }
    this.refused = 'unavailable'
    let gl = canvas.getContext('webgl2', HelixStrands.CONTEXT)
    if (gl?.isContextLost()) {
      const fresh = document.createElement('canvas')
      fresh.setAttribute('part', 'canvas')
      fresh.setAttribute('aria-hidden', 'true')
      canvas.replaceWith(fresh)
      canvas = fresh
      this.width = 0
      this.height = 0
      gl = canvas.getContext('webgl2', HelixStrands.CONTEXT)
    }
    this.canvas = canvas
    this.gl = gl
    if (!gl || gl.isContextLost()) {
      return false
    }
    return this.prepare()
  }

  /** The pipeline on the context already held, which a restored context comes back to alone. */
  private prepare(): boolean {
    const gl = this.gl
    if (!gl) {
      return false
    }
    this.renderer = StrandsRenderer.create(gl)
    if (!this.renderer) {
      return false
    }
    this.canvas?.toggleAttribute('hidden', false)
    this.fallback = undefined
    this.toggleState('fallback', false)
    return true
  }

  /** Gives the context back, once nothing has claimed the element again. Aura's `drop`. */
  private readonly drop = (): void => {
    this.release = 0
    this.renderer?.dispose()
    this.gl?.getExtension('WEBGL_lose_context')?.loseContext()
    this.renderer = null
    this.gl = null
  }

  /** Stops for a context the browser took, hides the canvas, and asks for it back. */
  private readonly handleLost = (event: Event): void => {
    event.preventDefault()
    this.gate.stop()
    if (this.opening) {
      cancelAnimationFrame(this.opening)
      this.opening = 0
    }
    this.renderer = null
    this.canvas?.toggleAttribute('hidden', true)
    this.fallBack('lost')
  }

  /** Draws again on the context the browser gave back. */
  private readonly handleRestored = (): void => {
    if (!this.prepare()) {
      return
    }
    this.width = 0
    this.height = 0
    this.measure()
    if (this.opened) {
      this.paint()
      this.gate.play()
    } else if (this.width) {
      this.open()
    }
  }

  /** Shows the gradient, and says so once each time it starts to. */
  private fallBack(reason: HelixStrandsFallbackEvent['detail']['reason']): void {
    if (this.fallback !== undefined) {
      return
    }
    this.fallback = reason
    this.toggleState('fallback', true)
    this.dispatchEvent(new HelixStrandsFallbackEvent({ reason }))
  }

  /** The colors, converted only when the text the canvas carries moved. */
  private readPalette(): void {
    const canvas = this.canvas
    if (!canvas) {
      return
    }
    if (this.carried?.canvas !== canvas) {
      this.carried = { canvas, style: getComputedStyle(canvas), text: '' }
    }
    const { style } = this.carried
    const text = `${style.color} ${style.textDecorationColor} ${style.outlineColor} ${style.columnRuleColor} ${style.caretColor}`
    if (text !== this.carried.text) {
      this.carried.text = text
      this.palette = paletteOf(style, readColor)
    }
  }

  /** One frame for a stopped loop, once a color the canvas carries has moved. */
  private readonly handleRestyle = (): void => {
    this.paintOnce()
  }

  /**
   * Re-reads the box and resizes the drawing buffer to match. Called from the
   * gate's observer, never per frame, and an empty box is layout that has not
   * happened: Aura's `measure` records both.
   *
   * **A ratio under Aura's**, 0.75 of the device's up to two, because a strand
   * is a line rather than a field and the bloom hides the rest; the buffer's
   * edge and pixel ceilings then apply as they do there.
   */
  private measure(): boolean {
    const canvas = this.canvas
    const renderer = this.renderer
    if (!canvas || !renderer) {
      return false
    }
    const rect = this.getBoundingClientRect()
    if (rect.width < 1 || rect.height < 1) {
      return false
    }
    this.box = { height: rect.height, width: rect.width }
    let dpr = Math.min(window.devicePixelRatio || 1, 2) * 0.75
    const edge = Math.max(rect.width, rect.height) * dpr
    if (edge > MAX_CANVAS_EDGE) {
      dpr *= MAX_CANVAS_EDGE / edge
    }
    const pixels = rect.width * rect.height * dpr * dpr
    if (pixels > MAX_CANVAS_PIXELS) {
      dpr *= Math.sqrt(MAX_CANVAS_PIXELS / pixels)
    }
    const width = Math.round(rect.width * dpr)
    const height = Math.round(rect.height * dpr)
    if (width === this.width && height === this.height) {
      return false
    }
    this.width = width
    this.height = height
    this.dpr = dpr
    canvas.width = width
    canvas.height = height
    if (!renderer.resize(width, height)) {
      this.renderer = null
      this.fallBack('unavailable')
      return false
    }
    this.layout()
    return true
  }

  /**
   * Lays the path out again: inside the box, or down the page from the stops.
   *
   * Cheap, a few dozen points and a table of a few hundred numbers, so it runs
   * on any change that could move the path rather than working out which did.
   */
  private layout(): void {
    let path: PathPoint[]
    const variant = this.variant ?? 'ribbon'
    if (this.travel) {
      path = pagePath(
        this.placedStops(),
        variant,
        this.box.width,
        this.box.height,
        document.documentElement.scrollHeight,
      )
      this.table = lookup(path)
    } else {
      path = boxPath(variant, this.at, this.box.height, this.box.width)
    }
    this.points.fill(0)
    path.forEach((point, i) => {
      this.points.set(point, i * 4)
    })
    this.count = path.length
    this.lengths.fill(0)
    this.lengths.set(arcLengths(path, this.box.width))
  }

  /** The stops inside, each with its target's place on the page. A stop naming nothing is skipped. */
  private placedStops(): PlacedStop[] {
    const placed: PlacedStop[] = []
    const scroll = window.scrollY
    for (const stop of this.querySelectorAll(':scope > helix-strands-stop')) {
      const name = stop.getAttribute('for')
      const target = name ? elementById(stop, name) : null
      if (!target) {
        continue
      }
      const rect = target.getBoundingClientRect()
      const at = Number.parseFloat(stop.getAttribute('at') ?? '')
      const variant = stop.getAttribute('variant')
      placed.push({
        at: Number.isFinite(at) ? at : undefined,
        height: rect.height,
        top: rect.top + scroll,
        variant: variant === 'bend' || variant === 'waves' ? variant : 'ribbon',
      })
    }
    return placed
  }

  /**
   * In `travel`, follows the page: the scroll it travels along, the page's
   * height and its sections moving, and the stops being changed.
   */
  private watchPage(on: boolean): void {
    window.removeEventListener('scroll', this.handleScroll)
    this.pageObserver?.disconnect()
    this.stopObserver?.disconnect()
    this.pageObserver = null
    this.stopObserver = null
    if (!on) {
      return
    }
    this.offset = window.scrollY
    window.addEventListener('scroll', this.handleScroll, { passive: true })
    this.pageObserver = new ResizeObserver(this.relayout)
    this.pageObserver.observe(document.documentElement)
    this.stopObserver = new MutationObserver(this.relayout)
    this.stopObserver.observe(this, {
      attributeFilter: ['at', 'for', 'variant'],
      attributes: true,
      childList: true,
      subtree: true,
    })
  }

  /** A layout on the next frame, once, however many changes asked for one. */
  private readonly relayout = (): void => {
    if (this.laying) {
      return
    }
    this.laying = requestAnimationFrame(() => {
      this.laying = 0
      this.layout()
      this.paintOnce()
    })
  }

  /**
   * The page scrolled. A running loop eases toward it on its own; a stopped
   * one, for a reader who asked for no motion, jumps there and paints once.
   */
  private readonly handleScroll = (): void => {
    if (!this.gate.running) {
      this.offset = window.scrollY
      this.paintOnce()
    }
  }

  private paint(): void {
    const { renderer } = this
    if (!renderer || !this.width) {
      return
    }
    this.readPalette()
    const view: readonly [number, number] = [this.box.width, this.box.height]
    const range = this.travel
      ? visibleRange(this.table, this.offset - view[1] * 0.4, this.offset + view[1] * 1.4)
      : ([0, 1] as const)
    const density = Math.min(1, Math.max(0, this.density))
    const share = (value: number): number => Math.min(1, Math.max(0, value))
    renderer.render(
      {
        bloom: Math.max(0, this.bloom),
        contrast: share(this.contrast),
        count: this.count,
        depth: share(this.depth),
        dpr: this.dpr,
        drift: share(this.drift),
        dust: Math.round(Math.min(MAX_DUST, Math.max(0, this.dust * DUST))),
        gain: Math.max(0, this.gain),
        lengths: this.lengths,
        points: this.points,
        range,
        scroll: this.travel ? this.offset : 0,
        softness: Math.min(1, Math.max(0, this.softness)),
        spread: Math.max(0, this.spread),
        strands: Math.round(MIN_STRANDS + (MAX_STRANDS - MIN_STRANDS) * density),
        time: this.elapsed,
        view,
      },
      this.palette,
    )
  }

  /** The box changed: measure, and repaint at once, because resizing cleared the buffer. */
  private resized(): void {
    if (!this.measure()) {
      this.paintOnce()
      return
    }
    if (this.opened) {
      this.paint()
      this.gate.play()
      return
    }
    this.open()
  }

  /** The opening frame, one animation frame after the box last changed. Aura's `open`. */
  private open(): void {
    if (this.opening) {
      cancelAnimationFrame(this.opening)
      this.opening = 0
    }
    if (this.openBy === 0) {
      this.openBy = performance.now() + OPENING_PATIENCE
    }
    const draw = (): void => {
      this.opening = 0
      this.opened = true
      this.paint()
      this.gate.play()
    }
    if (performance.now() >= this.openBy) {
      draw()
      return
    }
    this.opening = requestAnimationFrame(draw)
  }

  /** One frame, now, for a change that has to show while the loop is stopped. */
  private paintOnce(): void {
    if (this.gate.running || !this.opened || !this.isConnected) {
      return
    }
    this.paint()
  }

  /**
   * The shortest gap between two frames, in seconds, while nothing is being
   * followed. Aura's cap, for Aura's reason: a drifting ribbon does not need
   * the display's rate.
   */
  private static readonly CAPPED = 1 / 30

  /** What the skipped frames were worth, spent on the next one drawn. */
  private held = 0

  private advance(delta: number): void {
    this.held += delta
    /* **The cap lifts while the page is being traveled.** The ribbon in
       `travel` moves with the content, and at thirty frames a second against a
       page scrolling at the display's rate it visibly lags the text. */
    const traveling = this.travel && Math.abs(window.scrollY - this.offset) > 0.5
    if (!traveling && this.held < HelixStrands.CAPPED) {
      return
    }
    const step = Math.min(this.held, MAX_FRAME_STEP)
    this.held = 0
    this.elapsed += step * PACE * Math.max(0, this.speed)
    if (this.travel) {
      const target = window.scrollY
      this.offset += (target - this.offset) * (1 - Math.exp(-step / TRAVEL_EASE))
      if (Math.abs(target - this.offset) < 0.5) {
        this.offset = target
      }
    }
    this.paint()
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-strands': HelixStrands
  }
}
