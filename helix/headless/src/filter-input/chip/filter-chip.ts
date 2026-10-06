import { customElement, HelixElement, MixinDismissible, slottedWords } from '@fusion.dev/helix-core'
import { x } from '@fusion.dev/helix-icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'

/**
 * @summary One active filter: a field, a comparison, and the values it is compared to.
 *
 * @description
 * Shows one filter declared by a `FilterField`: the field, the operator, and
 * the values, with a control to remove the filter.
 *
 * The operator is shown only when it is not the field's default:
 *
 * ```
 * Disposition   refunded, chargeback         default operator, hidden
 * Disposition   is not   refunded            chosen operator, shown
 * Created       after    1 Aug               a scalar field has no default
 * ```
 *
 * Omit `operator-label` for the field's default operator and pass it for every
 * other operator. The code that builds the chip has the field, and the field
 * defines its default.
 *
 * The chip shows a filter and does not apply it. Dismissing fires
 * `helix-dismiss` as a request, as on `Tag` and `Announcement`. The chip is
 * your element in your list, so you remove it, which keeps your model and the
 * document in step. Call `preventDefault()` on `helix-dismiss` to cancel the
 * dismissal, which is also how you take control of the interaction for one
 * press. `requestChange` documents the pattern.
 *
 * The remove button is named `dismiss-label` followed by the chip's words,
 * such as "Remove filter Status is not open", so a row of chips says which
 * filter each button removes. Write `{label}` in `dismiss-label` to put the
 * words elsewhere.
 *
 * To let the user change the operator, slot a menu trigger into `operator`.
 * With the text fallback, the operator is a label. The chip does not interpret
 * operators: their meaning belongs to your domain, as `FilterOperator`
 * explains.
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
     hears, and taking a filter out of a set is not closing a message. The
     chip's own words follow it, so several chips are told apart: see
     `removeName`. */
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

  /**
   * The remove button's name: `dismissLabel` with the chip's words, its field,
   * its comparison and its values, such as "Remove filter Status is not open".
   *
   * **Named for its chip**, as File Input names each remove button for its
   * file: a row of buttons each called "Remove filter" says nothing about
   * which filter each one takes away. `{label}` in `dismiss-label` says where
   * the words go, and without it they follow the label.
   *
   * Each word is read from what is slotted and otherwise from `label` and
   * `operator-label`, which is all a server and a hydrating render can read,
   * so the values join the update after.
   */
  private get removeName(): string {
    const read = (slot: string, fallback: string): string =>
      (this.childrenKnown && slottedWords(this, [slot])) || fallback
    const words = [read('field', this.label), read('operator', this.operatorLabel), read('', '')]
      .filter(Boolean)
      .join(' ')
    const label = this.dismissLabel
    return label.includes('{label}') ? label.replace('{label}', words) : `${label} ${words}`.trim()
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    /* On the root, so new values rename the remove button: a `slotchange`
       bubbles to it from any of the three slots. */
    this.renderRoot.addEventListener('slotchange', () => this.requestUpdate())
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
              aria-label=${this.removeName}
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
