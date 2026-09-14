import { customElement, HelixElement, slotFilled } from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
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
 * @status stable
 * @category typography
 * @aliases Pullquote, Citation, Excerpt
 * @documentation https://helix.fusion.dev/components/blockquote
 *
 * @slot - The quoted passage.
 * @slot attribution - Who said it, and where.
 *
 * @csspart attribution - The footer carrying the source.
 * @csspart blockquote - The quotation.
 */
@customElement('helix-headless-blockquote')
export class HelixHeadlessBlockquote extends HelixElement {
  /**
   * URL identifying where the passage came from.
   */
  @property()
  cite = ''

  /**
   * Says on the footer whether there is an attribution in it.
   *
   * A `<footer>` with nothing in it is still a block in the quote's flow and
   * still takes the container's gap, so every blockquote written without an
   * attribution reserved a full space below itself. There is no selector that
   * can ask, `slot:empty` being about a slot's fallback rather than its
   * assigned nodes, so the component asks and says so on the footer inside this
   * shadow root: an attribute on the host is a change to markup the consumer
   * rendered, which React reports on hydration.
   */
  private markEmpty(): void {
    const footer = this.partNamed('attribution')
    const empty = !slotFilled(
      this.renderRoot?.querySelector<HTMLSlotElement>('slot[name="attribution"]'),
    )
    footer?.toggleAttribute('data-empty', empty)
    /* `hidden` beside the mirror, because `data-empty` is a hook the styled
       sheet reads and this tier has no sheet: an empty region left in the box
       tree is a gap a consumer cannot close without knowing to look for it. The
       styled rule stays, because that sheet sets `display` on this part and so
       outranks the UA one. */
    footer?.toggleAttribute('hidden', empty)
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.markEmpty()
  }

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
    'helix-headless-blockquote': HelixHeadlessBlockquote
  }
}
