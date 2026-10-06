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
 * @summary A set of radios where exactly one can be chosen.
 *
 * @description
 * The group is the form control, and the radios are its options. A set of
 * radios submits one answer, so the group owns the `name`, the `value`, and the
 * validity. A radio outside a group is not a control. Checkboxes work the other
 * way: each checkbox submits its own answer.
 *
 * `MixinField` applies to the group for the same reason. The label, the hint,
 * and the message describe the question, and the question belongs to the set.
 *
 * Selection moves up and state moves down. A radio dispatches an event when it
 * is chosen, the group determines whether the choice stands, and the group
 * writes `selected` onto every radio. The group is the one source of which
 * radio is on.
 *
 * `value` is the current answer. `defaultValue` is what the markup declared:
 * the value until something is chosen, and where a reset returns. The two work
 * like `checked` and `defaultChecked`.
 *
 * A choice sends its events in this order: `helix-select` from the radio, then,
 * a microtask later and only if nobody refused it, `helix-before-change` from
 * the group, and once the value has moved, `input` and `change`. The microtask
 * is what lets a listener you add to the group after it connected refuse the
 * `helix-select`. A native radio sends `input` and `change` in the same task as
 * the click.
 *
 * **Keyboard.** The group is one tab stop: the chosen radio, or the first that
 * can be chosen.
 *
 * | Key | What it does |
 * |---|---|
 * | Right, Down | Chooses the next radio, from the last back to the first. |
 * | Left, Up | Chooses the radio before, from the first round to the last. |
 * | Home, End | Chooses the first or the last radio. |
 * | Space, Enter | Chooses the focused radio. |
 *
 * Left and Right swap on a right-to-left page, and a disabled radio is passed
 * over. Under `readonly` the arrows move focus and choose nothing. The group
 * is a `radiogroup` named by `label`, and each radio is a `role="radio"`
 * button with `aria-checked`.
 *
 * @since 0.1.0
 * @status stable
 * @aliases RadioButtons, Choice group
 * @documentation https://fusion.dev/helix/components/radio
 *
 * @slot - The radios.
 * @slot feedback - The error message, for content richer than a string. It shows while there is a message.
 * @slot hint - The help text under the group, for content richer than a string.
 * @slot label - The group's label, for a question that needs more than a string.
 *
 * @event {Event} change - Fired after the value changes.
 * @event {HelixBeforeChangeEvent} helix-before-change - Fired when the choice changes. Cancelable: call `preventDefault()` to keep the current choice.
 * @event {HelixSelectEvent} helix-select - Fired when a radio is chosen. The radio sends it, and you listen for it on the group. Cancelable: call `preventDefault()` to keep the current choice.
 * @event {Event} input - Fired after the value changes.
 *
 * @csspart feedback - The error message under the group.
 * @csspart hint - The help text under the group.
 * @csspart items - The container of the choices, laid out by `orientation`.
 * @csspart label - The label above the group.
 *
 * @cssstate invalid - The group has an error to show, from the browser's validation or from your `feedback`.
 */
@customElement('helix-headless-radio-group')
export class HelixHeadlessRadioGroup extends MixinControllerValue(MixinField(HelixFormElement)) {
  /**
   * Whether the group holds a tab stop of its own.
   *
   * A toolbar is one tab stop, so a toolbar the group sits in sets this to
   * `false` while its stop is on another control, and every radio, the chosen
   * one too, is then out of the tab order. The arrow keys inside the group
   * work as before once focus is in it.
   *
   * No attribute: it is coordination between elements, and a consumer has no
   * reason to set it.
   */
  @property({ attribute: false })
  focusable = true

  /**
   * The direction the choices run. `vertical` puts one choice on each line.
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

  /**
   * Whether a reader can see and focus the answer and cannot change it. A
   * read-only group still submits its value.
   *
   * React Aria's `isReadOnly`. A press on a radio is refused. The arrow keys,
   * Home and End move focus between the radios and choose nothing, so a reader
   * can hear every choice, and Tab still reaches the answer. The group says
   * `aria-readonly`. A script can still set `value`.
   */
  @property({ attribute: 'readonly', reflect: true, type: Boolean })
  readOnly = false

  /* Moving and choosing are one act, which is the radio group pattern and is
     what this controller exists to stop being written per component. */
  /* Registered rather than held. A controller adds itself to the host, so there
     is no reference to keep, and nothing here talks to it after construction.
     `protected` rather than `private` because a private field nothing reads is
     an unused one, and the subclass tier is where a consumer would reach for
     it. */
  /* Read-only, the arrows move focus between radios and choose nothing, so a
     move starts where focus is. */
  protected readonly keys = new KeyboardNavigationController(this, {
    items: () => this.items,
    origin: () => (this.readOnly ? 'focus' : 'selection'),
    selects: () => !this.readOnly,
  })

