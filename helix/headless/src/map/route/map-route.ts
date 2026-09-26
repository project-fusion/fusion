import { customElement, HelixElement } from '@fusion.dev/helix-core'
import { nothing } from 'lit'
import { property } from 'lit/decorators.js'

/** A place a line passes through or a shape is drawn around, in degrees. */
export interface MapPoint {
  lat: number
  lng: number
}

/**
 * `points` as it is written: `lat,lng` pairs separated by spaces, the order a
 * marker's own `lat` and `lng` read in. A pair that is not two numbers is
 * dropped rather than drawn at the origin.
 */
export const pointsConverter = {
  fromAttribute: (value: string | null): MapPoint[] =>
    (value ?? '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((pair) => pair.split(',').map(Number))
      .filter((pair) => pair.length === 2 && pair.every((one) => Number.isFinite(one)))
      .map(([lat, lng]) => ({ lat: lat as number, lng: lng as number })),
  toAttribute: (value: readonly MapPoint[] | undefined): string | null =>
    value && value.length > 0 ? value.map(({ lat, lng }) => `${lat},${lng}`).join(' ') : null,
}

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
 */
@customElement('helix-headless-map-route')
export class HelixHeadlessMapRoute extends HelixElement {
  /** What the route is about, after its name in the frame's list: a distance, a time. */
  @property({ reflect: true })
  description?: string

  /** Marks this as a layer for the frame and the connector, whatever its tag. */
  readonly isMapLayer = true

  /** @internal Which kind of layer, which is how the connector draws it. */
  readonly layerKind: 'area' | 'route' = 'route'

  /** What the route is called, which is what the frame's list says. */
  @property({ reflect: true })
  label?: string

  /**
   * The places the line passes through, in order. Reflected, so the
   * connector hears a route move whether a page set the attribute or the
   * property.
   */
  @property({ converter: pointsConverter, reflect: true })
  points?: MapPoint[]

  protected override render(): typeof nothing {
    return nothing
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-map-route': HelixHeadlessMapRoute
  }
}
