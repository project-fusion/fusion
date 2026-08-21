import {
  customElement,
  DisabledCascadeController,
  HelixFormElement,
  type HelixSelectEvent,
  hostAria,
  KeyboardNavigationController,
  MixinControllerValue,
  MixinField,
} from '@helix-io/core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { HelixBaseRadio } from '../root/radio-root.js'

/**
 * @summary A set of choices where exactly one is the answer.
 *
 * @description
 * **The group is the control, and the radios are its options.** This is the
 * asymmetry with checkboxes and it comes from what a form submits: a set of
 * checkboxes is several answers and each box submits its own, while a set of
 * radios is one answer, so the group owns the `name`, the `value` and the
 * validity, and a lone radio outside a group is not a control at all.
 *
 * Which is also why `MixinField` lands here and not on `Radio`: the label, the
 * hint and the message are about the question, and the question is the set.
 *
 * Selection travels up and state travels down. An item announces that it was
 * chosen, the group decides whether that stands, and the group writes
 * `selected` onto every item. Nothing sets itself, so there is one answer to
 * "which one is on" rather than one per item.
 *
 * `value` and `defaultValue` are separate for the reason `checked` and
 * `defaultChecked` are: `value` is the answer now, `defaultValue` is what the
 * markup asked for, which is where a reset returns and is gone the moment
 * anything is chosen.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases RadioButtons, Choice group
 * @documentation https://helix.fusion.dev/components/radio-group
 *
 * @slot - The radios.
 * @slot label - Richer than a string, where the question is more than one.
 * @slot hint - Richer than a string.
 *
 * @event {HelixChangeEvent} helix-change - Fired when the answer changes, and cancelable.
 *
 * @csspart label - The question, over the set.
 * @csspart items - The choices, which is what `orientation` lays out.
 * @csspart hint - Help under the set.
 * @csspart feedback - What is wrong with it.
 */
@customElement('helix-base-radio-group')
export class HelixBaseRadioGroup extends MixinControllerValue(MixinField(HelixFormElement)) {
  /**
   * Which way the choices run. A column reads one line per answer.
   *
   * **Optional rather than defaulted, which is not a style preference.** A
   * reflecting property with a default writes its attribute onto every host the
   * moment the element upgrades, including the ones a consumer rendered and did
   * not touch, and React reads that as a hydration mismatch. The absent
   * attribute *is* the column, which the stylesheet reads as the base rule, so
   * only `horizontal` has to be named.
   */
  @property({ reflect: true })
  orientation?: 'horizontal' | 'vertical'

  /* Moving and choosing are one act, which is the radio group pattern and is
     what this controller exists to stop being written per component. */
  /* Registered rather than held. A controller adds itself to the host, so there
     is no reference to keep: nothing here talks to it after construction, which
     is why it is `protected` and not `private`. A private field nothing reads
     is an unused one, and the honest reading is that the subclass tier is where
     a consumer would reach for it. */
  protected readonly keys = new KeyboardNavigationController(this, { items: () => this.items })

  /* Stated once, and the group never thinks about it again. See the
     controller: the cascade was four hand calls from four different
     methods, so which paths reached it differed by component and a fifth
     group would have got none at all. */
  protected readonly cascade = new DisabledCascadeController(this, {
    items: () => this.items,
  })

  /** The radios, in light-DOM order. Client only: the server has no tree. */
  get items(): HelixBaseRadio[] {
    return [...this.children].filter(
      (child): child is HelixBaseRadio => child instanceof HelixBaseRadio,
    )
  }

  /**
   * Announces before it applies, so a listener can refuse the change.
   *
   * The item has not moved by the time this runs, unlike a native input, so
   * refusing is simply not writing the value: there is nothing to put back.
   */
  private readonly handleSelection = (event: HelixSelectEvent): void => {
    event.stopPropagation()
    const next = event.detail.value
    if (next === this.value) {
      return
    }
    this.requestValue(next)
  }

  /** Writes the answer onto the items, and nothing onto the host. */
  private place(): void {
    const items = this.items
    for (const item of items) {
      item.selected = item.value === this.value
    }
    /* Nothing chosen yet, so the first item is the tab stop. A group where
       every item is `tabindex="-1"` is a group the keyboard cannot enter.
     *
     * Taken back the moment there is an answer, which it was not: the attribute
     * was written on the first item and never removed, so an answered group
     * carried two tab stops, the entry one and the selected item's own. Tabbing
     * through a form stopped twice on one question, and the first stop was on an
     * item that is not the answer.
     *
     * `entered` rather than a bare toggle, because this also runs when the
     * group is answered and the attribute has to go whether or not this call is
     * the one that put it there. */
    const entered = this.value === '' && items.length > 0 ? items[0] : undefined
    for (const item of items) {
      if (item === entered) {
        item.setAttribute('tabindex', '0')
      } else {
        item.removeAttribute('tabindex')
      }
    }
  }

  /** Reports the answer and the verdict on it. */
  private sync(): void {
    this.internals.setFormValue(this.value === '' ? null : this.value)
    this.reportRequired(this.value === '', 'Choose one to continue.', 'items')
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('helix-select', this.handleSelection as EventListener)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('helix-select', this.handleSelection as EventListener)
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    // Through internals, so nothing lands on the host as an attribute a React
    // consumer's server markup never had.
    /* The string half, which is what a server can write. `linkHost` adds the
       element references on the client, and those win where a consumer slotted
       a label richer than a string. */
    hostAria(this.internals, { label: this.label, role: 'radiogroup' })
    /* Announced as required, which it never was.
     *
     * `required` reflects, sets validity and paints the asterisk the field sheet
     * draws, and told the accessibility tree nothing: a reader met a group with
     * a mark beside its label they could not see and no announcement of why the
     * form would refuse it. The stylesheet drawing that asterisk depends on the
     * control saying so. */
    this.internals.ariaRequired = this.required ? 'true' : null
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.place()
    this.sync()
    this.linkHost()
  }

  protected override render(): TemplateResult {
    /* The choices sit in an element of their own, because `orientation` lays
       out whatever is in the flex container and on the host that would be the
       label and the hint as well. */
    return html`${this.renderGroupLabel()}
      <div part="items">
        <slot @slotchange=${() => this.place()}></slot>
      </div>
      ${this.renderHint()}${this.renderFeedback()}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-radio-group': HelixBaseRadioGroup
  }
}
