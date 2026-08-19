import { customElement } from '@helix-io/core'
import { HelixBaseColorPicker } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
/* Side-effect import, because the tier below renders `<helix-slider>` and a
   custom element registers on import. Inherited from the base along with the
   template, which is why it has to be restated here: this file has no
   `<helix-slider>` in it to remind anyone. `check:composed` enforces it. */
import '../../button/index.js'
import '../../button-group/index.js'
import '../../icon/index.js'
import '../../slider/index.js'
import { styles } from './color-picker-root.css.js'

/**
 * @summary Picks a colour, from a square and two ramps.
 *
 * @description
 * **The square is painted in three layers, not composited from elements**: the
 * hue underneath, white sliding in from the left to take the saturation out,
 * black rising from the bottom to take the brightness out. One element, one
 * declaration, and it repaints as the hue moves because the hue is a custom
 * property the tier below writes.
 *
 * **The two range inputs over it are invisible and still there.** Not
 * `display: none` and not `visibility: hidden`, either of which would take them
 * out of the tab order and out of the accessibility tree, which is the entire
 * reason a square built this way is reachable at all. They carry
 * `pointer-events: none` so the square answers the pointer itself, and the focus
 * ring is drawn on the square rather than on them, so it lands where the reader
 * is looking.
 *
 * **Every chip sits on a checkerboard.** A colour with alpha painted on a solid
 * background is just a different colour, and the one thing a preview owes a
 * reader is the difference between "pale blue" and "blue, half transparent".
 *
 * No padding and no surface of its own. Flat on a page it takes the space it is
 * given, and in Input Color's panel the panel supplies both: a picker that
 * brought its own card would be a card inside a card there.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Color, ColorArea, Swatch picker
 * @documentation https://helix.fusion.dev/components/color-picker
 *
 * @cssproperty --color-picker-inset - Inset of the rows under the square, and the bottom.
 * @cssproperty --color-picker-sample-size - Edge length of the chip that copies the value.
 * @cssproperty --color-picker-swatch-size - Edge length of one preset.
 * @cssproperty --color-picker-grid-ratio - Aspect ratio of the square.
 * @cssproperty --color-picker-grid-radii - Corner radius of the square.
 */
@customElement('helix-color-picker')
export class HelixColorPicker extends HelixBaseColorPicker {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-color-picker': HelixColorPicker
  }
}
