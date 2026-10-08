import type { PropertyValues } from 'lit'
import { property, state } from 'lit/decorators.js'
import { HelixElement } from '../helix-element/helix-element.js'
import { watchLabels } from '../utils/watch-labels/watch-labels.js'

/** Whether `element` is where Tab would stop: focusable, in the sequence, and drawn. */
const isTabStop = (element: Element): element is HTMLElement =>
  element instanceof HTMLElement &&
  element.tabIndex >= 0 &&
  !(element as HTMLElement & { disabled?: boolean }).disabled &&
  !element.hidden &&
  !element.inert &&
  (typeof element.checkVisibility !== 'function' || element.checkVisibility())

/**
 * The first tab stop under `node`, walking the tree a reader tabs through: into
 * shadow roots, and through a slot to what is assigned to it.
 */
const firstTabStop = (node: Element | ShadowRoot): HTMLElement | null => {
  const children =
    node instanceof HTMLSlotElement ? node.assignedElements({ flatten: true }) : [...node.children]
  for (const child of children) {
    if (isTabStop(child)) {
      return child
    }
    const found = (child.shadowRoot ? firstTabStop(child.shadowRoot) : null) ?? firstTabStop(child)
    if (found) {
      return found
    }
  }
  return null
}

/**
 * @summary Base for a form element that reports no validity of its own, as a native button does.
 *
 * @description
 * `HelixFormElementBase` carries form ownership, `disabled` and the fieldset
 * that disables it, `name`, focus, and the validity API with a custom message
 * as its only verdict. `HelixFormElement` extends it with what a control that
 * judges its own value needs: the wrapped `setValidity`, `feedback` from a
 * field, and the `input` and `change` announcements.
 *
 * **Two classes, because a button pays for the half it never calls.** Button
 * reports nothing through `setValidity` and holds no value, so a message from
 * `setCustomValidity` is the whole of its verdict, the same as on a native
 * `<button>`. Measured on the styled Button bundled alone, October 7, 2026:
 * the validating half was 347 of its 12,973 bytes brotli.
 *
 * A family extends this one only where it never calls
 * `internals.setValidity` and takes no `MixinField`. Every other control
 * extends `HelixFormElement`.
 *
 * @since 0.176.0
 * @status experimental
 * @documentation https://fusion.dev/helix/docs/tiers
 */
export class HelixFormElementBase extends HelixElement {
  /** Opts the element into form ownership, labels, and submission. */
  static readonly formAssociated = true

  /**
   * Whether the control is disabled and cannot be used.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
   *
   * The mirror itself is in `willUpdate` below, here rather than in each
   * control, because here is where `disabled` is.
   */
  @property({ reflect: true, type: Boolean })
  disabled = false

  /**
   * Whether an ancestor `<fieldset disabled>` has switched this control off.
   *
   * The platform tells a form-associated element through `formDisabledCallback`
   * and nothing else does, so without this a control inside a disabled fieldset
   * stays fully typeable and announces itself as enabled.
   *
   * The submission half is already the platform's: measured, the fieldset's
   * controls are absent from the form's entry list and the host matches
   * `:disabled`, so the value never goes anywhere. What is missing without this
   * is everything a reader can see or touch.
   *
   * State rather than the `disabled` property. Writing that would reflect an
   * attribute the consumer's server markup does not have, which React reports
   * on hydration and does not patch up, and it would also silently overwrite
   * what the consumer set.
   */
  @state()
  protected formDisabled = false

  /**
   * Whether the control is off, by its own attribute or by an ancestor.
   *
   * What a component should bind to rather than `disabled`, which is only the
   * half of it the consumer wrote.
   *
   * @internal Read by the component itself and by nothing outside it: every
   * call in the library is `this.isDisabled`. Public, it prints a row on
   * twenty-four families in both tiers, forty-eight in all, on every form
   * control's reference page.
   *
   * **A consumer loses nothing, which was measured rather than assumed.**
   * `element.matches(':disabled')` answers the same question, is the platform's
   * own, and works on a native control too. Checked in a browser across the
   * three cases: a control disabled by its own attribute, one inside a
   * `<fieldset>` before and after that fieldset is disabled, and one that is
   * neither. `:disabled` agreed with `isDisabled` in every one, including the
   * inheritance case that is the only reason this getter exists.
   *
   * Documented away rather than made `protected`, because a subclass in
   * `helix/styled` binds to it and that is exactly what it is for.
   */
  get isDisabled(): boolean {
    return this.disabled || this.formDisabled
  }