  /* Stated once, and the group never thinks about it again. Hand calls from
     each method that could disable an item reach different paths per
     component; the controller is what stops that being written per group. */
  protected readonly cascade = new DisabledCascadeController(this, {
    items: () => this.items,
  })

  /** The radios, in light-DOM order. Client only: the server has no tree. */
  get items(): HelixHeadlessRadio[] {
    // Empty on the server, which has no tree, so `focusTarget` can ask while it renders.
    return [...(this.children ?? [])].filter(
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
    if (this.readOnly) {
      event.preventDefault()
      return
    }
    /* **And only if the item's own choice stood, read a microtask later.**
       `Radio` documents `helix-select` as refusable, and its docblock tells you
       to listen for it on the group. This listener is on the group too, added
       when the group connected, so it runs ahead of a listener a consumer adds
       afterwards, which is the usual order, and read inline the flag was never
       set yet. The dispatch is synchronous, so a microtask is after every
       listener, the item's and the group's. `Toggle.Group` holds the same pair
       for the same event. */
    queueMicrotask(() => {
      if (event.defaultPrevented) {
        return
      }
      const next = event.detail.value
      if (next === this.value) {
        return
      }
      this.requestValue(next)
    })
  }

  /**
   * The radio holding the answer, or nothing.
   *
   * Nothing where `value` names no radio here: a chosen radio that was removed
   * is no longer an answer, as a native group drops it from the form. `value`
   * keeps the name, so a value written before its radios arrive takes once they
   * do.
   */
  private get answer(): HelixHeadlessRadio | undefined {
    return this.items.find((item) => item.value === this.value)
  }

  /** Whether the group holds an answer the form can submit. */
  private get answered(): boolean {
    if (this.value === '') {
      return false
    }
    const items = this.items
    return items.length === 0 || items.some((item) => item.value === this.value)
  }

  /**
   * Takes the answer from a radio whose markup says `selected`, where nothing
   * else declared one.
   *
   * As `Toggle.Group` does, so `<helix-radio selected>` preselects as
   * `<option selected>` and `<helix-toggle selected>` do, and a reset returns
   * to it. Client only: the server's element shim has no children to read.
   */
  private adopt(): void {
    if (this.value !== '' || this.children === undefined) {
      return
    }
    const declared = this.items.find((item) => item.defaultSelected)
    if (declared) {
      this.defaultValue = declared.value
    }
  }

  /** Writes the answer onto the items, and nothing onto the host. */
  private place(): void {
    const items = this.items
    const answer = this.answer
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
       the same way. `Toggle.Group` picks its entry the same two ways.

       **And an answer that is disabled is no stop either**, its button taking
       no focus, so the entry goes to the first choice that can be made, as a
       native group tabs past a disabled checked radio to an enabled one.

       **And no stop at all while a toolbar holds it**, which `focusable` says. */
    const entry = this.focusable ? this.entry() : undefined
    for (const item of items) {
      item.focusable = item === entry
    }
  }

  /** The radio that holds the group's tab stop: the answer, or the first that can be chosen. */
  private entry(): HelixHeadlessRadio | undefined {
    const answer = this.answer
    return answer && !answer.disabled ? answer : this.items.find((item) => !item.disabled)
  }

  /**
   * Focus goes to the radio that holds the stop, and to the radio that would
   * hold it while a toolbar holds the stop instead, so a label press or a
   * refused submission still lands in the group.
   */
  protected override get focusTarget(): HTMLElement | null {
    return (
      super.focusTarget ??
      this.entry()?.shadowRoot?.querySelector<HTMLElement>('[part="item"]') ??
      null
    )
  }

  /** Reports the answer and the verdict on it. */
  private sync(): void {
    const answered = this.answered
    this.internals.setFormValue(answered ? this.value : null)
    this.reportRequired(!answered, 'Choose one to continue.', 'items')
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
    this.adopt()
    hostAria(this.internals, { label: this.label, role: 'radiogroup' })
    /* `required` reflects, sets validity and paints the asterisk the field
       sheet draws, and tells the accessibility tree nothing on its own. Without
       this a reader meets a mark beside the label they cannot see, and no
       announcement of why the form would refuse the group. */
    this.internals.ariaRequired = this.required ? 'true' : null
    this.internals.ariaReadOnly = this.readOnly ? 'true' : null
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
        <slot @slotchange=${() => this.requestUpdate()}></slot>
      </div>
      ${this.renderHint()}${this.renderFeedback()}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-radio-group': HelixHeadlessRadioGroup
  }
}
