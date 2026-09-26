import { customElement, HelixElement, HelixMapPartChangeEvent } from '@fusion.dev/helix-core'
import { nothing, type PropertyValues } from 'lit'
import { property } from 'lit/decorators.js'

/** A place in a points layer, where it is written as a list rather than GeoJSON. */
export interface MapPointsPlace {
  /** What pressing it reports, where it is not its label. */
  id?: string | number | undefined
  /** Its name. */
  label?: string | undefined
  lat: number
  lng: number
}

/** A GeoJSON collection of points, longitude first as GeoJSON writes it. */
export interface MapPointsCollection {
  features: {
    geometry: { coordinates: number[]; type: string } | null
    id?: string | number | undefined
    properties?: Record<string, unknown> | null
    type: 'Feature'
  }[]
  type: 'FeatureCollection'
}

/**
 * @summary Many places on a map at once, drawn by the renderer from data.
 *
 * @description
 * **For the thousands a marker is not for.** A marker is an element, named
 * and focusable, and a page of them is right for the dozen places a reader
 * walks; the cafés in a city are thousands, and thousands of elements are a
 * page that stops. This draws nothing itself: the connector in
 * `@fusion.dev/helix-map` hands the points to the renderer as one layer of
 * its own, which draws them as fast as it draws the roads, and gathers them
 * into counts where `cluster` asks, a count pressed zooming in to what it
 * holds.
 *
 * **Written as data, from a file or a property.** `src` is a GeoJSON file of
 * points the connector fetches, and `data` the same collection, or a list of
 * places, set by a script. Each point is named by its `name` property, or
 * whichever `name-key` says, and pressing one sends `helix-activate` from
 * this element with its id where it has one and its name where it does not.
 *
 * **Named in the frame's list**, by `label` and `description`, as a route is:
 * a reader who cannot see the points is told they are there and what they
 * are.
 *
 * @since 0.105.0
 * @status experimental
 * @category media
 * @aliases Data layer, GeoJSON layer, Point cloud, Point layer
 * @documentation https://fusion.dev/helix/components/map
 *
 * @event {HelixMapPartChangeEvent} helix-map-part-change - The points, their name or their color changed, which the frame and the connector follow. Not news for a page.
 */
@customElement('helix-headless-map-points')
export class HelixHeadlessMapPoints extends HelixElement {
  /**
   * Whether the renderer gathers points that would draw over each other into
   * their count, which pressing zooms in to.
   */
  @property({ type: Boolean })
  cluster = false

  /** The points as a script has them: a GeoJSON collection, or a list of places. */
  @property({ attribute: false })
  data?: MapPointsCollection | readonly MapPointsPlace[]

  /** What the points are about, after their name in the frame's list: how many, of what. */
  @property()
  description?: string

  /** Marks this as a layer for the frame and the connector, whatever its tag. */
  readonly isMapLayer = true

  /** What the points are called, which is what the frame's list says. */
  @property()
  label?: string

  /** @internal Which kind of layer, which is how the connector draws it. */
  readonly layerKind = 'points' as const

  /** The property each GeoJSON point is named by. */
  @property({ attribute: 'name-key' })
  nameKey = 'name'

  /** A GeoJSON file of points, which the connector fetches, where `data` is not set. */
  @property()
  src?: string

  /** Tells the frame and the connector the points changed, were renamed or were retoned. */
  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.dispatchEvent(new HelixMapPartChangeEvent({ kind: 'layer' }))
  }

  protected override render(): typeof nothing {
    return nothing
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-map-points': HelixHeadlessMapPoints
  }
}
