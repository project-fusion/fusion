import {
  customElement,
  HelixElement,
  motionPaused,
  onMotionChange,
  reducedMotion,
} from '@fusion.dev/helix-core'
import { type CSSResultGroup, html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { lapAround, registerLengths } from '../../shared/edge-light/edge-light.js'
import { styles } from './border-beam-root.css.js'

/** Where the light is on the edge, which the lap moves along it. */
const LIGHT_X = '--_border-beam-x'
const LIGHT_Y = '--_border-beam-y'

/** How far the light may reach, half the box's shorter side. */
const REACH = '--_border-beam-reach'

/**
 * How fast the light travels the edge, in pixels a millisecond, and the
 * shortest and longest one lap takes. Slower than the Chat composer's single
 * lap, since this one runs for as long as the work does.
 */
const PACE = 0.4
const SHORTEST = 2400
const LONGEST = 6000

/**
 * @summary A light that travels around the edge of its content, for something running or live.
 *
 * @description
 * Put a `Card` or a panel inside, and a light runs around its edge, at one
 * speed all the way, for as long as the element is there. It says that what
 * is inside is at work: an agent writing a reply, a sync in progress, or a
 * stream that is live.
 *
 * **Drawn on the edge only**, over the content's own border, so it takes the
 * content's corners from `--border-beam-radius` and nothing inside is covered.
 *
 * A light that runs by itself runs for as long as the page is open, so a press
 * on `Motion Toggle` holds it where it is, as `:state(paused)`. Where the reader
 * asked for less movement, the edge is lit steadily and nothing travels.
 *
 * A single tier, as `Shine` is: the light is the whole of the component.
 *
 * @since 0.246.0
 * @status experimental
 * @category content
 * @aliases Running border, Moving border, Border light, Glow border
 * @use A card or a panel whose work is running, such as an agent writing a reply.
 * @instead shine - One action that a band of light crosses, such as a sign-up button.
 * @instead spotlight - Cards lit under the pointer as it moves over them.
 * @instead shimmer-text - A line of words that names the work while it runs.
 * @practice Set `idle` when the work stops. - A light left running says the work is still going.
 * @practice Say what is running in words as well, such as with a `Badge`. - The light takes no pointer and is hidden from screen readers.
 * @documentation https://fusion.dev/design/components/border-beam
 *
 * @slot - The content whose edge the light travels, such as a `Card`.
 *
 * @csspart beam - The light, a soft spot cut to the edge. Hidden from screen readers.
 *
 * @cssproperty --border-beam-color - The color of the light. Defaults to `--helix-color-accent`.
 * @cssproperty --border-beam-duration - How long one lap takes. Defaults to the length of the edge at a steady pace, between 2.4 and 6 seconds.
 * @cssproperty --border-beam-radius - The corners the light follows. Defaults to `--helix-radii-md`, the corners of a `Card`.
 * @cssproperty --border-beam-size - How far the light reaches along the edge. Defaults to `4rem`, and to half the shorter side of a small box.
 * @cssproperty --border-beam-width - How wide the lit edge is. Defaults to `--helix-border-thin`, a `Card`'s border.
 *
 * @cssstate paused - The page's motion is paused, so the light holds where it is.
 */
@customElement('helix-border-beam')
export class HelixBorderBeam extends HelixElement {
  static override styles: CSSResultGroup = styles

  /**
   * Whether the work has stopped, so no light runs. Reflected, because the
   * stylesheet takes the light away on it.
   */
  @property({ reflect: true, type: Boolean })
  idle = false

  /** The light's lap while it runs. */
  private lap: Animation | undefined

  /** What stops hearing the page's pause. */
  private stop: (() => void) | undefined

  /** Measures the box again when it changes size, so the lap keeps its speed. */
  private watcher: ResizeObserver | undefined

  /** The reader's motion preference, heard as it changes. */
  private motion: MediaQueryList | undefined

  override connectedCallback(): void {
    super.connectedCallback()
    registerLengths([LIGHT_X, LIGHT_Y])
    this.toggleState('paused', motionPaused())
    this.stop = onMotionChange((paused) => {
      this.toggleState('paused', paused)
      this.hold()
    })
    if (typeof ResizeObserver !== 'undefined') {
      this.watcher = new ResizeObserver(() => this.run())
      this.watcher.observe(this)
    }
    if (typeof matchMedia === 'function') {
      this.motion = matchMedia('(prefers-reduced-motion: reduce)')
      this.motion.addEventListener('change', this.run)
    }
  }

  override disconnectedCallback(): void {
    this.stop?.()
    this.stop = undefined
    this.watcher?.disconnect()
    this.watcher = undefined
    this.motion?.removeEventListener('change', this.run)
    this.motion = undefined
    this.lap?.cancel()
    this.lap = undefined
    super.disconnectedCallback()
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed)
    if (changed.has('idle')) {
      this.run()
    }
  }

  /**
   * Starts the lap, or measures it again, **from where the light is**, so a
   * box that grows keeps the light on its way and the lap at one speed.
   */
  private readonly run = (): void => {
    const beam = this.renderRoot?.querySelector<HTMLElement>('[part="beam"]')
    if (!beam || typeof beam.animate !== 'function' || this.idle || reducedMotion()) {
      this.lap?.cancel()
      this.lap = undefined
      return
    }
    /* Layout pixels, which the light is placed in, under any transform above. */
    const width = this.offsetWidth
    const height = this.offsetHeight
    const keyframes = lapAround(width, height, LIGHT_X, LIGHT_Y, false)
    if (keyframes.length === 0) {
      return
    }
    const duration = this.duration(2 * (width + height))
    const before = this.lap
    const through =
      before && typeof before.currentTime === 'number' && before.effect
        ? (before.currentTime % (before.effect.getTiming().duration as number)) /
          (before.effect.getTiming().duration as number)
        : 0
    before?.cancel()
    /* The sheet caps the light's size with this. Chromium refuses a gradient
       size that mixes a percentage with a length, so the box's size comes
       from here, as the Chat composer's does. */
    beam.style.setProperty(REACH, `${Math.min(width, height) / 2}px`)
    this.lap = beam.animate(keyframes, { duration, easing: 'linear', iterations: Infinity })
    this.lap.currentTime = through * duration
    this.hold()
  }

  /** How long one lap takes: the hook, or the edge's length at a steady pace. */
  private duration(edge: number): number {
    const written = getComputedStyle(this).getPropertyValue('--border-beam-duration').trim()
    const amount = Number.parseFloat(written)
    if (Number.isFinite(amount) && amount > 0) {
      return written.endsWith('ms') ? amount : amount * 1000
    }
    return Math.min(LONGEST, Math.max(SHORTEST, edge / PACE))
  }

  /** Holds the light where it is while the page's motion is paused. */
  private hold(): void {
    if (!this.lap) {
      return
    }
    if (motionPaused()) {
      this.lap.pause()
    } else if (this.lap.playState === 'paused') {
      this.lap.play()
    }
  }

  protected override render(): TemplateResult {
    return html`<slot></slot><span part="beam" aria-hidden="true"></span>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-border-beam': HelixBorderBeam
  }
}
