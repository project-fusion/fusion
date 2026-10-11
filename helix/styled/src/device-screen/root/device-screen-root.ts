import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessDeviceScreen } from '@fusion.dev/helix-headless/device-screen'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
/* Side-effect, for the buttons the inherited template renders. */
import '../../icon-button/index.js'
import { styles as glyphStyles } from '../../shared/glyph/glyph.css.js'
import { styles } from './device-screen-root.css.js'

/**
 * @summary A device's screen, drawn from a stream you supply, that sends taps, swipes, keys, and button presses back to the device.
 *
 * @description
 * The styled device: a dark body around a screen with rounded corners, fitted
 * to the space it is given, with its hardware buttons in a row above it. Give
 * it a height with `block-size` or `--device-screen-block-size`, such as
 * `100%` to fill a pane, and the device keeps its shape inside it.
 *
 * The body is drawn in proportion to the screen, so it keeps its look at any
 * size. `--device-screen-bezel` sets how thick it is at the sides and
 * `--device-screen-bezel-block` at the top and bottom, each as a fraction of
 * the screen's width: `0.25` at the top and bottom draws the forehead and chin
 * of a phone with a Home button. `--device-screen-radius` sets the screen's
 * corners the same way. Set `separation="plain"` to draw the screen alone.
 *
 * For a picture of a real device, put an image of it with a clear screen in
 * the `bezel` slot, set `--device-screen-bezel-color` to `transparent`, and
 * set the two bezel properties to the picture's own margins around its screen,
 * each divided by the width of its screen.
 *
 * @since 0.209.0
 * @status experimental
 * @category media
 * @aliases Simulator, Emulator, Device mirror, Remote screen
 * @documentation https://fusion.dev/helix/components/device-screen
 *
 * @cssproperty --device-screen-bezel - How thick the body is at the sides, as a fraction of the screen's width. `0.045` by default.
 * @cssproperty --device-screen-bezel-block - How thick the body is at the top and bottom, as a fraction of the screen's width. The same as `--device-screen-bezel` by default.
 * @cssproperty --device-screen-bezel-color - The color of the body around the screen.
 * @cssproperty --device-screen-bezel-radius - The body's corners, as a fraction of the screen's width. Round with the screen's corners by default.
 * @cssproperty --device-screen-block-size - The element's height, which holds the device, its buttons, the header, and the footer. `36rem` by default.
 * @cssproperty --device-screen-radius - The screen's corners, as a fraction of the screen's width. `0.13` by default, which is near a recent iPhone's.
 */
@customElement('helix-device-screen')
export class HelixDeviceScreen extends HelixHeadlessDeviceScreen {
  /**
   * How the device stands apart from the page. Absent draws its body around
   * the screen; `plain` draws the screen alone, with its rounded corners.
   */
  @property({ reflect: true })
  separation?: 'plain'

  static override tier = 'helix-'

  static override styles: CSSResultGroup = [glyphStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-device-screen': HelixDeviceScreen
  }
}
