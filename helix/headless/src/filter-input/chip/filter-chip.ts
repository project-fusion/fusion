import { customElement, HelixElement, MixinDismissible } from '@fusion.dev/helix-core'
import { x } from '@fusion.dev/helix-icons'
import { html, nothing, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'

/**
 * @summary One filter in force: a field, how it is compared, and to what.
 *
 * @description
 * A chip is the readable form of the thing `FilterField` declares. It carries
 * the three parts a filter has and a control that asks for it to go.
 *
 * **The operator is drawn only when it is worth drawing**, which is the whole
 * reason the common case reads as plainly as it does:
 *
 * ```
 * Disposition   refunded, chargeback         the field's usual comparison, unwritten
 * Disposition   is not   refunded            a comparison somebody chose, so it shows
 * Created       after    1 Aug               a scalar, which has no usual comparison
 * ```
 *
 * A reader ticking two values in a menu gets the first, with no jargon on it. A
 * reader who reaches for a comparison gets the third, which explains itself the
 * first time they see one. The rule is one line: **omit `operator-label` for the
 * field's default operator and pass it for every other.** Whoever builds the
 * chip holds the field, and the field knows which its default is.
 *
 * **It shows a filter and never applies one.** Dismissing is a request, the way
 * it is on `Tag` and `Announcement`: the chip is the consumer's element in a
 * consumer's list, and taking it out from under them would put their model and
 * the document out of step. `preventDefault()` on the `helix-dismiss` is a
 * refusal, and that is also how a consumer takes control of the interaction for
 * one press: `requestChange` documents the whole pattern, and its first line is
 * that control is an action rather than a mode.
 *
 * **Changing the comparison belongs to whatever is slotted into `operator`.** A
 * menu trigger there makes the segment a control; the text fallback makes it a
 * label. This element does not learn either, for the reason `FilterOperator`
 * gives: what the words mean is the domain's.
 *
 * @since 0.23.0
 * @status experimental
 * @category forms
 * @aliases FilterToken, FacetChip
 * @documentation https://helix.fusion.dev/components/filter-input
 *
 * @slot - What the field is compared to, which is usually text and may be
 * anything a consumer wants read there.
 * @slot field - Replaces the field's name, for a chip that wants a mark beside
 * it or a shortened form.
 * @slot operator - Replaces the comparison, and is where a control that changes
 * it goes.
 *
 * @event {HelixDismissEvent} helix-dismiss - Fired when the reader asks to remove the filter. Cancelable: refusing it takes the decision and nothing moves.
 *
 * @csspart dismiss - The control that asks to remove the filter.
 * @csspart dismiss-mark - The glyph on the dismiss control, where none is slotted.
 * @csspart field - The name of what is being filtered.
 * @csspart operator - How it is compared, drawn only where there is one to draw.
 * @csspart values - What it is compared to.
 */
@customElement('helix-headless-filter-chip')
export class HelixHeadlessFilterChip extends MixinDismissible(HelixElement) {
  /* "Remove filter" rather than the mixin's "Dismiss", for the reason `Tag`
     gives its own override: the control's name is what a screen-reader user
     hears, and taking a filter out of a set is not closing a message. A page
     with several chips should say which, and `dismiss-label` is how. */
  override dismissLabel = 'Remove filter'

  /**
   * The field this filter is on, as a reader sees it.
   *
   * The slot's fallback rather than the slot's replacement: a consumer who wants
   * a mark beside the name slots `field` and this goes unused.
   */
  @property()
  label = ''

  /**
   * The field this filter is on, as the consumer's model calls it.
   *
   * Never shown. Reflected, because a consumer removing one filter from a list
   * of them selects on this, and so undefaulted for the reason `operator` gives.
   *
   * **A chip built in script should be given the attribute, not the property**,
   * if the next thing to happen might select on it. Reflection is written on
   * this element's next update rather than during the assignment, so a second
   * `helix-facet` for the same field arriving in the same frame selects nothing,
   * builds a second chip, and leaves the row holding two of one filter. The
   * lookup then finds whichever came first, so dismissing one chip takes the
   * other away. `setAttribute('name', field)` is true immediately and costs
   * nothing; the property is for markup and for frameworks that write both.
   */
  @property({ reflect: true })
  name?: string

  /**
   * What the consumer's own model calls the comparison in force.
   *
   * Never shown, and it is what a consumer matches on when the chip comes back
   * to them. `label` translates; this does not.
   *
   * Reflected and so undefaulted: a reflected property with a default writes an
   * attribute on upgrade that the server never wrote, and the two markups differ
   * before a reader has touched anything.
   */
  @property({ reflect: true })
  operator?: string

  /**
   * The comparison, as a reader sees it, and empty for the field's usual one.
   *
   * **Empty is the whole design and not an oversight.** A chip drawn for the
   * comparison a field is normally filtered by says the field and the values and
   * nothing between them, because a word every chip carries is a word nobody
   * reads. The moment somebody picks a different comparison it appears, which
   * makes an unusual filter look unusual.
   */
  @property({ attribute: 'operator-label' })
  operatorLabel = ''

  protected override render(): TemplateResult {
    /* Asked of the slot as well as the property, so a consumer who slots a
       control into `operator` gets the segment drawn even with no label to put
       in it. `assignedNodes` is not available before the first render, so the
       property is what decides on the server and the slot corrects it after. */
    const operator = this.operatorLabel !== '' || this.querySelector('[slot="operator"]') !== null

    /* And the values box only where there are values.
     *
     * A comparison of arity `none`, `is empty` or `is set`, is a filter that
     * carries none and never will, so the chip for one is a field and a word.
     * Drawn unconditionally it left an empty box in the row, which the gap
     * either side of it turned into a visible step of dead space after the
     * word. Default slot only, for the reason `MixinDismissible` gives: a node
     * assigned to `field` or `operator` belongs to another region. */
    const values = [...this.childNodes].some((node) =>
      node instanceof Element ? node.slot === '' : (node.textContent ?? '').trim() !== '',
    )

    return html`<span part="field"><slot name="field">${this.label}</slot></span>
      ${
        operator
          ? html`<span part="operator"><slot name="operator">${this.operatorLabel}</slot></span>`
          : nothing
      }
      ${values ? html`<span part="values"><slot></slot></span>` : nothing}
      ${
        this.dismissible
          ? html`<button
              part="dismiss"
              type="button"
              aria-label=${this.dismissLabel}
              @click=${() => this.dismiss()}
            >
              <svg part="dismiss-mark" fill="currentColor" viewBox=${x.viewBox} aria-hidden="true">
                ${unsafeSVG(x.content)}
              </svg>
            </button>`
          : nothing
      }`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-filter-chip': HelixHeadlessFilterChip
  }
}
