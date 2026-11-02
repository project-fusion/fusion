import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessOutlineSection } from '@fusion.dev/helix-headless/outline'
import type { CSSResultGroup } from 'lit'
import { styles } from './outline-section.generated.css.js'

/**
 * @summary A section of the page that an outline draws a link for.
 *
 * @description
 * The section has no look of its own, and lays out what it holds as a
 * block. Write one around each section of a page you share between the web
 * and a phone, and an outline with no links of yours draws a link for each.
 *
 * @since 0.224.0
 * @status experimental
 * @category navigation
 * @documentation https://fusion.dev/helix/components/outline
 *
 * @slot - The section's content.
 */
@customElement('helix-outline-section')
export class HelixOutlineSection extends HelixHeadlessOutlineSection {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-outline-section': HelixOutlineSection
  }
}
