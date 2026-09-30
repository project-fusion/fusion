import {
  customElement,
  HelixElement,
  HelixMapPartChangeEvent,
  PlacementController,
} from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'

/**
 * @summary A moving point on a map, such as a vehicle or a person.
 *
 * @description
 * `lat` and `lng` set where it is, `heading` points it in a direction, in
 * degrees clockwise from north, and `accuracy` draws a ring with a radius of
 * that many meters. `connectMap` positions it and resizes the ring as the map
 * zooms.
 *
 * Screen readers announce its `description` when it changes, at most once
 * every `announce-every` milliseconds. Its movement is not announced. Set the
 * description when something worth hearing happens, such as "Two stops away".
 *
 * @since 0.105.0
 * @status experimental
 * @category media
 * @aliases Current location, Live position, Tracker, You are here
 * @documentation https://fusion.dev/helix/components/map
 *
 * @event {HelixMapPartChangeEvent} helix-map-part-change - It moved, turned, or its accuracy changed. Used by `connectMap`; pages do not need to listen for it.
 *
 * @csspart accuracy - The ring that shows how accurate the position is.
 * @csspart arrow - The arrow shown when the position has a heading.
 * @csspart dot - The point shown when the position has no heading.
 * @csspart heading - The cone that shows its direction.
 * @csspart position - The image of the position, named by its label.
 * @csspart pulse - A ring that spreads out from the point, showing that the position is live.
 * @csspart status - The description, announced when it changes.
 *
 * @cssstate placed - Placed on the map by the connector.
 */
@customElement('helix-headless-map-position')
export class HelixHeadlessMapPosition extends HelixElement {
  /** How accurate the position is, in meters. Drawn as a ring with this radius. */
  @property({ type: Number })
  accuracy?: number

  /**
   * The least time between announcements, in milliseconds. A change during the
   * wait is announced when the wait ends.
   */
  @property({ attribute: 'announce-every', type: Number })
  announceEvery = 5000

  /** What screen readers announce when it changes, such as "Two stops away". */
  @property()
  description?: string

  /** The direction it faces, in degrees clockwise from north. Shows an arrow. */
  @property({ reflect: true, type: Number })
  heading?: number

  /** Marks this as a position for the connector, whatever its tag. */
  readonly isMapPosition = true

  /** What it is, such as "Van 12". Read by screen readers. Defaults to "Live position". */
  @property()
  label = 'Live position'

  /** Latitude, in degrees. */
  @property({ type: Number })
  lat?: number

  /** Longitude, in degrees. */
  @property({ type: Number })
  lng?: number

  /** Where the position was placed, kept in its own shadow root. */
  private readonly placement = new PlacementController(this)

  /**
   * @internal Places the position, written by the connector: each custom property
   * given, and each one given as `undefined` taken away. Kept in a sheet in the
   * element's own shadow root, since its `style` is the page's.
   */
  place(properties: Readonly<Record<string, string | undefined>>): void {
    this.placement.set(properties)
    this.toggleState('placed', this.placement.get('--_map-position-x') !== undefined)
  }

  /** @internal What a custom property was placed at, or `undefined` where it was not. */
  placed(name: string): string | undefined {
    return this.placement.get(name)
  }

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

  /** Tells the connector it moved, turned or grew less sure: not what it said, which is its own. */
  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    if ([...changed.keys()].some((key) => key !== 'spoken' && key !== 'announceEvery')) {
      this.dispatchEvent(new HelixMapPartChangeEvent({ kind: 'place' }))
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
       presentational, so a status inside `role="img"` was never spoken at
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
