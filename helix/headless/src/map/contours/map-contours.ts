import { customElement, HelixElement, HelixMapPartChangeEvent } from '@fusion.dev/helix-core'
import { nothing, type PropertyValues } from 'lit'
import { property } from 'lit/decorators.js'
import type { MapTerrainEncoding } from '../terrain/map-terrain.js'

/**
 * @summary Contour lines on a map, each at one height, labeled at every fifth.
 *
 * @description
 * `connectMap` traces lines of equal height from elevation tiles, the same
 * tiles `helix-map-terrain` reads, and draws them under the roads. The lines
 * are closer together as the map zooms in, and every fifth, the index line,
 * is heavier and labeled with its height. They show from zoom 9.
 *
 * Set `src` to an elevation tile URL with `{z}`, `{x}`, and `{y}` in it, and
 * `encoding` to how its tiles store heights. Set `unit` to `feet` to label
 * the heights in feet. Put the provider's credit in `attribution`.
 *
 * MapLibre draws the lines. The frame lists the layer by its `label` for
 * screen readers.
 *
 * @since 0.105.0
 * @status experimental
 * @category media
 * @aliases Contours, Topographic lines, Elevation lines, Isolines
 * @documentation https://fusion.dev/helix/components/map
 *
 * @event {HelixMapPartChangeEvent} helix-map-part-change - The tiles, the unit, or the layer's name or color changed. Used by `connectMap`; pages do not need to listen for it.
 */
@customElement('helix-headless-map-contours')
export class HelixHeadlessMapContours extends HelixElement {
  /** The elevation provider's credit, shown in the frame's footer. Links in it stay links. */
  @property()
  attribution?: string

  /** More about the lines. Read after the label in the frame's list. */
  @property()
  description?: string

  /** How the tiles store heights in their colors: `terrarium` or `mapbox`. */
  @property()
  encoding: MapTerrainEncoding = 'terrarium'

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
  readonly layerKind = 'contours' as const

  /** The layer's name in the frame's list. */
  @property()
  label = 'Contour lines'

  /** The deepest zoom the provider has tiles for. */
  @property({ attribute: 'max-zoom', type: Number })
  maxZoom?: number

  /** One elevation tile URL with `{z}`, `{x}`, and `{y}` in it. */
  @property()
  src?: string

  /** The unit the heights are labeled in: `meters` or `feet`. */
  @property()
  unit: 'feet' | 'meters' = 'meters'

  /** Tells the frame and the connector the layer changed. */
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
    'helix-headless-map-contours': HelixHeadlessMapContours
  }
}
