import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessSlider } from '@fusion.dev/helix-headless/slider'
import type { CSSResultGroup } from 'lit'
import { styles as fieldStyles } from '../../shared/field/field.css.js'
import { styles as fieldStackedStyles } from '../../shared/field/field-stacked.css.js'
import { styles } from './slider-root.css.js'

/**
 * @summary A value chosen from a range by dragging.
 *
 * @description
 * The track and the thumb are the browser's own, restyled through the range
 * pseudo-elements rather than replaced. What that buys is everything a
 * hand-built slider has to reimplement and usually gets slightly wrong: the
 * drag, the keys, and a hit area sized by the platform for a finger.
 *
 * The filled part of the track is painted with a gradient driven by the
 * fraction the headless tier writes, rather than by a second element laid over
 * it. One element cannot be half one color by any other means that survives
 * the thumb being dragged.
 *
 * @since 0.1.0
 * @status stable
 * @category forms
 * @aliases Range, Range input
 * @documentation https://fusion.dev/helix/components/slider
 *
 * @cssproperty --slider-fill-color - The color of the filled part of the track, behind the thumb.
 * @cssproperty --slider-length - The length of a vertical track. It defaults to nine rem and applies only when `orientation` is `vertical`. A horizontal track takes the width of its row.
 * @cssproperty --slider-marker-color - The color of the marks along the track.
 * @cssproperty --slider-thumb-color - The color of the thumb.
 * @cssproperty --slider-thumb-length - The thumb's size along the track. It follows `--slider-thumb-size` unless you set it, and setting one of the two makes the thumb an oval.
 * @cssproperty --slider-thumb-radius - The thumb's corner radius. It is fully round by default, so a thumb with two different dimensions is a capsule unless you change it.
 * @cssproperty --slider-thumb-ring-color - The color of the ring between the thumb and the track. Set it for a slider that sits on a surface other than the page background.
 * @cssproperty --slider-thumb-size - The thumb's size across the track. It equals the length by default, which makes the thumb round.
 * @cssproperty --slider-track-color - The color of the unfilled part of the track.
 * @cssproperty --slider-track-image - An image for the whole track, such as a gradient for a slider whose value is a color.
 * @cssproperty --slider-track-size - The thickness of the track. It matches the progress bar's size by default.
 */
@customElement('helix-slider')
export class HelixSlider extends HelixHeadlessSlider {
  static override styles: CSSResultGroup = [fieldStyles, fieldStackedStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-slider': HelixSlider
  }
}
