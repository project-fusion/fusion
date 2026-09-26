import { customElement, HelixElement, HelixMapPartChangeEvent } from '@fusion.dev/helix-core'
import { nothing, type PropertyValues } from 'lit'
import { property } from 'lit/decorators.js'
import { type MapPoint, pointsConverter } from '../route/map-route.js'

/**
 * @summary A region on a map, drawn by the renderer and named for a reader.
 *
 * @description
 * **A shape the renderer fills, under the place names**, the way a route is a
 * line it draws: this element draws nothing, and the connector in
 * `@fusion.dev/helix-map` hands its outline and color to the driver.
 *
 * **Named in the frame's list**, by `label` and `description`, for the reason
 * a route is: a delivery zone or a flood extent in a canvas is nothing to a
 * screen reader until something says it is there.
 *
 * @since 0.105.0
 * @status experimental
 * @category media
 * @aliases Map region, Polygon, Zone
 * @documentation https://fusion.dev/helix/components/map
 *
 * @event {HelixMapPartChangeEvent} helix-map-part-change - The shape moved, was renamed or was retoned, which the frame and the connector follow. Not news for a page.
 */
@customElement('helix-headless-map-area')
export class HelixHeadlessMapArea extends HelixElement {
  /** What the area is about, after its name in the frame's list. */
  @property()
  description?: string

  /** Marks this as a layer for the frame and the connector, whatever its tag. */
  readonly isMapLayer = true

  /** @internal Which kind of layer, which is how the connector draws it. */
  readonly layerKind: 'area' | 'route' = 'area'

  /** What the area is called, which is what the frame's list says. */
  @property()
  label?: string

  /**
   * Its outline, in order around it. The last point joins the first, so a
   * closed ring does not have to repeat it.
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
