import { customElement, HelixElement, HelixMapPartChangeEvent } from '@fusion.dev/helix-core'
import { nothing, type PropertyValues } from 'lit'
import { property } from 'lit/decorators.js'

/** A place a line passes through or a shape is drawn around, in degrees. */
export interface MapPoint {
  lat: number
  lng: number
}

/**
 * `points` as it is written: `lat,lng` pairs separated by spaces, the order a
 * marker's own `lat` and `lng` read in. A pair that is not two numbers is
 * dropped rather than drawn at the origin, **an empty side included**:
 * `Number('')` is 0, so `30.1,` from a record with no longitude was a vertex
 * off West Africa.
 */
export const pointsOf = (value: string | null): MapPoint[] =>
  (value ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((pair) => pair.split(','))
    .filter((pair) => pair.length === 2 && pair.every((one) => one.trim() !== ''))
    .map((pair) => pair.map(Number))
    .filter((pair) => pair.every((one) => Number.isFinite(one)))
    .map(([lat, lng]) => ({ lat: lat as number, lng: lng as number }))

/** `points` read from its attribute, which is written and never reflected. */
export const pointsConverter = { fromAttribute: pointsOf }

/**
 * @summary A line on a map, drawn by the renderer and named for a reader.
 *
 * @description
 * **Drawn by whatever draws the map, not by this.** A route is the renderer's
 * own line, under the place names where only the renderer can put it, so this
 * element draws nothing: the connector in `@fusion.dev/helix-map` reads its
 * points and its color and hands them to the driver, and draws it again when
 * either changes or the map's style is replaced.
 *
 * **Named in the frame's list, because a line in a canvas is nothing to a
 * screen reader.** The frame lists every route and area by `label` and
 * `description`, so a reader hears there is a route from the depot and how
 * long it is, where the map only shows it.
 *
 * @since 0.105.0
 * @status experimental
 * @category media
 * @aliases Map line, Path, Polyline
 * @documentation https://fusion.dev/helix/components/map
 *
 * @event {HelixMapPartChangeEvent} helix-map-part-change - The line moved, was renamed or was retoned, which the frame and the connector follow. Not news for a page.
 */
@customElement('helix-headless-map-route')
export class HelixHeadlessMapRoute extends HelixElement {
  /** What the route is about, after its name in the frame's list: a distance, a time. */
  @property()
  description?: string

  /** Marks this as a layer for the frame and the connector, whatever its tag. */
  readonly isMapLayer = true

  /** @internal Which kind of layer, which is how the connector draws it. */
  readonly layerKind: 'area' | 'route' = 'route'

  /** What the route is called, which is what the frame's list says. */
  @property()
  label?: string

  /**
   * The places the line passes through, in order. Set as the attribute or
   * the property, and heard by the connector either way through
   * `helix-map-part-change`.
   */
  @property({ converter: pointsConverter })
  points?: MapPoint[]

  /**
   * How much of it is behind, from 0 to 1 of its length: the part traveled
   * is drawn quieter than the part ahead, the way a navigation app draws a
   * journey under way.
   */
  @property({ type: Number })
  progress?: number

  /** Tells the frame and the connector the line moved, was renamed or was retoned. */
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
    'helix-headless-map-route': HelixHeadlessMapRoute
  }
}
