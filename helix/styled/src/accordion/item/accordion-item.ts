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
 * @status stable
 * @aliases Collapsible, Expander, Disclosure
 * @documentation https://fusion.dev/helix/components/accordion
 *
 * @slot - The content shown when the section is open.
 * @slot summary - The text of the button that opens and closes the section. Always shown.
 *
 * @csspart chevron - The open and close indicator.
 * @csspart container - The outer wrapper.
 * @csspart content - The region that holds the content.
 * @csspart content-inner - The clipping box inside the animated region. The padding is on the slot inside it, so a closed section leaves no space.
 * @csspart trigger - The button that opens and closes the section, holding the summary.
 *
 * @cssproperty --accordion-item-padding - The padding of the trigger and the content.
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
