import { customElement } from '@helix-io/core'
import { HelixBaseAccordion } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './accordion-root.css.js'

/**
 * @summary Groups collapsible sections, one open at a time by default.
 *
 * @description
 * Items share one rule between neighbours rather than each drawing its own, so
 * the seam between two items is one pixel and not two. Those seams are what
 * carry the grouping, which is why the surrounding frame is opt-in rather than
 * the default: an accordion is a list, where a card is a surface.
 *
 * @since 0.1.0
 * @status experimental
 * @category layout
 * @aliases Collapse, Expander group
 * @documentation https://helix.fusion.dev/components/accordion
 *
 * @slot - The accordion's items.
 *
 * @cssproperty --accordion-border-color - Color of the seams, and of the frame when outlined.
 * @cssproperty --accordion-radii - Corner radius of the stack, when outlined.
 */
@customElement('helix-accordion')
export class HelixAccordion extends HelixBaseAccordion {
  /**
   * Whether the stack is framed.
   *
   * - `plain` is the default and is what an application usually wants: the
   *   seams between items already say the items are one set, so a frame is a
   *   second statement of the same thing. Inside a card, a panel, a dialog or a
   *   sidebar, it is a line and no meaning.
   * - `outlined` frames the stack, for an accordion sitting directly on the
   *   page where nothing else says where it starts and stops. A marketing
   *   page's FAQ is the case it is for.
   *
   * Both are writable, so a generated page can say which it means rather than
   * relying on the absence of an attribute.
   */
  @property({ reflect: true })
  appearance?: 'outlined' | 'plain'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-accordion': HelixAccordion
  }
}
