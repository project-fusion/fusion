import { customElement, HelixElement, HelixSelectEvent } from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
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
 * @status experimental
 * @category forms
 * @aliases Option, Choice
 * @documentation https://helix.fusion.dev/components/radio
 *
 * @slot - The words naming this choice.
 * @slot icon - A mark shown beside them, or instead of them under
 * `appearance="chip"`, where the words become the accessible name and the mark
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
 */
@customElement('helix-headless-radio')
export class HelixHeadlessRadio extends HelixElement {
  /**
   * Whether this choice can be made.
   */
  @property({ reflect: true, type: Boolean })
  disabled = false

  /**
   * Whether the markup declared this one chosen, which is what a reset returns to.
   *
   * `<option selected>` reflects to `defaultSelected` and `option.selected` is
   * live state that does not reflect, and those are two different facts. This
   * element has one `selected` doing both jobs, so what is captured here is what
   * the markup said at upgrade, before anything could overwrite it: read the
   * attribute later and the listbox's own writes answer instead.
   *
   * **The deeper half is not this.** State reflecting under the declaration's
   * name is the fault `TreeItem` avoids by mirroring to `data-selected`.
   * Splitting them means moving what every stylesheet selects on, which is a
   * change of its own rather than a property being added.
   */
  get defaultSelected(): boolean {
    return this.seeded
  }

  set defaultSelected(next: boolean) {
    this.seeded = next
  }

  /** What the markup said, read once at construction for the reason above. */
  private seeded = this.hasAttribute('selected')

  /**
   * Whether this is the current choice.
   *
   * Written by the group.
   */
  @property({ type: Boolean })
  selected = false

  /**
   * Identifies this choice to the group, and is what the form submits.
   */
  @property()
  value = ''

  /** Moves focus to this choice, for the group's arrow keys. */
  focusItem(): void {
    this.renderRoot.querySelector<HTMLElement>('[part="item"]')?.focus()
  }

  /** Makes this choice and announces it. */
  select(): void {
    if (this.disabled) {
      return
    }
    this.dispatchEvent(new HelixSelectEvent({ value: this.value }))
  }

  /**
   * Mirrors the chosen state where a stylesheet can select on it.
   *
   * **A custom state rather than the `selected` attribute.** The parent writes
   * this: a listbox choosing a row, a tab strip moving the tab, a radio group
   * answering for its set. Reflected, that puts the element's own bookkeeping
   * onto markup a consumer wrote and a consumer's server never sent, which
   * React reconciles and reports as a mismatch, and which a serialized element
   * pasted back declares as a choice nobody made. `ElementInternals` holds it
   * instead, where it is not in the DOM at all.
   *
   * Reading `selected` is unaffected and so is writing it: the attribute still
   * seeds the property, which is what `<helix-radio selected>` in a consumer's
   * markup means. There is no write back.
   */
  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    this.toggleState('selected', this.selected)
  }

  protected override render(): TemplateResult {
    /* Roving `tabindex`: one stop for the whole set, which is what a radio
       group is in the tab order, and the arrow keys move within it. The group
       owns the keys, because moving between items is a fact about the set. */
    return html`<button
      part="item"
      type="button"
      role="radio"
      aria-checked=${this.selected ? 'true' : 'false'}
      ?disabled=${this.disabled}
      tabindex=${this.selected ? '0' : '-1'}
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
