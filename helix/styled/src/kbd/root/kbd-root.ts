import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessKbd } from '@fusion.dev/helix-headless/kbd'
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
 * @status stable
 * @category typography
 * @aliases Key, Shortcut, Hotkey
 * @documentation https://fusion.dev/helix/components/kbd
 *
 * @cssproperty --kbd-background-color - The fill of the key.
 * @cssproperty --kbd-border-color - The color of the key's border and its bottom edge.
 */
@customElement('helix-kbd')
export class HelixKbd extends HelixHeadlessKbd {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-kbd': HelixKbd
  }
}
