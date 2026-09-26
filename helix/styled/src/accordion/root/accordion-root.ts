import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessAccordion } from '@fusion.dev/helix-headless/accordion'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './accordion-root.css.js'

/**
 * @summary A group of collapsible sections.
 *
 * @description
 * Items share one rule between neighbors rather than each drawing its own, so
 * the seam between two items is one pixel and not two. Those seams are what
 * carry the grouping, which is why the surrounding frame is opt-in rather than
 * the default: an accordion is a list, where a card is a surface.
 *
 * @since 0.1.0
 * @status stable
 * @category layout
 * @aliases Collapse, Expander group
 * @documentation https://fusion.dev/helix/components/accordion
 *
 * @slot - The accordion's items.
 *
 * @cssproperty --accordion-border-color - The color of the lines between items, and of each item's border when outlined.
 * @cssproperty --accordion-gap - The space between items when outlined. Otherwise items share an edge.
 * @cssproperty --accordion-radius - The corner radius of each item when outlined.
 */
@customElement('helix-accordion')
export class HelixAccordion extends HelixHeadlessAccordion {
  /**
   * How the items are set off from the page. `plain` draws a line between
   * items, and `outlined` draws a border around each item.
   *
   * Two of the axis's four values, which is what this surface has meaning for:
   * a stack of items is already told apart by its seams, so a lift would be a
   * third statement and a fill a second.
   *
   * - `plain` is the default and is what an application usually wants: the
   *   seams between items already say the items are one set, so a frame is a
   *   second statement of the same thing. Inside a card, a panel, a dialog or a
   *   sidebar, it is a line and no meaning.
   * - `outlined` frames **each item**, for an accordion sitting directly on the
   *   page where nothing else says where the rows begin and end. A marketing
   *   page's FAQ is the case it is for. Per item rather than around the stack,
   *   because a frame around a set of hairline-separated rows repeats what the
   *   hairlines already said, where a frame around each one makes every item a
   *   thing that opens and leaves the set to be said by their alignment.
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
