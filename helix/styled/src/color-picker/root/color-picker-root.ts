import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessColorPicker } from '@fusion.dev/helix-headless/color-picker'
import type { CSSResultGroup } from 'lit'
/* Inherited from the base along with the template: this file has none of these
   tags in it to remind anyone. */
import '../../button/index.js'
import '../../button-group/index.js'
import '../../icon/index.js'
import '../../slider/index.js'
import { styles as glyphStyles } from '../../shared/glyph/glyph.css.js'
import { styles } from './color-picker-root.css.js'

/**
 * @summary A color picker made of a square and two ramps.
 *
 * @description
 * The square is one element painted in three layers:
 *
 * - the hue at the bottom
 * - white from the left, which removes saturation
 * - black from the bottom, which removes brightness
 *
 * It repaints as the hue changes, because the hue is a custom property that the
 * headless tier writes.
 *
 * The two range inputs over the square are invisible and stay in the tab order
 * and the accessibility tree, which is what makes the square reachable. They
 * have `pointer-events: none`, so the square handles the pointer, and the focus
 * ring is drawn on the square.
 *
 * Every color chip sits on a checkerboard, so a color with alpha looks
 * transparent. On a solid background, half-transparent blue would look the same
 * as pale blue.
 *
 * The picker has no padding or surface of its own. On a page it takes the space
 * it is given, and inside Color Input the panel supplies both.
 *
 * @since 0.1.0
 * @status stable
 * @category forms
 * @aliases Color, ColorArea, Swatch picker
 * @documentation https://fusion.dev/helix/components/color-picker
 *
 * @cssproperty --color-picker-grid-radius - The corner radius of the square.
 * @cssproperty --color-picker-grid-ratio - The aspect ratio of the square.
 * @cssproperty --color-picker-padding - The inset of the rows under the square and of the picker's bottom edge.
 * @cssproperty --color-picker-sample-size - The width and height of the chip that copies the value.
 * @cssproperty --color-picker-swatch-size - The width and height of one preset.
 */
@customElement('helix-color-picker')
export class HelixColorPicker extends HelixHeadlessColorPicker {
  static override tier = 'helix-'

  static override styles: CSSResultGroup = [glyphStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-color-picker': HelixColorPicker
  }
}
