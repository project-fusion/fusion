import { customElement } from '@helix-io/core'
import { HelixBaseAccordion } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './accordion-root.css.js'

/**
 * @summary Groups collapsible sections, one open at a time by default.
 *
 * @description
 * Items sit in a single bordered stack, sharing one rule between neighbours
 * rather than each drawing its own, so the seam between two items is one pixel
 * and not two.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Collapse, Expander group
 * @documentation https://helix.fusion.dev/components/accordion
 *
 * @slot - The accordion's items.
 *
 * @csspart container - The stack of items.
 *
 * @cssproperty --accordion-border-color - Color of the surrounding rule.
 * @cssproperty --accordion-radii - Corner radius of the stack.
 */
@customElement('helix-accordion')
export class HelixAccordion extends HelixBaseAccordion {
  /** Removes the surrounding surface, leaving only the separating rules. */
  @property({ reflect: true })
  appearance: 'outlined' | 'plain' = 'outlined'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-accordion': HelixAccordion
  }
}
