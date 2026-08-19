import { customElement, HelixElement, HelixSelectEvent } from '@helix-io/core'
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
 * @status experimental
 * @category forms
 * @aliases Option, Choice
 * @documentation https://helix.fusion.dev/components/radio
 *
 * @slot - The words naming this choice.
 *
 * @event {HelixSelectEvent} helix-select - Fired when this choice is made.
 *
 * @csspart item - The button, which is the whole row.
 * @csspart box - The circle.
 * @csspart mark - The dot inside it.
 * @csspart label - The words beside it.
 */
@customElement('helix-base-radio')
export class HelixBaseRadio extends HelixElement {
  /** Whether this choice can be made. */
  @property({ reflect: true, type: Boolean })
  disabled = false

  /** Whether this is the current choice. Written by the group. */
  @property({ reflect: true, type: Boolean })
  selected = false

  /** Identifies this choice to the group, and is what the form submits. */
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
      <span part="label"><slot></slot></span>
    </button>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-radio': HelixBaseRadio
  }
}
