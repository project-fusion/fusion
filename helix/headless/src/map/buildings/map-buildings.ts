import { customElement, HelixElement, HelixMapPartChangeEvent } from '@fusion.dev/helix-core'
import { nothing, type PropertyValues } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary The buildings on a map, raised to their real heights in 3D.
 *
 * @description
 * `connectMap` raises the buildings in the map's tiles to the heights the tiles
 * record, under the map's place names. Tilt the map to see the heights. The
 * buildings appear from zoom 13, where the tiles start to carry them.
 *
 * MapLibre draws the buildings. Leaflet draws maps flat, so a Leaflet map shows
 * none. The frame lists the layer by its `label` for screen readers.
 *
 * @since 0.105.0
 * @status experimental
 * @category media
 * @aliases 3D buildings, Extrusion
 * @documentation https://fusion.dev/helix/components/map
 *
 * @event {HelixMapPartChangeEvent} helix-map-part-change - The layer's name or color changed. Used by `connectMap`; pages do not need to listen for it.
 */
@customElement('helix-headless-map-buildings')
export class HelixHeadlessMapBuildings extends HelixElement {
  /** More about the buildings. Read after the label in the frame's list. */
  @property()
  description?: string

  /** Marks this as a layer for the frame and the connector, whatever its tag. */
  readonly isMapLayer = true

  /** @internal Which kind of layer, which is how the connector draws it. */
  readonly layerKind = 'buildings' as const

  /** The layer's name in the frame's list. */
  @property()
  label = '3D buildings'

  /** Tells the frame and the connector the layer was renamed or recolored. */
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
    'helix-headless-map-buildings': HelixHeadlessMapBuildings
  }
}
