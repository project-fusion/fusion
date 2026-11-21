import { customElement, HelixElement, motionPaused, onMotionChange } from '@fusion.dev/helix-core'
import { type CSSResultGroup, html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { contourTile } from '../contours.js'
import { BRIGHT_STARS, SHOOTING_STARS, type StarTiles, starTiles } from '../stars.js'
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
 * - **`stars`**: a night sky of faint and bright points, its brightest stars
 *   twinkling each on its own beat and a shooting star crossing now and then.
 *   In dark, the band of the Milky Way crosses it, and a few stars take a
 *   cool or a warm color.
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
 * @use Lines or points drawn behind a section, such as a landing page's heading.
 * @instead aura - A background of drifting light in the theme's colors.
 * @instead strands - A ribbon of fine strands of light, in a box or down a whole page.
 * @documentation https://fusion.dev/design/components/pattern
 *
 * @slot - The content drawn over the pattern.
 *
 * @csspart content - The box holding the content, drawn over the pattern.
 * @csspart glow - The glow that follows the pointer over `hexagons`.
 * @csspart meteor - A shooting star over `stars`.
 * @csspart motif - The drawing, behind the content.
 * @csspart star - A bright star over `stars`, which twinkles.
 *
 * @cssproperty --pattern-color - The color of the lines and points. Defaults to `--helix-color-border` for lines and `--helix-color-foreground-muted` for stars in light and `--helix-color-foreground` in dark, which draw most of their points at a share of it.
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

  /** The star tiles, drawn on the client the first time they are asked for. */
  @state()
  private sky: StarTiles | undefined

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

  /* **The tiles are drawn after the first render, never in it.** Hydration
     keeps the attribute values the server wrote and commits none of its own,
     so a tile written into the first render's `style` never reached a
     server-rendered page, even once its script ran: the server has no canvas
     to draw one with. Drawn a microtask after the first render, the tile is a
     change, which the next render commits on any page. */
  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    if (this.hasUpdated && changed.has('motif')) {
      this.draw()
    }
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    queueMicrotask(() => this.draw())
  }

  /** Draws the tile the motif needs, the first time it needs it. */
  private draw(): void {
    if (this.motif === 'contours' && this.tile === undefined) {
      this.tile = contourTile()
    }
    if (this.motif === 'stars' && this.sky === undefined) {
      this.sky = starTiles()
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
    const sky =
      this.motif === 'stars' && this.sky
        ? `--_pattern-points: url(${this.sky.points}); --_pattern-halos: url(${this.sky.halos}); --_pattern-dust: url(${this.sky.dust})`
        : ''
    const at = this.pointer
      ? `--_pattern-x: ${Math.round(this.pointer.x)}px; --_pattern-y: ${Math.round(this.pointer.y)}px`
      : ''
    return html`<div part="motif" aria-hidden="true" style=${tile || sky || nothing}>
        ${this.motif === 'stars' ? this.stars() : nothing}
      </div>
      <div
        part="glow"
        aria-hidden="true"
        ?data-on=${this.pointer !== undefined}
        style=${at || nothing}
      ></div>
      <div part="content"><slot></slot></div>`
  }

  /** The bright stars and the shooting stars, at the same places on the server as on the client. */
  private stars(): TemplateResult {
    return html`${BRIGHT_STARS.map(
      (star) =>
        html`<span
          part="star"
          data-tint=${star.tint ?? nothing}
          ?data-spikes=${star.spikes}
          style="--_star-x: ${star.x}%; --_star-y: ${star.y}%; --_star-size: ${star.size}; --_star-beat: ${star.beat}; --_star-phase: ${star.phase}"
        ></span>`,
    )}${SHOOTING_STARS.map(
      (meteor) =>
        html`<span
          part="meteor"
          style="--_meteor-x: ${meteor.x}%; --_meteor-y: ${meteor.y}%; --_meteor-beat: ${meteor.beat}; --_meteor-phase: ${meteor.phase}"
        ></span>`,
    )}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-pattern': HelixPattern
  }
}
