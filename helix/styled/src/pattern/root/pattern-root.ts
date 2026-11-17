import { customElement, HelixElement, motionPaused, onMotionChange } from '@fusion.dev/helix-core'
import { type CSSResultGroup, html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { contourTile } from '../contours.js'
import { styles } from './pattern-root.css.js'

/** What a `Pattern` draws. */
export type PatternMotif = 'contours' | 'hexagons' | 'stars'

/**
 * @summary A quiet background drawn in lines or points: hexagons, stars, or contour lines.
 *
 * @description
 * Put a section's content inside, such as the heading of a landing page, and
 * the pattern is drawn behind it, filling the box, in the theme's colors.
 *
 * - **`hexagons`**, the default: a honeycomb of fine lines that holds still,
 *   with a glow in the primary color that follows a mouse or pen across it.
 * - **`stars`**: three layers of points that twinkle and drift.
 * - **`contours`**: the lines of a map's relief, drifting slowly sideways.
 *
 * **Behind the content, and nothing to a screen reader.** The drawing is a
 * background, hidden from assistive technology, and takes no pointer, so the
 * content keeps its clicks. It is hidden on paper.
 *
 * Stars and contours move by themselves for as long as the page is open, so a
 * press on `Motion Toggle` holds them, as `:state(paused)`, and they hold
 * still where the reader asked for less movement.
 *
 * A single tier, as `Aura` is: the drawing is the whole of the component.
 *
 * @since 0.241.0
 * @status experimental
 * @category content
 * @aliases Background pattern, Honeycomb, Hexagon grid, Starfield, Topography, Contour lines
 * @documentation https://fusion.dev/helix/components/pattern
 *
 * @slot - The content drawn over the pattern.
 *
 * @csspart content - The box holding the content, drawn over the pattern.
 * @csspart glow - The glow that follows the pointer over `hexagons`.
 * @csspart motif - The drawing, behind the content.
 *
 * @cssproperty --pattern-color - The color of the lines and points. Defaults to `--helix-color-border` for lines and `--helix-color-foreground-muted` for stars.
 * @cssproperty --pattern-glow-color - The color of the glow under the pointer. Defaults to `--helix-color-primary`.
 *
 * @cssstate paused - The page's motion is paused, so stars and contours hold where they are.
 */
@customElement('helix-pattern')
export class HelixPattern extends HelixElement {
  static override styles: CSSResultGroup = styles

  /**
   * What is drawn: `hexagons` where this is not given. Reflected, because the
   * stylesheet draws by it.
   */
  @property({ reflect: true })
  motif?: PatternMotif

  /** The contour tile, drawn on the client the first time it is asked for. */
  @state()
  private tile: string | undefined

  /** Where a mouse or pen is over the host, in pixels from its top left, for the glow. */
  @state()
  private pointer: { x: number; y: number } | undefined

  /** The frame that writes the pointer's place. */
  private frame = 0

  /** The place heard and not yet written. */
  private heard: { x: number; y: number } | undefined

  /** What stops hearing the page's pause. */
  private stop: (() => void) | undefined

  override connectedCallback(): void {
    super.connectedCallback()
    this.toggleState('paused', motionPaused())
    this.stop = onMotionChange((paused) => this.toggleState('paused', paused))
    this.addEventListener('pointermove', this.move)
    this.addEventListener('pointerleave', this.leave)
  }

  override disconnectedCallback(): void {
    this.stop?.()
    this.stop = undefined
    this.removeEventListener('pointermove', this.move)
    this.removeEventListener('pointerleave', this.leave)
    cancelAnimationFrame(this.frame)
    this.frame = 0
    super.disconnectedCallback()
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    if (changed.has('motif') && this.motif === 'contours' && this.tile === undefined) {
      this.tile = contourTile()
    }
  }

  private readonly move = (event: PointerEvent): void => {
    if (event.pointerType === 'touch' || (this.motif ?? 'hexagons') !== 'hexagons') {
      return
    }
    const box = this.getBoundingClientRect()
    this.heard = { x: event.clientX - box.left, y: event.clientY - box.top }
    if (!this.frame) {
      this.frame = requestAnimationFrame(() => {
        this.frame = 0
        this.pointer = this.heard
      })
    }
  }

  private readonly leave = (): void => {
    cancelAnimationFrame(this.frame)
    this.frame = 0
    this.heard = undefined
    this.pointer = undefined
  }

  protected override render(): TemplateResult {
    const tile = this.motif === 'contours' && this.tile ? `--_pattern-tile: url(${this.tile})` : ''
    const at = this.pointer
      ? `--_pattern-x: ${Math.round(this.pointer.x)}px; --_pattern-y: ${Math.round(this.pointer.y)}px`
      : ''
    return html`<div part="motif" aria-hidden="true" style=${tile || nothing}></div>
      <div
        part="glow"
        aria-hidden="true"
        ?data-on=${this.pointer !== undefined}
        style=${at || nothing}
      ></div>
      <div part="content"><slot></slot></div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-pattern': HelixPattern
  }
}
