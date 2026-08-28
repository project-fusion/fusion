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
 * @status experimental
 * @category forms
 * @aliases Range, Range input
 * @documentation https://helix.fusion.dev/components/slider
 *
 * @cssproperty --slider-fill-color - The part behind the thumb.
 * @cssproperty --slider-length - How long a vertical track is. Nine rem by default, and read only when `orientation` is `vertical`, a horizontal track taking the width of its row.
 * @cssproperty --slider-marker-color - The ticks along the track.
 * @cssproperty --slider-thumb-color - The handle.
 * @cssproperty --slider-thumb-length - The handle along the track. Follows the size unless it is told otherwise, and setting one of the two is what makes the handle an oval.
 * @cssproperty --slider-thumb-radius - The handle's corners. Fully round by default, so a handle given two dimensions is a capsule until this says otherwise.
 * @cssproperty --slider-thumb-ring-color - The fence separating the handle from the track, for a slider that is not on the page.
 * @cssproperty --slider-thumb-size - The handle across the track. Square with the length by default, which is what makes it round.
 * @cssproperty --slider-track-color - The part not yet chosen.
 * @cssproperty --slider-track-image - The whole track, for a slider whose color is the value.
 * @cssproperty --slider-track-size - How thick the track is. The progress bar's own size by default, the two being the same object.
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
