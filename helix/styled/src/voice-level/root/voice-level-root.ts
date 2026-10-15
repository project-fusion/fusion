import {
  customElement,
  HelixElement,
  hostAria,
  numberConverter,
  PaintGateController,
  readColorAlpha,
  words,
  writtenNumbers,
} from '@fusion.dev/helix-core'
import type { CSSResultGroup, PropertyValues, TemplateResult } from 'lit'
import { html } from 'lit'
import { property } from 'lit/decorators.js'
import {
  bandFor,
  barCount,
  centered,
  ease,
  envelope,
  QUIET_STOP,
  SILENT,
  stillLength,
  unit,
  type VoiceLevelVariant,
  WAVE_LINES,
  waveAt,
} from '../draw.js'
import { styles } from './voice-level-root.css.js'

/** What an unreadable color is drawn as: mid gray, which shows on either mode's ground. */
const GRAY = 'rgba(128,128,128,1)'

/** How faint the third wave is against the main color. */
const FAINT = 0.45

/** How faint the still bar's track is against the main color. */
const TRACK = 0.18

/** The distance between two points of a wave, in CSS pixels. */
const WAVE_STEP = 2

/** A resolved color as a string the canvas takes, or gray where it cannot be read. */
const ink = (value: string, alpha = 1): string => {
  const read = readColorAlpha(value)
  return read ? `rgba(${read[0]},${read[1]},${read[2]},${read[3] * alpha})` : GRAY
}

/**
 * @summary A live level of a voice, drawn as a row of bars or as moving waves.
 *
 * @description
 * Two drawings, chosen with `variant`:
 *
 * - `spectrum`: a row of thin rounded bars, one for each frequency band in
 *   `bands`, tallest in the middle. The middle half of the row takes the
 *   stronger color. A quiet bar rests as a dot.
 * - `waves`: three sine lines with different speeds, phases, and weights, held
 *   to the center line at both ends. `level` sets how far they swing, and a
 *   quiet level rests as a flat line.
 *
 * Set `level` and `bands` from your audio as often as you have readings, about
 * 30 times a second. Each bar and wave eases toward its reading: up fast and
 * down slower. A spectrum given no `bands` draws every bar from `level`.
 *
 * The drawing stops when it is off screen, in a background tab, or after the
 * level has been zero for under a second, and starts again with the next
 * reading. With `prefers-reduced-motion`, it draws one bar from the middle
 * over a faint track, whose length is the level, and redraws it on each
 * reading.
 *
 * The level is an image named by `label`. A meter's value would be announced
 * on every change, and a level changes many times a second.
 *
 * Voice Level is styled only and has behavior, which the tier split does not
 * otherwise allow. Its role and name are set on the host, and the rest is
 * drawing to a canvas.
 *
 * @since 0.215.0
 * @status experimental
 * @category feedback
 * @aliases Audio Level, Waveform, Microphone Level, Equalizer, VU Meter
 * @documentation https://fusion.dev/helix/components/voice-level
 *
 * @csspart canvas - The canvas the level is drawn on.
 *
 * @cssproperty --voice-level-accent-color - The color of the second wave. Defaults to the accent color.
 * @cssproperty --voice-level-bars - How many bars the spectrum draws, from 3 to 96. Defaults to `24`.
 * @cssproperty --voice-level-block-size - The height. Defaults to the icon size for `spectrum` and the control size for `waves`.
 * @cssproperty --voice-level-color - The color of the center bars and the main wave. Defaults to the primary color.
 * @cssproperty --voice-level-edge-color - The color of the bars at either end. Defaults to `--voice-level-color` at 55 percent.
 * @cssproperty --voice-level-inline-size - The width. Defaults to four times the height for `spectrum` and three times for `waves`.
 */
@customElement('helix-voice-level')
export class HelixVoiceLevel extends HelixElement {
  /**
   * The key this family's words are registered under, its tag:
   * `registerWords('de', { 'helix-voice-level': { fallbackLabel: 'Sprachpegel' } })`.
   */
  static words = 'helix-voice-level'

