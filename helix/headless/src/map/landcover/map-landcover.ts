import { customElement, HelixElement, HelixMapPartChangeEvent } from '@fusion.dev/helix-core'
import { nothing, type PropertyValues } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary What covers the ground on a map: forest, grass, farmland, wetland, sand, rock, and ice.
 *
 * @description
 * `connectMap` colors the ground by what covers it, from the land cover in
 * the map's own tiles: forest and grass in greens, farmland in wheat,
 * wetland in teal, sand in tan, rock in gray, and ice in pale blue. Each is
 * mixed into the map's land color, so the colors sit in a light or a dark
 * theme. It draws over the map's parks, and under its water and roads.
 *
 * MapLibre draws it, from tiles in the OpenMapTiles schema. The frame lists
 * the layer by its `label` for screen readers.
 *
 * @since 0.105.0
 * @status experimental
 * @category media
 * @aliases Land cover, Land use, Vegetation, Ground cover
 * @documentation https://fusion.dev/helix/components/map
 *
 * @event {HelixMapPartChangeEvent} helix-map-part-change - The layer's name or color changed. Used by `connectMap`; pages do not need to listen for it.
 */
@customElement('helix-headless-map-landcover')
export class HelixHeadlessMapLandcover extends HelixElement {
  /** More about the land cover. Read after the label in the frame's list. */
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
  readonly layerKind = 'landcover' as const

  /** The layer's name in the frame's list. */
  @property()
  label = 'Land cover'

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
    'helix-headless-map-landcover': HelixHeadlessMapLandcover
  }
}
