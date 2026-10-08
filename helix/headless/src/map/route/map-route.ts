import { customElement, HelixElement, HelixMapPartChangeEvent, words } from '@fusion.dev/helix-core'
import { nothing, type PropertyValues } from 'lit'
import { property } from 'lit/decorators.js'

import { type MapPoint, pointsConverter } from '../shape.js'

export type { MapPoint } from '../shape.js'

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
   * The key this part's words are registered under, its styled tag:
   * `registerWords('de', { 'helix-map-route': { label: 'Route' } })`.
   */
  static words = 'helix-map-route'

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
  @words
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
