import { customElement } from '@helix-io/core'
import { HelixBaseDivider } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { styles } from './divider-root.css.js'

/**
 * @summary Separates content into groups with a rule.
 *
 * @description
 * A one-pixel rule in the border color, running the full inline size by
 * default. A vertical divider stretches to its flex parent instead of setting
 * its own height, so it matches whatever it sits beside without being told how
 * tall that is.
 *
 * @since 0.1.0
 * @status experimental
 * @category layout
 * @aliases Separator, Rule
 * @documentation https://helix.fusion.dev/components/divider
 *
 * @csspart line - The rule itself.
 *
 * @cssproperty --divider-color - Color of the rule.
 * @cssproperty --divider-thickness - Thickness of the rule.
 * @cssproperty --divider-color - Color of the rule.
 * @cssproperty --divider-inset - Space taken off both ends of it.
 * @cssproperty --divider-inset-end - Off the far end only.
 * @cssproperty --divider-inset-start - Off the near end only.
 * @cssproperty --divider-thickness - How heavy the rule is.
 */
@customElement('helix-divider')
export class HelixDivider extends HelixBaseDivider {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-divider': HelixDivider
  }
}
