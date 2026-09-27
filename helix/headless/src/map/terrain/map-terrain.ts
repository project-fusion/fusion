import { customElement, HelixElement, HelixMapPartChangeEvent } from '@fusion.dev/helix-core'
import { nothing, type PropertyValues } from 'lit'
import { property } from 'lit/decorators.js'

/** How an elevation tile stores its heights in its colors. */
export type MapTerrainEncoding = 'mapbox' | 'terrarium'

/**
 * @summary Hills and mountains on a map, shaded and raised in 3D.
 *
 * @description
 * `connectMap` shades the land by its slopes, from elevation tiles, so hills
 * and valleys show on a flat map. Set `raised` to raise the ground to its real
 * height as well, and tilt the map to see it. Routes, areas, and buildings lie
 * on the raised ground.
 *
 * Set `src` to an elevation tile URL with `{z}`, `{x}`, and `{y}` in it, and
 * `encoding` to how its tiles store heights: `terrarium`, the default, or
 * `mapbox`. Set `max-zoom` to the deepest zoom the provider has tiles for.
 * Put the provider's credit in `attribution`.
 *
 * MapLibre draws the terrain. Leaflet draws maps flat, so a Leaflet map shows
 * none. The frame lists the layer by its `label` for screen readers.
 *
 * @since 0.105.0
 * @status experimental
 * @category media
 * @aliases Terrain, Hillshade, Elevation, Relief
 * @documentation https://fusion.dev/helix/components/map
 *
 * @event {HelixMapPartChangeEvent} helix-map-part-change - The tiles, how the ground is raised, or the layer's name or colors changed. Used by `connectMap`; pages do not need to listen for it.
 */
@customElement('helix-headless-map-terrain')
export class HelixHeadlessMapTerrain extends HelixElement {
  /** The elevation provider's credit, shown in the frame's footer. Links in it stay links. */
  @property()
  attribution?: string

  /** More about the terrain. Read after the label in the frame's list. */
  @property()
  description?: string

  /** How the tiles store heights in their colors: `terrarium` or `mapbox`. */
  @property()
  encoding: MapTerrainEncoding = 'terrarium'

  /** How many times its real height the ground is raised, where `raised` is set. */
  @property({ type: Number })
  exaggeration = 1

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
  readonly layerKind = 'terrain' as const

  /** The layer's name in the frame's list. */
  @property()
  label = 'Terrain'

  /**
   * The deepest zoom the provider has tiles for. The map enlarges those tiles
   * at deeper zooms, where it would otherwise ask for tiles that do not exist.
   */
  @property({ attribute: 'max-zoom', type: Number })
  maxZoom?: number

  /** Raises the ground to its real height in 3D. Tilt the map to see it. */
  @property({ type: Boolean })
  raised = false

  /** One elevation tile URL with `{z}`, `{x}`, and `{y}` in it. */
  @property()
  src?: string

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
    'helix-headless-map-terrain': HelixHeadlessMapTerrain
  }
}
