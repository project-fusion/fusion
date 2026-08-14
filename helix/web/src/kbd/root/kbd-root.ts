import { customElement } from '@helix-io/core'
import { HelixBaseKbd } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { styles } from './kbd-root.css.js'

/**
 * @summary A keyboard key or chord, set inline with text.
 *
 * @description
 * Drawn as a physical key: a hairline, a sunken fill, and one inset shadow
 * along the bottom edge that reads as depth without becoming a picture of a
 * key.
 *
 * Sized in `em`, so it stays proportional to whatever it is set inside rather
 * than holding one size and looking wrong in a heading.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Key, Shortcut, Hotkey
 * @documentation https://helix.fusion.dev/components/kbd
 *
 * @cssproperty --kbd-background-color - Fill of the key.
 * @cssproperty --kbd-border-color - Colour of the hairline and the edge.
 */
@customElement('helix-kbd')
export class HelixKbd extends HelixBaseKbd {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-kbd': HelixKbd
  }
}
