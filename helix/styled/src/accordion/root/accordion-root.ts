import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessAccordion } from '@fusion.dev/helix-headless/accordion'
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
 * @cssproperty --accordion-radius - Corner radius of the stack, when outlined.
 */
@customElement('helix-accordion')
export class HelixAccordion extends HelixHeadlessAccordion {
  /**
   * How the stack separates itself from the page.
   *
   * Two of the axis's four values, which is what this surface has meaning for:
   * a stack of items is already told apart by its seams, so a lift would be a
   * third statement and a fill a second.
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
  separation?: 'outlined' | 'plain'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-accordion': HelixAccordion
  }
}