  /**
   * Called by the browser when an ancestor fieldset is disabled or enabled.
   *
   * **The argument is the effective state, and taking it whole is what latched
   * every control in the library.** The platform calls this for the element's
   * own `disabled` as well as for a fieldset, and our own arrives here at the
   * worst possible moment: reflecting `disabled` to the attribute happens
   * inside Lit's `update()`, the UA fires this synchronously from that write,
   * and a reactive write during an update is a change-in-update Lit does not
   * re-render for. So `formDisabled` ran exactly one update behind forever.
   *
   * Measured on Slider, logging what `render` saw:
   *
   * ```
   * set true    disabled true   formDisabled false  isDisabled true
   * set false   disabled false  formDisabled true   isDisabled true   <- stale
   * (no third render)
   * ```
   *
   * The host came out right every time, `disabled` false, `:disabled` not
   * matching, and the inner control kept the attribute, so a control disabled
   * once could never be re-enabled. It only shows when something re-enables,
   * which is the same shape of bug `inheritDisabled` was written for.
   *
   * Our own half is already in `this.disabled` and `isDisabled` is an or, so
   * this records only what the fieldset adds. That also removes the write
   * entirely on the own-disabled path rather than moving it.
   *
   * The one case this cannot see is a control that is disabled itself *and*
   * inside a disabled fieldset, whose own `disabled` is then removed: the
   * effective state does not change, so the platform does not call again, and
   * the fieldset's hold is not recorded. There is no callback to learn it from
   * and reading `:disabled` here would answer about the attribute we are in the
   * middle of removing.
   */
  formDisabledCallback(disabled: boolean): void {
    this.formDisabled = disabled && !this.disabled
  }

  /**
   * Whether an ancestor `<fieldset disabled>` holds the control, outside its
   * first `<legend>`, read from the tree.
   *
   * For the one case the callback cannot report: a control disabled itself and
   * by a fieldset, whose own `disabled` is then removed. The effective state does
   * not change, so the platform does not call, and the fieldset's hold has to
   * be read.
   */
  private get heldByFieldset(): boolean {
    let fieldset = this.parentElement?.closest('fieldset[disabled]') ?? null
    while (fieldset) {
      const legend = fieldset.querySelector(':scope > legend')
      if (!legend?.contains(this)) {
        return true
      }
      fieldset = fieldset.parentElement?.closest('fieldset[disabled]') ?? null
    }
    return false
  }

