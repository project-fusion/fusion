import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessKbd } from '@fusion.dev/helix-headless/kbd'
import type { CSSResultGroup } from 'lit'
import { styles } from './kbd-root.css.js'

/**
 * @summary A keyboard key or chord, set inline with text.
 *
 * @description
 * Drawn as a physical key, with a hairline border, a sunken fill, and one inset
 * shadow along the bottom edge.
 *
 * Sized in `em`, so it stays in proportion with the text around it, including
 * in a heading.
 *
 * @since 0.1.0
 * @status stable
 * @category typography
 * @aliases Key, Shortcut, Hotkey
 * @documentation https://fusion.dev/helix/components/kbd
 *
 * @cssproperty --kbd-background-color - The fill of the key.
 * @cssproperty --kbd-block-size - The height of a key, and the least width of one, in `em` of the text around it.
 * @cssproperty --kbd-border-color - The color of the key's border and its bottom edge.
 * @cssproperty --kbd-color - The color of the key's label.
 * @cssproperty --kbd-font-family - The face of the key's label. Monospaced by default.
 * @cssproperty --kbd-font-size - The size of the key's label, in `em` of the text around it.
 * @cssproperty --kbd-font-weight - The weight of the key's label.
 * @cssproperty --kbd-gap - The space between two keys of a chord under `caps`.
 * @cssproperty --kbd-padding-inline - The space either side of the key's label.
 * @cssproperty --kbd-radius - How far the key's corners are rounded.
 * @cssproperty --kbd-separator-color - The color of the `+` between two keys of a chord under `caps`.
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
