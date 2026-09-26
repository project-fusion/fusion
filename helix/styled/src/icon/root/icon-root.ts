import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessIcon } from '@fusion.dev/helix-headless/icon'
import type { CSSResultGroup } from 'lit'
import { styles } from './icon-root.css.js'

/**
 * @summary A named icon from the Helix set.
 *
 * @description
 * Draws in `currentColor` and sizes from `--icon-size`, so an icon inherits the
 * color of the text it sits in and a container can resize it without reaching
 * for a prop. Inside a button that hook is set in `em`, which keeps the icon in
 * proportion as the button's own size changes.
 *
 * @since 0.1.0
 * @status stable
 * @category media
 * @aliases Glyph, Symbol
 * @documentation https://fusion.dev/helix/components/icon
 *
 * @csspart svg - The rendered SVG.
 *
 * @cssproperty --icon-size - The width and height of the icon's box.
 */
@customElement('helix-icon')
export class HelixIcon extends HelixHeadlessIcon {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-icon': HelixIcon
  }
}
