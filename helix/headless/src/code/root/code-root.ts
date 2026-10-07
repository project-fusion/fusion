import { customElement, HelixElement } from '@fusion.dev/helix-core'
import { html, type TemplateResult } from 'lit'

/**
 * @summary A fragment of code inside a line of prose.
 *
 * @description
 * Renders a real `<code>` element, which marks the text as code for translation
 * tools and document search. A styled span carries no such meaning, and a
 * screen reader announces nothing about it.
 *
 * **Set `translate="no"` on the element to keep a page translator off the
 * code.** A translator that rewrites prose would also rewrite an identifier.
 * The slotted text takes its translation mode from the element, its parent in
 * the page, and the element writes nothing onto itself, so the attribute is
 * yours to set. The `<code>` inside carries `translate="no"` for anything the
 * element draws itself.
 *
 * `Code` is inline only and never scrolls. For a block of code with its own
 * box, its own overflow, and copying, use `CodeBlock`, which is a separate
 * family.
 *
 * @since 0.1.0
 * @status stable
 * @category typography
 * @aliases Inline code
 * @documentation https://fusion.dev/helix/components/code
 *
 * @slot - The code.
 *
 * @csspart code - The `<code>` element.
 */
@customElement('helix-headless-code')
export class HelixHeadlessCode extends HelixElement {
  /* **Not written onto the host**, where it would reach the slotted text: an
     attribute the element adds to itself is one a server never sent, which a
     framework reports as a hydration mismatch. */
  protected override render(): TemplateResult {
    return html`<code part="code" translate="no"><slot></slot></code>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-code': HelixHeadlessCode
  }
}
