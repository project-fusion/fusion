import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessDivider } from '@fusion.dev/helix-headless/divider'
import type { CSSResultGroup } from 'lit'
import { styles } from './divider-root.css.js'

/**
 * @summary A line that separates content into groups.
 *
 * @description
 * A one-pixel rule in the border color, running the full inline size by
 * default. A vertical divider stretches to its flex parent instead of setting
 * its own height, so it matches whatever it sits beside without being told how
 * tall that is.
 *
 * @since 0.1.0
 * @status stable
 * @category layout
 * @aliases Separator, Rule
 * @documentation https://fusion.dev/helix/components/divider
 *
 * @csspart line - The line.
 *
 * @cssproperty --divider-color - The color of the line.
 * @cssproperty --divider-length - The length of a vertical line. A horizontal line takes the divider's width.
 * @cssproperty --divider-padding - The space removed from both ends of the line.
 * @cssproperty --divider-padding-end - The space removed from the end of the line only.
 * @cssproperty --divider-padding-start - The space removed from the start of the line only.
 * @cssproperty --divider-thickness - The thickness of the line.
 */
@customElement('helix-divider')
export class HelixDivider extends HelixHeadlessDivider {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-divider': HelixDivider
  }
}
