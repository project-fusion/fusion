import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessQrCode } from '@fusion.dev/helix-headless/qr-code'
import type { CSSResultGroup } from 'lit'
import { styles } from './qr-code-root.css.js'

/**
 * @summary A scannable QR code for a short piece of text.
 *
 * @description
 * The picture is the headless tier's. What this adds is a size that can be set
 * once, the colors a scanner needs, and the box that holds a center mark.
 *
 * **The ink is `currentColor` and the ground is a real fill.** A code has to be
 * dark on light to read, and the pair that guarantees it is not the page's
 * foreground and background: those invert together in dark mode, and a code
 * drawn light-on-dark is refused by a good half of the scanners in the world.
 * So the ground is stated and the ink is the foreground it is chosen for.
 *
 * @since 0.1.0
 * @status stable
 * @category media
 * @documentation https://fusion.dev/helix/components/qr-code
 *
 * @cssproperty --qr-code-background-color - The fill behind the modules, including the quiet zone.
 * @cssproperty --qr-code-color - Color of the dark modules. Defaults to the page's text color.
 * @cssproperty --qr-code-finder-color - Color of the three corner squares. Defaults
 * to the color of the modules.
 * @cssproperty --qr-code-logo-padding - The clear space around the center logo.
 * @cssproperty --qr-code-logo-size - How much of the center a logo can cover.
 * Defaults to `27%`, which `H` correction allows, because it can lose thirty percent.
 * @cssproperty --qr-code-size - How wide the square is. Defaults to `12rem`.
 */
@customElement('helix-qr-code')
export class HelixQrCode extends HelixHeadlessQrCode {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-qr-code': HelixQrCode
  }
}
