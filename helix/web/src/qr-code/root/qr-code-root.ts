import { customElement } from '@helix-io/core'
import { HelixBaseQrCode } from '@helix-io/headless/qr-code'
import type { CSSResultGroup } from 'lit'
import { styles } from './qr-code-root.css.js'

/**
 * @summary Encodes a short piece of text as a scannable square.
 *
 * @description
 * The picture is the base tier's. What this adds is a size that can be set
 * once, the colours a scanner needs, and the box that holds a center mark.
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
 * @documentation https://helix.fusion.dev/components/qr-code
 *
 * @cssproperty --qr-code-size - How wide the square is. Defaults to `12rem`.
 * @cssproperty --qr-code-color - The dark modules. Defaults to the page's ink.
 * @cssproperty --qr-code-finder-color - The three corner squares. Defaults to
 * the same ink as the modules.
 * @cssproperty --qr-code-background-color - Behind them, including the quiet zone.
 * @cssproperty --qr-code-logo-size - How much of the middle a mark may cover.
 * Defaults to `27%`, which `H` correction carries: it can lose thirty percent.
 * @cssproperty --qr-code-logo-inset - The quiet zone around that mark.
 */
@customElement('helix-qr-code')
export class HelixQrCode extends HelixBaseQrCode {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-qr-code': HelixQrCode
  }
}
