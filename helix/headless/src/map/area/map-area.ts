import { customElement, HelixElement, HelixMapPartChangeEvent } from '@fusion.dev/helix-core'
import { nothing, type PropertyValues } from 'lit'
import { property } from 'lit/decorators.js'
import { type MapPoint, pointsConverter } from '../route/map-route.js'

/**
 * @summary A shape on a map, such as a delivery zone.
 *
 * @description
 * `connectMap` fills the shape as a layer of the map, under its place names.
 * The frame lists each area by its `label` and `description` for screen
 * readers.
 *
 * @since 0.105.0
 * @status experimental
 * @category media
 * @aliases Map region, Polygon, Zone
 * @documentation https://fusion.dev/helix/components/map
 *
 * @event {HelixMapPartChangeEvent} helix-map-part-change - The area's points, name, or color changed. Used by `connectMap`; pages do not need to listen for it.
 */
@customElement('helix-headless-map-area')
export class HelixHeadlessMapArea extends HelixElement {
  /** More about the area. Read after its label in the frame's list. */
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
  readonly layerKind: 'area' | 'route' = 'area'

  /**
   * The area's name, used in the frame's list and its tile in the layers
   * menu. Defaults to "Area", so neither is ever a control with no name.
   */
  @property()
  label = 'Area'

  /**
   * The corners of the shape, in order. The last point connects back to the
   * first.
   */
  @property({ converter: pointsConverter })
  points?: MapPoint[]

  /** Tells the frame and the connector the shape moved, was renamed or was retoned. */
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
    'helix-headless-map-area': HelixHeadlessMapArea
  }
}
