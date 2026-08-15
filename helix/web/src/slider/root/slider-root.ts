import { customElement } from '@helix-io/core'
import { HelixBaseSlider } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
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
 * it. One element cannot be half one colour by any other means that survives
 * the thumb being dragged.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Range, Range input
 * @documentation https://helix.fusion.dev/components/slider
 *
 * @cssproperty --slider-track-color - The part not yet chosen.
 * @cssproperty --slider-fill-color - The part behind the thumb.
 */
@customElement('helix-slider')
export class HelixSlider extends HelixBaseSlider {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-slider': HelixSlider
  }
}
