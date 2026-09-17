import { customElement, HelixElement, MixinSelectableItem } from '@fusion.dev/helix-core'
import { html, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary One choice in a radio group.
 *
 * @description
 * Renders a `<button role="radio">`, not an `<input type="radio">`, and the
 * reason is the shadow boundary rather than preference: native radios group by
 * sharing a `name` within a form, and a radio inside a shadow root cannot join
 * a group on the other side of it. The group is the form control here, so the
 * option only has to say what it is and announce when it is chosen.
 *
 * **It carries no label of its own.** A radio is named by the words beside it,
 * which is its own content, and the label, hint and message of the *set* belong
 * to the group. This is the one control in the family that takes nothing from
 * `MixinField`, because a lone radio is not a control: it is an answer to one.
 *
 * Selection is announced rather than applied. The item dispatches, the group
 * decides, and the group writes `selected` back. An item that set itself would
 * be a second source of truth for which one is on.
 *
 * @since 0.1.0
 * @status stable
 * @category forms
 * @aliases Option, Choice
 * @documentation https://fusion.dev/helix/components/radio
 *
 * @slot - The words naming this choice.
 * @slot icon - A mark shown beside them, or instead of them under
 * `variant="chip"`, where the words become the accessible name and the mark
 * is what a reader picks between. Separate from the default slot because the
 * chip has to hide one and show the other, and they are both in the same place
 * otherwise.
 *
 * @event {HelixSelectEvent} helix-select - Fired when this choice is made. Cancelable: refusing it takes the decision and nothing moves.
 *
 * @csspart box - The circle.
 * @csspart item - The button, which is the whole row.
 * @csspart label - The words beside it.
 * @csspart mark - The dot inside it.
 *
 * @cssstate selected - While it is the one chosen.
 */
@customElement('helix-headless-radio')
export class HelixHeadlessRadio extends MixinSelectableItem(HelixElement) {
  /**
   * Whether the markup declared this one chosen, which is what a reset returns to.
   *
   * `<option selected>` reflects to `defaultSelected` and `option.selected` is
   * live state that does not reflect, and those are two different facts. This
   * element has one `selected` doing both jobs, so the declaration is the
   * attribute and the state is the property.
   *
   * **The attribute, read when it is asked for, and never a snapshot taken in
   * the constructor.** A field initializer runs there, and an element the HTML
   * parser created has none of its attributes yet at that moment: measured on
   * this element, on `Option` and on `Toggle`, `<helix-radio value="a"
   * selected>` reported `defaultSelected` as `false` both from parsed markup
   * and from `createElement` followed by `setAttribute`, which is every way a
   * consumer writes one. The snapshot could only ever be true for an element
   * already in the document when `customElements.define` ran.
   *
   * Nothing overwrites it either, which is what makes reading it late correct
   * rather than merely later: `selected` does not reflect, for the reason
   * `willUpdate` records, so the group's writes never reach the attribute and
   * what it says is what the markup said.
   *
   * **The deeper half is not this.** State reflecting under the declaration's
   * name is the fault `TreeItem` avoids by mirroring to `data-selected`.
   * Splitting them means moving what every stylesheet selects on, which is a
   * change of its own rather than a property being added.
   */
  get defaultSelected(): boolean {
    return this.hasAttribute('selected')
  }

  set defaultSelected(next: boolean) {
    this.toggleAttribute('selected', next)
  }

  /**
   * Whether this choice holds the group's tab stop while nothing is chosen.
   *
   * The stop rides on the selection, and an unanswered group has no selection,
   * so without this every choice is `tabindex="-1"` and the keyboard cannot
   * enter the set at all.
   *
   * **Written by the group, with no attribute, and it reaches the control
   * rather than the host.** A `tabindex` on the host is two faults at once: it
   * is markup a consumer rendered and their server never sent, which React
   * reports as a mismatch and does not patch up, and it puts the tab stop on
   * the element rather than on the `<button role="radio">` inside it, so a
   * screen reader meets an unnamed box where a native group would have given
   * them an unchecked radio. `Toggle.Root` carries the same property for the
   * same reason.
   */
  @property({ attribute: false })
  focusable = false

  protected override render(): TemplateResult {
    /* Roving `tabindex`: one stop for the whole set, which is what a radio
       group is in the tab order, and the arrow keys move within it. The group
       owns the keys, because moving between items is a fact about the set.

       `focusable` is the unanswered set's entry stop, and it is on the button
       rather than on the host so that what a reader tabs to is the radio. */
    return html`<button
      part="item"
      type="button"
      role="radio"
      aria-checked=${this.selected ? 'true' : 'false'}
      ?disabled=${this.disabled}
      tabindex=${this.selected || this.focusable ? '0' : '-1'}
      @click=${() => this.select()}
    >
      <span part="box"><span part="mark" aria-hidden="true"></span></span>
      <slot name="icon"></slot>
      <span part="label"><slot></slot></span>
    </button>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-radio': HelixHeadlessRadio
  }
}