  static override styles: CSSResultGroup = styles

  /**
   * How loud each frequency band is, from `0` to `1`, lowest band first.
   *
   * Each bar of the spectrum follows one band. Where there are more or fewer
   * bands than bars, each bar reads between the two nearest bands. Empty draws
   * every bar from `level`. Written as an attribute, the numbers are separated
   * by spaces or commas: `bands="0.1 0.4 0.6 0.3"`. Assign an array to the
   * property for readings that change many times a second.
   */
  @property()
  bands: string | readonly number[] = ''

  /**
   * The name where `label` is empty. Translate it with the rest of your
   * interface.
   */
  @words
  @property({ attribute: 'fallback-label' })
  fallbackLabel = 'Voice level'

  /**
   * The name read by screen readers, such as "Your voice". Defaults to
   * `fallbackLabel`.
   */
  @property()
  label = ''

  /**
   * How loud the voice is, from `0` for silence to `1`.
   *
   * It sets how far the waves swing, the length of the still bar under
   * `prefers-reduced-motion`, and every bar of a spectrum that has no
   * `bands`. A value outside the range is drawn at the nearer end.
   */
  @property({ converter: numberConverter('level', 0) })
  level = 0

  /**
   * The drawing: a row of bars, one for each band, or three moving waves.
   *
   * Reflected because the stylesheet sizes each drawing differently. Absent
   * is `spectrum`, the resting value, which selects nothing.
   */
  @property({ reflect: true })
  variant?: VoiceLevelVariant

  private canvas: HTMLCanvasElement | undefined
  private context: CanvasRenderingContext2D | null = null

  /** Whether the browser has taken the canvas, as its own two events say. */
  private lost = false

  /** The box the canvas was last measured at, in CSS pixels. */
  private width = 0
  private height = 0

  /** Each bar as it is drawn now, eased toward its band. */
  private shown: number[] = []

  /** The waves' amplitude as it is drawn now, eased toward the level. */
  private swing = 0

  /** The waves' clock, in seconds. */
  private time = 0

  /** How long everything drawn has been at rest, in seconds. */
  private quiet = 0

  /**
   * Whether the loop has stopped for a level at rest. A reading above zero
   * clears it. Held here so the gate's own paths to a frame, a tab coming back
   * or the element scrolling into view, do not start a loop with nothing to
   * draw.
   */
  private resting = false

