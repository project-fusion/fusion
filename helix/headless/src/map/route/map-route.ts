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
 * @summary A line on a map, such as a route between stops.
 *
 * @description
 * `connectMap` draws the route as a layer of the map, under its place names,
 * and redraws it when its points, progress, or color change. The frame lists
 * each route by its `label` and `description` for screen readers.
 *
 * @since 0.105.0
 * @status experimental
 * @category media
 * @aliases Map line, Path, Polyline
 * @documentation https://fusion.dev/helix/components/map
 *
 * @event {HelixMapPartChangeEvent} helix-map-part-change - The route's points, progress, name, or color changed. Used by `connectMap`; pages do not need to listen for it.
 */
@customElement('helix-headless-map-route')
export class HelixHeadlessMapRoute extends HelixElement {
  /**
   * More about the route, such as its distance or time. Read after its label
   * in the frame's list.
   */
  @property()
  description?: string

  /**
   * A name this layer shares with other layers, such as a route and its
   * dotted legs. The layers menu shows layers in the same group as one entry,
   * named by the first of them, and its checkbox shows or hides them all.
   */
  @property()
  group?: string

  /** Marks this as a layer for the frame and the connector, whatever its tag. */
  readonly isMapLayer = true

  /** @internal Which kind of layer, which is how the connector draws it. */
  readonly layerKind: 'area' | 'route' = 'route'

  /**
   * The route's name, used in the frame's list and its tile in the layers
   * menu. Defaults to "Route", so neither is ever a control with no name.
   */
  @property()
  label = 'Route'

  /**
   * The points the line passes through, in order. Write the attribute as
   * `lat,lng` pairs separated by spaces, or set the property to an array of `{
   * lat, lng }`.
   */
  @property({ converter: pointsConverter })
  points?: MapPoint[]

  /**
   * How much of the route has been traveled, from 0 to 1. The traveled part is
   * drawn in a lighter color.
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
