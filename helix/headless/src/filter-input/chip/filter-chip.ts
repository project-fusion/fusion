import { customElement, HelixElement, MixinDismissible } from '@fusion.dev/helix-core'
import { x } from '@fusion.dev/helix-icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'

/**
 * @summary One active filter: a field, a comparison, and the values it is compared to.
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
 * @status stable
 * @category forms
 * @aliases FilterToken, FacetChip
 * @documentation https://fusion.dev/helix/components/filter-input
 *
 * @slot - The values the field is compared to, usually as text. It takes any
 * content you want shown there.
 * @slot field - Replaces the field's name. Use it to put an icon beside the name
 * or to shorten it.
 * @slot operator - Replaces the comparison. Put a control that changes the
 * comparison here.
 *
 * @event {HelixDismissEvent} helix-dismiss - Fired when the user asks to remove the filter. Cancelable: call `preventDefault()` to keep the chip.
 *
 * @csspart dismiss - The button that removes the filter.
 * @csspart dismiss-mark - The icon on the remove button, shown when no icon is slotted.
 * @csspart field - The name of what is being filtered.
 * @csspart operator - The comparison, drawn only when there is one to show.
 * @csspart values - The values the field is compared to.
 */
@customElement('helix-headless-filter-chip')
export class HelixHeadlessFilterChip extends MixinDismissible(HelixElement) {
  /* "Remove filter" rather than the mixin's "Dismiss", for the reason `Tag`
     gives its own override: the control's name is what a screen-reader user
     hears, and taking a filter out of a set is not closing a message. A page
     with several chips should say which, and `dismiss-label` is how. */
  override dismissLabel = 'Remove filter'

  /**
   * The name of the field the filter is on, as shown on the chip.
   *
   * The slot's fallback rather than the slot's replacement: a consumer who wants
   * a mark beside the name slots `field` and this goes unused.
   */
  @property()
  label = ''

  /**
   * The name of the field the filter is on, in your data model.
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
   * The name of the active comparison in your data model.
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
   * The comparison as shown on the chip. Leave it empty for the field's usual
   * comparison.
   *
   * **Empty is the whole design and not an oversight.** A chip drawn for the
   * comparison a field is normally filtered by says the field and the values and
   * nothing between them, because a word every chip carries is a word nobody
   * reads. The moment somebody picks a different comparison it appears, which
   * makes an unusual filter look unusual.
   */
  @property({ attribute: 'operator-label' })
  operatorLabel = ''

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.finishHydration()
  }

  protected override render(): TemplateResult {
    /* Asked of the children as well as the property, so a consumer who slots a
       control into `operator` gets the segment drawn even with no label to put
       in it. The children are what a render may know of them: none on a server,
       whose shim has no tree and threw here, and none while hydrating what one
       sent, so the property decides there and the update after corrects it. */
    const operator =
      this.operatorLabel !== '' || this.knownChildren.some((child) => child.slot === 'operator')

    /* And the values box only where there are values.
     *
     * A comparison of arity `none`, `is empty` or `is set`, is a filter that
     * carries none and never will, so the chip for one is a field and a word.
     * Drawn unconditionally it left an empty box in the row, which the gap
     * either side of it turned into a visible step of dead space after the
     * word. Default slot only, for the reason `MixinDismissible` gives: a node
     * assigned to `field` or `operator` belongs to another region.
     *
     * Drawn where the children cannot be known, a server and the render that
     * has to be its: without the slot, the values a server sends are not shown
     * until hydration, and an empty box for a moment is the smaller fault. */
    const values =
      !this.childrenKnown ||
      [...this.childNodes].some((node) =>
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