  /**
   * Called by the browser when the form is reset. It does nothing here, and
   * every override calls it.
   *
   * **A chain rather than a leaf**, because more than one layer owes a reset
   * something: the value mixin its default, and the field mixin beneath it the
   * forgetting of a reader's past attempt, whose message otherwise showed over
   * the emptied control the moment the form was reset.
   */
  formResetCallback(): void {}

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    if (changed.get('disabled') === true && !this.disabled && this.isConnected) {
      this.formDisabled = this.heldByFieldset
    }
    // Off for either reason, and said once for every control in the library.
    this.internals.ariaDisabled = this.isDisabled ? 'true' : null
  }

  /**
   * The name the control's value is submitted under.
   *
   * **Reflected, and it is the exception to "reflect only what CSS selects
   * on".** The platform builds a form's entry list from the `name` *content
   * attribute*, not from the property, so a control named through the property
   * submitted under no name at all and was silently dropped. Measured: two
   * inputs in one form, one named by attribute and one by property, and the
   * form carried a single entry.
   *
   * Safe for a React consumer, which is what the rule is protecting: React
   * renders a custom element's props as attributes on the server, so the name
   * is already in the markup being hydrated and reflecting it writes what is
   * there. It is only a change to the markup when a consumer assigns it
   * imperatively later, and nothing is hydrating by then.
   *
   * Here rather than on each control.
   */
  @property({
    /* Empty means absent, which plain reflection cannot say. `name = ''` is the
       default and Lit reflects it as `name=""`, so every button, switch and
       calendar in the library would ship an empty name attribute the consumer
       never wrote. Returning `null` removes the attribute instead. Same trap
       `hostAria` exists for: a name of no characters is not the absence of
       one. */
    converter: {
      fromAttribute: (value: string | null): string => value ?? '',
      toAttribute: (value: string): string | null => (value === '' ? null : value),
    },
    reflect: true,
  })
  name = ''

  /** The message `setCustomValidity` was given. */
  protected customValidity = ''

  /**
   * Hands the platform the control's verdict, anchored where focus can go.
   *
   * Here the verdict is the custom message alone. `HelixFormElement` lays the
   * message over what the control itself reported.
   */
  protected applyValidity(): void {
    if (this.customValidity === '') {
      this.internals.setValidity({})
      return
    }
    this.internals.setValidity(
      { customError: true },
      this.customValidity,
      this.focusTarget ?? undefined,
    )
  }

  /**
   * Whether the control meets its constraints, and why not.
   *
   * @reference https://developer.mozilla.org/docs/Web/API/ElementInternals/validity ElementInternals.validity
   */
  get validity(): ValidityState {
    this.runPendingUpdate()
    return this.internals.validity
  }

  /** The message the browser would show for the control, or an empty string. */
  get validationMessage(): string {
    this.runPendingUpdate()
    return this.internals.validationMessage
  }

  /** Whether an update is running, so `runPendingUpdate` never starts one inside another. */
  private updateRunning = false

  protected override performUpdate(): void {
    this.updateRunning = true
    try {
      super.performUpdate()
    } finally {
      this.updateRunning = false
    }
  }

  /**
   * Runs an update that is on its way, so the verdict read next is the one
   * for what the control holds now.
   *
   * **A control reports its verdict as it updates, and an update waits for a
   * microtask**, so a script that wrote `value` and asked at once was answered
   * about the value before: measured on Time Input, `value = '18:00'` past a
   * `max` of 17:00 and `checkValidity()` returned true until `updateComplete`.
   * A native control answers about the value it was just given, so the
   * questions a script can ask run the pending update first. Lit's
   * `performUpdate` is the documented way to run one synchronously.
   *
   * Protected for a control that submits on its own, which has to hand the
   * form the verdict for what it holds now: Pin Input's `autosubmit`.
   */
  protected runPendingUpdate(): void {
    if (this.hasUpdated && this.isUpdatePending && !this.updateRunning) {
      this.performUpdate()
    }
  }

  /** Whether the control is checked when its form is submitted. */
  get willValidate(): boolean {
    return this.internals.willValidate
  }

  /**
   * Returns whether the control is valid, and fires `invalid` on it when it is
   * not. The control shows no message for it: `reportValidity()` does that.
   */
  checkValidity(): boolean {
    this.runPendingUpdate()
    return this.internals.checkValidity()
  }

  /**
   * Returns whether the control is valid, and when it is not, fires `invalid`
   * and shows the browser's message at the control.
   */
  reportValidity(): boolean {
    this.runPendingUpdate()
    this.applyValidity()
    return this.internals.reportValidity()
  }

  /**
   * Marks the control invalid with `message`, or clears that with an empty
   * string, as on a native control. The form does not submit while it is set.
   */
  setCustomValidity(message: string): void {
    this.customValidity = message
    this.applyValidity()
    this.requestUpdate()
  }

  /**
   * The element focus goes to: the control's first tab stop, or `null` where
   * there is none.
   *
   * Read through shadow roots and slots, so a group lands on the member that
   * holds its tab stop, which is the chosen radio in a radio group.
   */
  protected get focusTarget(): HTMLElement | null {
    const root = this.shadowRoot
    return root ? firstTabStop(root) : null
  }

  /** Moves focus to the control, as focusing a native control does. */
  override focus(options?: FocusOptions): void {
    const target = this.focusTarget
    if (target) {
      target.focus(options)
      return
    }
    super.focus(options)
  }

  /**
   * Focuses the control when its `<label>` is pressed.
   *
   * The label sends the host a click of the browser's own after trying to
   * focus it, and a host that is not focusable takes nothing from that try.
   * Only a click that starts at the host and that the browser sent: one from
   * inside has landed where it meant to, and `click()` from a script does not
   * focus a native control either.
   */
  private readonly focusFromLabel = (event: MouseEvent): void => {
    if (!event.isTrusted || event.composedPath()[0] !== this || this.isDisabled) {
      return
    }
    if (!this.matches(':focus-within')) {
      this.focus()
    }
  }

  /**
   * Re-anchors the verdict as the form checks it, because the control's
   * members may have rendered since it last reported, and the anchor read then
   * was the best there was.
   */
  private readonly refreshAnchor = (): void => {
    if (!this.internals.validity.valid) {
      this.applyValidity()
    }
  }

  /** Stops listening for the labels in this control's tree. */
  private unwatchLabels: (() => void) | undefined

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('click', this.focusFromLabel)
    this.addEventListener('invalid', this.refreshAnchor)
    /* A `<label for>` a framework renders after the control names it through
       `labels`, which tells nobody: an update is what lets the control inside
       be named by it at once, through `AriaForwardController`. */
    this.unwatchLabels = watchLabels(this, () => this.requestUpdate())
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('click', this.focusFromLabel)
    this.removeEventListener('invalid', this.refreshAnchor)
    this.unwatchLabels?.()
    this.unwatchLabels = undefined
  }

  /**
   * @internal Whether this control is a field that counts against implicit
   * submission: a single line of text, as `<input type="text">` is. Read by
   * `submitImplicitly` in `utils/implicit-submit`, which only the controls
   * that submit on Enter import.
   */
  protected get blocksImplicitSubmission(): boolean {
    return false
  }

  /** @internal Whether this control submits its form, for finding the form's default button. */
  protected get submitsForm(): boolean {
    return false
  }

  /** @internal Activates the control as its form's default button. */
  protected activate(): void {
    this.click()
  }

  /**
   * The form the control belongs to, or `null`.
   *
   * @reference https://html.spec.whatwg.org/multipage/custom-elements.html#form-associated-custom-elements form-associated custom elements
   */
  get form(): HTMLFormElement | null {
    return this.internals.form
  }

  /**
   * The labels associated with the control.
   *
   * @reference https://html.spec.whatwg.org/multipage/custom-elements.html#form-associated-custom-elements form-associated custom elements
   */
  get labels(): NodeList {
    return this.internals.labels
  }
}
