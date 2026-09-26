import { customElement, HelixElement } from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'

/**
 * @summary Something moving on a map, drawn where it is and heard when it matters.
 *
 * @description
 * **Where it is, which way it faces, and how sure anyone is.** `lat` and `lng`
 * place it, `heading` turns a cone the way it is going, in degrees clockwise
 * from north, and `accuracy` draws a ring that many meters across the ground.
 * The connector in `@fusion.dev/helix-map` stands it on the map and sizes the
 * ring through the renderer's own projection, so it is right at every zoom and
 * on every renderer, and writes both again every time the view moves.
 *
 * **It moves in silence and speaks its description.** A position that
 * announced every step would say nothing a reader could use and drown the page
 * while it did, so its moves are not announced at all: its `description` is,
 * the words a page writes when something worth hearing happened, such as two
 * stops away. Politely, and at most once every `announce-every` milliseconds,
 * with the latest words once the wait is over.
 *
 * @since 0.105.0
 * @status experimental
 * @category media
 * @aliases Current location, Live position, Tracker, You are here
 * @documentation https://fusion.dev/helix/components/map
 *
 * @csspart accuracy - The ring as wide as the position is uncertain.
 * @csspart arrow - The arrow a position with a heading is drawn as, pointing the way it faces.
 * @csspart dot - The point that stands on the position.
 * @csspart heading - The cone that points the way it is going, where a heading is known.
 * @csspart position - The picture of it, the ring, the cone and the point, named by its label.
 * @csspart pulse - A ring that radiates from the point, which says it is live rather than a place.
 * @csspart status - Its description, spoken as it changes.
 */
@customElement('helix-headless-map-position')
export class HelixHeadlessMapPosition extends HelixElement {
  /** How far off the position may be, in meters, which the ring is drawn as. */
  @property({ reflect: true, type: Number })
  accuracy?: number

  /**
   * How often the description may be spoken, in milliseconds. The latest
   * words wait out the rest of the interval rather than being dropped.
   */
  @property({ attribute: 'announce-every', type: Number })
  announceEvery = 5000

  /** What is worth hearing about it, spoken as it changes: two stops away, arrived. */
  @property({ reflect: true })
  description?: string

  /** Which way it is going, in degrees clockwise from north. None draws no cone. */
  @property({ reflect: true, type: Number })
  heading?: number

  /** Marks this as a position for the connector, whatever its tag. */
  readonly isMapPosition = true

  /** What it is, which is what a reader hears when they come to it. */
  @property({ reflect: true })
  label?: string

  /** How far north, in degrees. Reflected, so the connector hears it move. */
  @property({ reflect: true, type: Number })
  lat?: number

  /** How far east, in degrees. */
  @property({ reflect: true, type: Number })
  lng?: number

  /** The words last spoken, which is what the status holds. */
  @state()
  private spoken = ''

  /** When they were spoken, for the interval. */
  private spokenAt = Number.NEGATIVE_INFINITY

  /** The latest words, waiting out the interval. */
  private waiting: ReturnType<typeof setTimeout> | undefined

  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed)
    /* **Not the words it arrived with**, which a live region would not speak
       anyway, and which a reader coming to the map reads in the status. */
    if (!changed.has('description') || !this.hasUpdated) {
      if (!this.hasUpdated) {
        this.spoken = this.description ?? ''
      }
      return
    }
    const wait = this.spokenAt + this.announceEvery - Date.now()
    if (wait <= 0) {
      this.speak()
    } else if (this.waiting === undefined) {
      this.waiting = setTimeout(() => this.speak(), wait)
    }
  }

  /** Puts the latest words in the status, which is what makes them heard. */
  private speak(): void {
    clearTimeout(this.waiting)
    this.waiting = undefined
    this.spokenAt = Date.now()
    this.spoken = this.description ?? ''
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    clearTimeout(this.waiting)
    this.waiting = undefined
  }

  protected override render(): TemplateResult {
    /* **The status beside the picture, not in it.** An image's children are
       presentational, so a status inside \`role="img"\` was never spoken at
       all. */
    return html`<span part="position" role="img" aria-label=${this.label ?? ''}>
        <span part="accuracy"></span>
        <span part="heading"></span>
        <span part="pulse"></span>
        <span part="dot"></span>
        <svg part="arrow" viewBox="0 0 24 24"><path d="M12 2.5 20.5 20.5 12 16.5 3.5 20.5Z"></path></svg>
      </span>
      <span part="status" role="status">${this.spoken}</span>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-map-position': HelixHeadlessMapPosition
  }
}
