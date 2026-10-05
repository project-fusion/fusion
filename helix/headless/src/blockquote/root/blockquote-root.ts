import { customElement, HelixElement, markRegion } from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary A passage set off from the prose around it.
 *
 * @description
 * Renders a `<figure>` holding the `<blockquote>` and a `<figcaption>` for the
 * attribution, the structure the HTML spec describes. The attribution sits
 * outside the quotation because it is about the quotation, and it names the
 * figure, so a screen reader reads the source as the figure's caption.
 *
 * The figure keeps the browser's default margins on this tier. Set
 * `::part(figure) { margin: 0 }` where they are unwanted.
 *
 * For a quotation inside a sentence, use `Quote`.
 *
 * @since 0.1.0
 * @status stable
 * @category typography
 * @aliases Pullquote, Citation, Excerpt
 * @documentation https://fusion.dev/helix/components/blockquote
 *
 * @slot - The quoted passage.
 * @slot attribution - Who said it, and where.
 *
 * @csspart attribution - The `<figcaption>` carrying the source.
 * @csspart blockquote - The quotation.
 * @csspart figure - The `<figure>` holding the quotation and its attribution.
 */
@customElement('helix-headless-blockquote')
export class HelixHeadlessBlockquote extends HelixElement {
  /**
   * The URL of the source the passage came from.
   */
  @property()
  cite = ''

  /**
   * Says on the caption whether there is an attribution in it.
   *
   * A `<figcaption>` with nothing in it is still a block in the quote's flow and
   * still takes the container's gap, so every blockquote written without an
   * attribution reserved a full space below itself. There is no selector that
   * can ask, `slot:empty` being about a slot's fallback rather than its
   * assigned nodes, so the component asks and says so on the caption inside this
   * shadow root: an attribute on the host is a change to markup the consumer
   * rendered, which React reports on hydration.
   */
  private markEmpty(): void {
    /* `hidden` beside the mirror, because `data-empty` is the hook a sheet
       selects on and this tier ships none: an empty region left in the box tree
       is a gap a consumer cannot close without knowing to look for it. Both
       stay, since `[hidden]` is a UA rule and a sheet setting `display` on this
       part outranks it. */
    markRegion(this.renderRoot, 'attribution', ['attribution'])
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.markEmpty()
  }

  protected override render(): TemplateResult {
    /* The attribution is a bare slot inside a real `<figcaption>`: the element
       is the semantics and cannot be omitted, while an unfilled slot inside it
       is `display: contents` and generates no box. Beside the `<blockquote>`,
       because the HTML spec puts attribution outside it: inside, it was read as
       part of the quotation. Re-marked on `slotchange`, so an attribution that
       arrives after the first render is shown.

       **The figure names itself from the caption by id.** HTML-AAM names a
       figure from its figcaption, and Chromium does not read the caption's
       words through the slot, so the figure came out unnamed. The reference
       is inside one shadow root and resolves; the caption holds the slot, so
       the words are the consumer's, and an empty caption names nothing. */
    return html`<figure aria-labelledby="attribution" part="figure">
      <blockquote part="blockquote" cite=${this.cite || nothing}><slot></slot></blockquote>
      <figcaption id="attribution" part="attribution"
        ><slot name="attribution" @slotchange=${() => this.markEmpty()}></slot
      ></figcaption>
    </figure>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-blockquote': HelixHeadlessBlockquote
  }
}
