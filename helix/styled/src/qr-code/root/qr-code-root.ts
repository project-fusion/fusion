import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessQrCode } from '@fusion.dev/helix-headless/qr-code'
import type { CSSResultGroup } from 'lit'
import { styles } from './qr-code-root.css.js'

/**
 * @summary A scannable QR code for a short piece of text.
 *
 * @description
 * The headless tier draws the code. The styled tier adds a size you can set
 * once, the colors a scanner needs, and the box that holds a center mark.
 *
 * The ink is `currentColor` and the background is a solid fill. A code must be
 * dark on light to scan. The page's foreground and background invert together
 * in dark mode, and at least half of scanners reject a light-on-dark code, so
 * the background is set explicitly and the ink is the foreground chosen for it.
 *
 * @since 0.1.0
 * @status stable
 * @category media
 * @documentation https://fusion.dev/helix/components/qr-code
 *
 * @cssproperty --qr-code-background-color - The fill behind the modules, including the quiet zone and the logo's box.
 * @cssproperty --qr-code-color - Color of the dark modules. Defaults to the dark media ink, which is the same in both color schemes so the code scans.
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
