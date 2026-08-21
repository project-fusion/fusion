import { customElement, HelixElement } from '@helix-io/core'
import { html, type TemplateResult } from 'lit'

/**
 * @summary A fragment of code inside a line of prose.
 *
 * @description
 * **A real `<code>`, because the element is the meaning.** A styled span reads
 * as code and is not: a screen reader announces nothing about it, a translation
 * tool will happily translate it, and a search that understands documents
 * cannot tell it from emphasis. The tag is the whole point, which is also why
 * this component is so small.
 *
 * **Inline, and only inline.** A block of code is `CodeBlock`, a separate
 * family rather than a variant here. The two differ in more than presentation:
 * one flows with a sentence and must never scroll, the other is a figure with
 * its own box, its own overflow and something to copy. Namespacing them
 * together would say `CodeBlock` is part of `Code`, and it is not.
 *
 * @since 0.1.0
 * @status stable
 * @category content
 * @aliases Inline code, Kbd
 * @documentation https://helix.fusion.dev/components/code
 *
 * @slot - The code.
 *
 * @csspart code - The `<code>` element.
 */
@customElement('helix-base-code')
export class HelixBaseCode extends HelixElement {
  protected override render(): TemplateResult {
    return html`<code part="code"><slot></slot></code>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-code': HelixBaseCode
  }
}
