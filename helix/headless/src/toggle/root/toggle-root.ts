import { customElement, HelixElement, MixinSelectableItem } from '@fusion.dev/helix-core'
import { html, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary One option in a toggle group.
 *
 * @description
 * Renders a `<button role="radio">`. This is a form control and nothing else.
 *
 * Navigation is not this. It is links marked with `aria-current` and styled by
 * the `data-navigation-item` recipe in the base layer, which carries the same look
 * without radio semantics announcing destinations as choices.
 *
 * @since 0.1.0
 * @status stable
 * @category actions
 * @aliases Segment, NavItem, Option
 * @documentation https://fusion.dev/helix/components/toggle
 *
 * @slot - The item's label.
 *
 * @event {HelixSelectEvent} helix-select - Fired when the item is chosen. Cancelable: refusing it takes the decision and nothing moves.
 *
 * @csspart item - The radio button.
 *
 * @cssstate selected - While it is on.
 */
@customElement('helix-headless-toggle')
export class HelixHeadlessToggle extends MixinSelectableItem(HelixElement) {
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
   * this element, on `Option` and on `Radio`, `<helix-toggle value="light"
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
   * Whether this item holds the group's tab stop while nothing is chosen.
   *
   * The stop normally rides on the selection, and an unanswered group has no
   * selection, so without this the keyboard cannot reach it. Written by the
   * group, with no attribute: it is coordination between elements, and
   * `tabindex` on a host the consumer rendered is the change a React consumer's
   * hydration reports and does not patch up.
   */
  @property({ attribute: false })
  focusable = false

  protected override render(): TemplateResult {
    return html`<button
      part="item"
      type="button"
      role="radio"
      aria-checked=${this.selected ? 'true' : 'false'}
      ?disabled=${this.disabled}
      tabindex=${this.selected || this.focusable ? '0' : '-1'}
      @click=${() => this.select()}
    >
      <slot></slot>
    </button>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-toggle': HelixHeadlessToggle
  }
}
