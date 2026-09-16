import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessAccordionItem } from '@fusion.dev/helix-headless/accordion'
import type { CSSResultGroup } from 'lit'
import { styles } from './accordion-item.css.js'

/**
 * @summary One collapsible section of an accordion.
 *
 * @description
 * The open and close transition animates `grid-template-rows` from `0fr` to
 * `1fr`, which is the only technique that reaches the content's intrinsic
 * height without measuring it in JavaScript. It is disabled under
 * `prefers-reduced-motion`.
 *
 * Usable on its own as a disclosure, with no accordion around it.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Collapsible, Expander, Disclosure
 * @documentation https://fusion.dev/helix/components/accordion
 *
 * @slot - The content revealed when open.
 * @slot summary - The always-visible trigger content.
 *
 * @csspart chevron - The open and close indicator.
 * @csspart container - The outer wrapper.
 * @csspart content - The revealed region.
 * @csspart content-inner - The clipping box inside the animated region. The inset is on the slot within it, not here: padding on the grid item survives a zero track, which left a shut section with a band of space under it.
 * @csspart trigger - The clickable summary row.
 *
 * @cssproperty --accordion-item-padding - Inset of the trigger and content.
 */
@customElement('helix-accordion-item')
export class HelixAccordionItem extends HelixHeadlessAccordionItem {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-accordion-item': HelixAccordionItem
  }
}
