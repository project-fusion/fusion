import { customElement } from '@helix-io/core'
import { HelixBaseIcon } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { styles } from './icon-root.css.js'

/**
 * @summary Renders a named icon from the Helix set.
 *
 * @description
 * Draws in `currentColor` and sizes from `--icon-size`, so an icon inherits the
 * color of the text it sits in and a container can resize it without reaching
 * for a prop. Inside a button that hook is set in `em`, which keeps the icon in
 * proportion as the button's own size changes.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Glyph, Symbol
 * @documentation https://helix.fusion.dev/components/icon
 *
 * @csspart svg - The rendered SVG.
 *
 * @cssproperty --icon-size - Edge length of the icon's box.
 */
@customElement('helix-icon')
export class HelixIcon extends HelixBaseIcon {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-icon': HelixIcon
  }
}
