import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessMenuSection } from '@fusion.dev/helix-headless/menu'
import type { CSSResultGroup } from 'lit'
import { styles } from './menu-section.css.js'

/**
 * @summary A group of rows in a menu, under a heading.
 *
 * @description
 * The heading is set in the menu's small type, quieter than the rows, with the
 * rows' own inset, so it reads as the name of what follows.
 *
 * @since 0.1.0
 * @status stable
 * @aliases Menu group, Menu heading
 * @documentation https://fusion.dev/helix/components/menu
 *
 * @cssproperty --menu-section-heading-color - Color of the heading.
 */
@customElement('helix-menu-section')
export class HelixMenuSection extends HelixHeadlessMenuSection {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-menu-section': HelixMenuSection
  }
}
