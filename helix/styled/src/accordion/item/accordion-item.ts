import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessAccordionItem } from '@fusion.dev/helix-headless/accordion'
import type { CSSResultGroup } from 'lit'
import { styles } from './accordion-item.css.js'

/**
 * @summary One collapsible section of an accordion.
 *
 * @description
 * The open and close transition animates `grid-template-rows` from `0fr` to
 * `1fr`, which reaches the content's intrinsic height without measuring it in
 * JavaScript. The transition is off under `prefers-reduced-motion`.
 *
 * You can use an item on its own as a disclosure, with no accordion around it.
 *
 * @since 0.1.0
 * @status stable
 * @aliases Collapsible, Expander, Disclosure
 * @documentation https://fusion.dev/helix/components/accordion
 *
 * @slot - The content shown when the section is open.
 * @slot chevron - Replaces the open and close indicator. A slotted icon is sized, colored and
 *   turned like the drawn one.
 * @slot summary - The text of the button that opens and closes the section. Always shown.
 *
 * @csspart chevron - The open and close indicator.
 * @csspart container - The outer wrapper.
 * @csspart content - The region that holds the content.
 * @csspart content-inner - The clipping box inside the animated region. The padding is on the slot inside it, so a closed section leaves no space.
 * @csspart heading - The heading that holds the trigger.
 * @csspart trigger - The button that opens and closes the section, holding the summary.
 *
 * @cssproperty --accordion-item-chevron-color - The color of the open and close indicator.
 * @cssproperty --accordion-item-chevron-hover-color - The indicator's color while the pointer is on the trigger.
 * @cssproperty --accordion-item-color - The color of the trigger's text.
 * @cssproperty --accordion-item-content-color - The color of the content's text.
 * @cssproperty --accordion-item-disabled-opacity - How faint a disabled trigger is drawn.
 * @cssproperty --accordion-item-font-size - The size of the trigger's text.
 * @cssproperty --accordion-item-font-weight - The weight of the trigger's text.
 * @cssproperty --accordion-item-hover-background-color - The trigger's fill while the pointer is on it. Unset, there is none.
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
