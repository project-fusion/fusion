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
 * Set `caption` to draw words on the map with the area, such as a letter for a
 * search sector, in a color that reads on the map. It is drawn rather than
 * focusable, so it adds nothing to the tab order, and a screen reader reads
 * the area's `label` in the frame's list.
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
  /**
   * Words drawn on the map with the area, such as `A` for a search sector.
   * Unset, nothing is drawn. Keep it short: it is a caption on a map, and the
   * area's `label` is what a screen reader hears.
   */
  @property()
  caption?: string

  /**
   * Where the caption stands. `inside`, the default, at the point of the area
   * furthest from its edges. `outside`, just above the area's northernmost
   * point, clear of the shape, for an area whose caption would cover what is
   * in it.
   */
  @property({ attribute: 'caption-placement' })
  captionPlacement: 'inside' | 'outside' = 'inside'

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
