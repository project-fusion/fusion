import {
  customElement,
  HelixChangeEvent,
  HelixFormElement,
  type HelixSelectEvent,
  MixinField,
} from '@helix-io/core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { HelixBaseRadio } from '../root/radio-root.js'

/** The keys that move within a group, which is every key that moves at all. */
const KEYS = new Set(['ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'End', 'Home'])

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
export class HelixBaseRadioGroup extends MixinField(HelixFormElement) {
  /** The answer the markup declared, which is the one a reset returns to. */
  @property({ attribute: 'default-value' })
  defaultValue = ''

  /** Name the group reports under when its form is submitted. */
  @property()
  name = ''

  /** Which way the choices run. A column reads one line per answer. */
  @property({ reflect: true })
  orientation: 'horizontal' | 'vertical' = 'vertical'

  /** Value of the chosen item, and what the form submits. */
  @property()
  value = ''

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
    const allowed = this.dispatchEvent(new HelixChangeEvent({ name: this.name, value: next }))
    if (!allowed) {
      return
    }
    this.value = next
  }

  /**
   * Arrow keys move and choose in one go, which is what a radio group does.
   *
   * Moving focus without choosing is the listbox pattern, and it leaves a
   * keyboard reader on an item they have not selected with nothing saying so.
   */
  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (!KEYS.has(event.key)) {
      return
    }
    const items = this.items.filter((item) => !item.disabled)
    if (items.length === 0) {
      return
    }
    const current = items.findIndex((item) => item.selected)

    let next = current
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      next = (current + 1) % items.length
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      next = (current - 1 + items.length) % items.length
    } else if (event.key === 'Home') {
      next = 0
    } else {
      next = items.length - 1
    }

    event.preventDefault()
    const target = items[next]
    target?.focusItem()
    target?.select()
  }

  /** Writes the answer onto the items, and nothing onto the host. */
  private place(): void {
    const items = this.items
    for (const item of items) {
      item.selected = item.value === this.value
    }
    /* Nothing chosen yet, so the first item is the tab stop. A group where
       every item is `tabindex="-1"` is a group the keyboard cannot enter. */
    if (this.value === '' && items.length > 0) {
      items[0]?.setAttribute('tabindex', '0')
    }
  }

  /** Reports the answer and the verdict on it. */
  private sync(): void {
    this.internals.setFormValue(this.value === '' ? null : this.value)
    if (this.required && this.value === '') {
      this.internals.setValidity(
        { valueMissing: true },
        'Choose one to continue.',
        this.renderRoot.querySelector<HTMLElement>('[part="items"]') ?? undefined,
      )
    } else {
      this.internals.setValidity({})
    }
    // Straight after, because validity moved without any property moving.
    this.refreshFeedback()
  }

  /** Returns the group to the answer its markup declared. */
  formResetCallback(): void {
    this.value = this.defaultValue
  }

  /** Restores the answer when the browser brings a form back. */
  formStateRestoreCallback(state: string | null): void {
    this.value = state ?? this.defaultValue
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('helix-select', this.handleSelection as EventListener)
    this.addEventListener('keydown', this.handleKeydown)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('helix-select', this.handleSelection as EventListener)
    this.removeEventListener('keydown', this.handleKeydown)
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    // Through internals, so nothing lands on the host as an attribute a React
    // consumer's server markup never had.
    this.internals.role = 'radiogroup'
    /* A string as well as the element reference `linkHost` sets, because this
       is the half a server can write. */
    this.internals.ariaLabel = this.label === '' ? null : this.label
    // Once, before anything has been chosen. Seeded here rather than in
    // `connectedCallback`, which SSR never calls.
    if (!this.hasUpdated && this.value === '' && this.defaultValue !== '') {
      this.value = this.defaultValue
    }
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
