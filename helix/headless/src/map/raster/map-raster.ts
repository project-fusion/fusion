import { customElement, HelixElement, HelixMapPartChangeEvent } from '@fusion.dev/helix-core'
import { nothing, type PropertyValues } from 'lit'
import { property } from 'lit/decorators.js'

/** Reads a list of tile URLs separated by spaces, and writes it back the same way. */
const framesConverter = {
  fromAttribute: (value: string | null): string[] | undefined =>
    value === null ? undefined : value.split(/\s+/).filter((one) => one !== ''),
  toAttribute: (value: string[] | undefined): string | null => value?.join(' ') ?? null,
}

/**
 * @summary Map tiles laid over a map, such as weather radar.
 *
 * @description
 * `connectMap` draws the tiles over the map's land and roads, and under its
 * routes, areas, and place names. Set `ground` to draw them under the roads
 * as well, for imagery of the ground, such as satellite or aerial photographs.
 * Set `max-zoom` to the deepest zoom the provider has tiles for, and the map
 * enlarges those tiles past it. Set `src` to one tile URL with `{z}`, `{x}`,
 * and `{y}` in it, or set `frames` to several, such as the last hour of radar.
 * While `playing` is set, the layer shows the frames in order, `interval`
 * milliseconds each, and starts again from the first.
 *
 * The frames do not play while the user has asked for reduced motion, and the
 * layer shows its last frame. Content that moves for more than five seconds
 * needs a way to pause it, so give `playing` a control on your page.
 *
 * Put the tile provider's credit in `attribution`. The frame shows it beside
 * the map's own credit.
 *
 * @since 0.105.0
 * @status experimental
 * @category media
 * @aliases Weather radar, Tile overlay, Raster layer
 * @documentation https://fusion.dev/helix/components/map
 *
 * @event {HelixMapPartChangeEvent} helix-map-part-change - The tiles, the frame shown, the opacity, or where the tiles are drawn changed. Used by `connectMap`; pages do not need to listen for it.
 */
@customElement('helix-headless-map-raster')
export class HelixHeadlessMapRaster extends HelixElement {
  /** The tile provider's credit, shown in the frame's footer. Links in it stay links. */
  @property()
  attribution?: string

  /** More about the layer. Read after the label in the frame's list. */
  @property()
  description?: string

  /** Which of `frames` shows, counting from `0`. Starts at the last frame. */
  @property({ type: Number })
  frame?: number

  /** Tile URLs to show in order, one per frame, as a list separated by spaces. */
  @property({ converter: framesConverter })
  frames?: string[]

  /**
   * Draws the tiles as the ground, under the map's roads and place names, for
   * imagery such as satellite photographs.
   */
  @property({ type: Boolean })
  ground = false

  /** How long each frame shows while `playing`, in milliseconds. */
  @property({ type: Number })
  interval = 600

  /** Marks this as a layer for the frame and the connector, whatever its tag. */
  readonly isMapLayer = true

  /** @internal Which kind of layer, which is how the connector draws it. */
  readonly layerKind = 'raster' as const

  /** The layer's name in the frame's list. */
  @property()
  label?: string

  /**
   * The deepest zoom the provider has tiles for. The map enlarges those tiles
   * at deeper zooms, where it would otherwise ask for tiles that do not exist.
   */
  @property({ attribute: 'max-zoom', type: Number })
  maxZoom?: number

  /** How opaque the tiles are, from `0` to `1`. */
  @property({ type: Number })
  opacity = 0.7

  /** Whether the frames play in order. Has no effect with one frame, or under reduced motion. */
  @property({ type: Boolean })
  playing = false

  /** One tile URL with `{z}`, `{x}`, and `{y}` in it, for a layer of one frame. */
  @property()
  src?: string

  /** The timer that moves to the next frame while playing. */
  private timer: ReturnType<typeof setInterval> | undefined

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.stopTimer()
  }

  private stopTimer(): void {
    if (this.timer !== undefined) {
      clearInterval(this.timer)
      this.timer = undefined
    }
  }

  /** Starts or stops the timer when the frames, the interval, or `playing` change. */
  private schedule(): void {
    this.stopTimer()
    const count = this.frames?.length ?? 0
    const reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    if (!this.playing || count < 2 || reduced) {
      return
    }
    this.timer = setInterval(
      () => {
        const at = this.frame ?? count - 1
        this.frame = (at + 1) % count
      },
      Math.max(100, this.interval),
    )
  }

  /** Tells the frame and the connector the layer changed, and keeps the timer in step. */
  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    if (changed.has('playing') || changed.has('frames') || changed.has('interval')) {
      this.schedule()
    }
    this.dispatchEvent(new HelixMapPartChangeEvent({ kind: 'layer' }))
  }

  protected override render(): typeof nothing {
    return nothing
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-map-raster': HelixHeadlessMapRaster
  }
}
