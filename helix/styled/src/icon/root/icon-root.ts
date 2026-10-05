import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessIcon } from '@fusion.dev/helix-headless/icon/root'
import type { CSSResultGroup } from 'lit'
import { styles } from './icon-root.css.js'

/**
 * @summary A named icon from the Helix set.
 *
 * @description
 * Draws in `currentColor` and sizes from `--icon-size`, so an icon takes the
 * color of the text around it and a container can resize it without a property.
 * Inside a button, `--icon-size` is set in `em`, so the icon scales with the
 * button.
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
