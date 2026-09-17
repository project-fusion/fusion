import {
  customElement,
  DisabledCascadeController,
  HelixFormElement,
  type HelixSelectEvent,
  hostAria,
  KeyboardNavigationController,
  MixinControllerValue,
  MixinField,
} from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { HelixHeadlessRadio } from '../root/radio-root.js'

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
 * @status stable
 * @aliases RadioButtons, Choice group
 * @documentation https://fusion.dev/helix/components/radio
 *
 * @slot - The radios.
 * @slot hint - Richer than a string.
 * @slot label - Richer than a string, where the question is more than one.
 *
 * @event {Event} change - Announced once the value has moved.
 * @event {HelixBeforeChangeEvent} helix-before-change - Fired when the answer changes, and cancelable.
 * @event {HelixSelectEvent} helix-select - Fired when an answer is chosen. Dispatched by the radio and listened for here, because the group is what a consumer holds. Cancelable: refusing it takes the decision and nothing moves.
 * @event {Event} input - Announced once the value has moved.
 *
 * @csspart feedback - What is wrong with it.
 * @csspart hint - Help under the set.
 * @csspart items - The choices, which is what `orientation` lays out.
 * @csspart label - The question, over the set.
 *
 * @cssstate invalid - While there is feedback to show: the platform's verdict, or the consumer's `feedback`.
 */
@customElement('helix-headless-radio-group')
export class HelixHeadlessRadioGroup extends MixinControllerValue(MixinField(HelixFormElement)) {
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
     is no reference to keep, and nothing here talks to it after construction.
     `protected` rather than `private` because a private field nothing reads is
     an unused one, and the subclass tier is where a consumer would reach for
     it. */
  protected readonly keys = new KeyboardNavigationController(this, { items: () => this.items })

  /* Stated once, and the group never thinks about it again. Hand calls from
     each method that could disable an item reach different paths per
     component; the controller is what stops that being written per group. */
  protected readonly cascade = new DisabledCascadeController(this, {
    items: () => this.items,
  })

  /** The radios, in light-DOM order. Client only: the server has no tree. */
  get items(): HelixHeadlessRadio[] {
    return [...this.children].filter(
      (child): child is HelixHeadlessRadio => child instanceof HelixHeadlessRadio,
    )
  }

  /**
   * Announces before it applies, so a listener can refuse the change.
   *
   * The item has not moved by the time this runs, unlike a native input, so
   * refusing is simply not writing the value: there is nothing to put back.
   *
   * **The radio's own `helix-select` is a request, and the argument that it was
   * a notification is the one this settles.** That argument ran: the group's
   * veto is `helix-before-change` a step later, so the item could be read as
   * announcing a choice the group then decides about. What it leaves out is who
   * can reach which event. `helix-before-change` is dispatched on the group, so
   * refusing it needs a listener on the group, and a consumer ruling out one
   * answer binds to that answer. Two gates in two positions is the shape, and
   * the item's is the one that was doing nothing.
   */
  private readonly handleSelection = (event: HelixSelectEvent): void => {
    event.stopPropagation()
    /* **And only if the item's own choice stood.** `Radio` documents
       `helix-select` as refusable and this group is the only thing that acts on
       it, so a refusal nothing read was a veto that did nothing anywhere. Read
       inline rather than a microtask later: this is a bubble listener for an
       event from a child, so every listener on the item has already run.
       `Toggle.Group` and `Listbox` hold the same pair for the same event. */
    if (event.defaultPrevented) {
      return
    }
    const next = event.detail.value
    if (next === this.value) {
      return
    }
    this.requestValue(next)
  }

  /** Writes the answer onto the items, and nothing onto the host. */
  private place(): void {
    const items = this.items
    const answer = items.find((item) => item.value === this.value)
    for (const item of items) {
      item.selected = item === answer
    }
    /* Nothing chosen, so the first choice that can be made is the tab stop. A
       group where every item is `tabindex="-1"` is a group the keyboard cannot
       enter, and an answered group that keeps the entry stop carries two, so
       tabbing through a form stops twice on one question and the first stop is
       on an item that is not the answer.

       **Asked of the answer and not of `value`.** `value === ''` reads a group
       whose value matches no item as answered, so a `value` nobody declared an
       item for left every choice at `-1` and the set unreachable, which is the
       exact failure this exists to prevent.

       **And the entry skips a disabled choice**, whose control is not focusable
       at all, so a group whose first option is disabled would be unreachable
       the same way. `Toggle.Group` picks its entry the same two ways. */
    const entry = answer ? undefined : items.find((item) => !item.disabled)
    for (const item of items) {
      item.focusable = item === entry
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
    /* `required` reflects, sets validity and paints the asterisk the field
       sheet draws, and tells the accessibility tree nothing on its own. Without
       this a reader meets a mark beside the label they cannot see, and no
       announcement of why the form would refuse the group. */
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
    'helix-headless-radio-group': HelixHeadlessRadioGroup
  }
}