  private readonly gate = new PaintGateController(this, {
    canRun: () => !!this.context && !this.lost && !this.resting,
    onFrame: (delta) => {
      this.step(delta)
      this.paint()
      if (this.quiet >= QUIET_STOP) {
        this.resting = true
        this.gate.stop()
      }
    },
    onMotion: () => {
      this.paint()
    },
    onResize: () => {
      this.measure()
      this.paint()
    },
  })

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    hostAria(this.internals, { label: this.label || this.fallbackLabel, role: 'img' })
    if (changed.has('level') || changed.has('bands') || changed.has('variant')) {
      this.wake()
    }
  }

  protected override render(): TemplateResult {
    /* `aria-hidden` on the canvas: the host carries the role and the name
       through `ElementInternals`, and the canvas has nothing of its own. */
    return html`<canvas part="canvas" aria-hidden="true"></canvas>`
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.start()
  }

  override connectedCallback(): void {
    super.connectedCallback()
    if (this.hasUpdated) {
      this.start()
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.width = 0
    this.height = 0
    this.canvas?.removeEventListener('contextlost', this.handleLost)
    this.canvas?.removeEventListener('contextrestored', this.handleRestored)
    this.canvas?.removeEventListener('transitionend', this.handleRestyle)
  }

  /** Readings as numbers, each brought into `0` to `1`. */
  private get readings(): number[] {
    return writtenNumbers(this.bands).map(unit)
  }

  /** Whether anything is to be drawn above rest: a level or a band above silence. */
  private get sounding(): boolean {
    return unit(this.level) > SILENT || this.readings.some((band) => band > SILENT)
  }

  /**
   * A new reading. Drawn at once under reduced motion, and otherwise handed to
   * the loop, which is started where it had stopped for a level at rest.
   */
  private wake(): void {
    if (!this.context) {
      return
    }
    if (this.gate.reduced) {
      this.paint()
      return
    }
    if (this.sounding) {
      this.resting = false
      this.quiet = 0
      this.gate.play()
    } else if (!this.gate.running) {
      /* A level at rest drawn again, such as one whose variant changed. */
      this.paint()
    }
  }

  /**
   * One frame for a still level, once a color the canvas carries has moved,
   * so a theme changed while nothing moves is drawn in its own colors.
   */
  private readonly handleRestyle = (): void => {
    if (!this.gate.running) {
      this.paint()
    }
  }

  /**
   * Everything the canvas needs, in one place both lifecycles reach, so an
   * element moved by a framework keeps its observers.
   */
  private start(): void {
    if (!this.isConnected) {
      return
    }
    const canvas = this.renderRoot.querySelector('canvas')
    /* Client only. There is no canvas on a server, and a machine that refuses
       a 2D context gets an empty box. */
    if (!canvas) {
      return
    }
    this.canvas = canvas
    this.context ??= canvas.getContext('2d')
    if (!this.context) {
      return
    }
    canvas.addEventListener('contextlost', this.handleLost)
    canvas.addEventListener('contextrestored', this.handleRestored)
    canvas.addEventListener('transitionend', this.handleRestyle)
    if (this.lost && !this.context.isContextLost()) {
      this.lost = false
      canvas.toggleAttribute('hidden', false)
    }
    this.gate.watch()
    this.measure()
    this.paint()
    this.resting = !this.sounding
    this.gate.play()
  }

  /**
   * Matches the drawing buffer to the box, at the device's pixel ratio capped
   * at 2, and reports whether it changed.
   */
  private measure(): boolean {
    const canvas = this.canvas
    if (!canvas) {
      return false
    }
    const box = this.getBoundingClientRect()
    const width = Math.round(box.width)
    const height = Math.round(box.height)
    if (width <= 0 || height <= 0 || (width === this.width && height === this.height)) {
      return false
    }
    this.width = width
    this.height = height
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    this.context?.setTransform(dpr, 0, 0, dpr, 0, 0)
    return true
  }

  /** A 2D context comes back on its own, so a loss only stops the loop and hides the canvas. */
  private readonly handleLost = (): void => {
    this.lost = true
    this.gate.stop()
    this.canvas?.toggleAttribute('hidden', true)
  }

  /** Sized again, because a restored canvas comes back in its default state. */
  private readonly handleRestored = (): void => {
    this.lost = false
    this.canvas?.toggleAttribute('hidden', false)
    this.width = 0
    this.height = 0
    this.measure()
    this.paint()
    this.gate.play()
  }

  /** Moves every bar and the waves one frame toward their readings. */
  private step(delta: number): void {
    const count = this.bars
    const readings = this.readings
    if (this.shown.length !== count) {
      this.shown = Array.from({ length: count }, (_, at) => this.shown[at] ?? 0)
    }
    let top = 0
    for (let at = 0; at < count; at++) {
      const target = bandFor(readings, this.level, at, count) * envelope(at, count)
      const next = ease(this.shown[at] ?? 0, target, delta)
      this.shown[at] = next
      top = Math.max(top, next, target)
    }
    const level = unit(this.level)
    this.swing = ease(this.swing, level, delta)
    this.time += delta
    top = Math.max(top, this.swing, level)
    this.quiet = top > SILENT ? 0 : this.quiet + delta
  }

  /** The bar count the hook asks for. */
  private get bars(): number {
    return this.canvas ? barCount(getComputedStyle(this.canvas).animationIterationCount) : 0
  }

  /** One frame of whichever drawing `variant` names, or the still one. */
  private paint(): void {
    const ctx = this.context
    const canvas = this.canvas
    if (!ctx || !canvas || this.width <= 0 || this.height <= 0) {
      return
    }
    /* Read off the canvas, where the stylesheet resolves each hook onto a
       property typed as a color. A custom property is reported as the text it
       was written in, which a canvas cannot draw. */
    const painted = getComputedStyle(canvas)
    const main = ink(painted.color)
    ctx.clearRect(0, 0, this.width, this.height)
    if (this.gate.reduced) {
      this.paintStill(ctx, main, ink(painted.color, TRACK))
    } else if (this.variant === 'waves') {
      this.paintWaves(ctx, main, painted)
    } else {
      this.paintSpectrum(ctx, main, ink(painted.textDecorationColor))
    }
  }

  /** The bars, the center ones in `main` and the rest in `edge`. */
  private paintSpectrum(ctx: CanvasRenderingContext2D, main: string, edge: string): void {
    const count = this.bars
    if (this.shown.length !== count) {
      this.step(0)
    }
    const slot = this.width / count
    const thickness = Math.min(4, Math.max(1.5, slot * 0.5))
    const middle = this.height / 2
    const center = new Path2D()
    const ends = new Path2D()
    for (let at = 0; at < count; at++) {
      const tall = thickness + (this.shown[at] ?? 0) * (this.height - thickness)
      const path = centered(at, count) ? center : ends
      rounded(path, slot * (at + 0.5) - thickness / 2, middle - tall / 2, thickness, tall)
    }
    ctx.fillStyle = edge
    ctx.fill(ends)
    ctx.fillStyle = main
    ctx.fill(center)
  }

  /** The three waves, the main one on top. */
  private paintWaves(
    ctx: CanvasRenderingContext2D,
    main: string,
    painted: CSSStyleDeclaration,
  ): void {
    const middle = this.height / 2
    const colors = {
      accent: ink(painted.columnRuleColor),
      faint: ink(painted.color, FAINT),
      main,
    }
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    for (const line of WAVE_LINES) {
      const reach = Math.max(0, middle - line.width) * this.swing
      ctx.beginPath()
      for (let x = 0; x <= this.width; x += WAVE_STEP) {
        const y = middle - reach * waveAt(line, x / this.width, this.time)
        if (x === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      }
      ctx.lineTo(this.width, middle)
      ctx.lineWidth = line.width
      ctx.strokeStyle = colors[line.ink]
      ctx.stroke()
    }
  }

  /**
   * Under reduced motion: one bar from the middle, as long as the level, in
   * the main color, over a faint track the width of the box. As thick as a
   * spectrum's bar or the main wave.
   */
  private paintStill(ctx: CanvasRenderingContext2D, main: string, faint: string): void {
    const thickness =
      this.variant === 'waves'
        ? 2
        : Math.min(4, Math.max(1.5, (this.width / (this.bars || 1)) * 0.5))
    const readings = this.readings
    const level =
      this.level > 0 || readings.length === 0
        ? this.level
        : Math.max(...readings.map((band, at) => band * envelope(at, readings.length)))
    const length = stillLength(level, this.width, thickness)
    const top = (this.height - thickness) / 2
    /* The whole width faintly behind it, so its length reads as a share. */
    const track = new Path2D()
    rounded(track, 0, top, this.width, thickness)
    ctx.fillStyle = faint
    ctx.fill(track)
    const path = new Path2D()
    rounded(path, (this.width - length) / 2, top, length, thickness)
    ctx.fillStyle = main
    ctx.fill(path)
  }
}

/** A rectangle with fully rounded ends added to `path`, square where the engine has no `roundRect`. */
const rounded = (path: Path2D, x: number, y: number, width: number, height: number): void => {
  if (typeof path.roundRect === 'function') {
    path.roundRect(x, y, width, height, Math.min(width, height) / 2)
  } else {
    path.rect(x, y, width, height)
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-voice-level': HelixVoiceLevel
  }
}
