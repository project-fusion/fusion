import { customElement, HelixElement } from '@helix-io/core'
import { html, nothing, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary A passage set off from the prose around it.
 *
 * @description
 * Renders a real `<blockquote>` with a `<footer>` for the attribution, which is
 * the structure the HTML spec describes for exactly this: the attribution is
 * about the quotation rather than part of it, and putting it inside the quoted
 * text claims the source said their own name.
 *
 * A quotation run inside a sentence is a `Quote`, which is a different element
 * because it is a different job.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Pullquote, Citation, Excerpt
 * @documentation https://helix.fusion.dev/components/blockquote
 *
 * @slot - The quoted passage.
 * @slot attribution - Who said it, and where.
 *
 * @csspart blockquote - The quotation.
 * @csspart attribution - The footer carrying the source.
 */
@customElement('helix-base-blockquote')
export class HelixBaseBlockquote extends HelixElement {
  /** URL identifying where the passage came from. */
  @property()
  cite = ''

  protected override render(): TemplateResult {
    // The footer is a bare slot inside a real `<footer>`: the element is the
    // semantics and cannot be omitted, while an unfilled slot inside it is
    // `display: contents` and generates no box.
    return html`<blockquote part="blockquote" cite=${this.cite || nothing}>
      <slot></slot>
      <footer part="attribution"><slot name="attribution"></slot></footer>
    </blockquote>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-blockquote': HelixBaseBlockquote
  }
}
