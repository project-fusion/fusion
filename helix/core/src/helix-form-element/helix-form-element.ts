import type { PropertyValues } from 'lit'
import { property, state } from 'lit/decorators.js'
import { HelixElement } from '../helix-element/helix-element.js'

/** The flags a validity carries, read by name because a `ValidityState` keeps them on its prototype. */
const VALIDITY_FLAGS = [
  'badInput',
  'customError',
  'patternMismatch',
  'rangeOverflow',
  'rangeUnderflow',
  'stepMismatch',
  'tooLong',
  'tooShort',
  'typeMismatch',
  'valueMissing',
] as const

/** The native input types that count against implicit submission, from the HTML standard. */
const BLOCKING_TYPES = new Set([
  'date',
  'datetime-local',
  'email',
  'month',
  'number',
  'password',
  'search',
  'tel',
  'text',
  'time',
  'url',
  'week',
])

/** What a control last reported through `setValidity`, kept so a custom error can be laid over it. */
interface Reported {
  anchor: HTMLElement | undefined
  flags: ValidityStateFlags
  message: string
}

/**
 * Whether the platform can move focus to `element`, which a validation anchor
 * has to be: an anchor that cannot take focus leaves the form blocked with no
 * bubble and nothing focused.
 */
const takesFocus = (element: HTMLElement): boolean =>
  (element.tabIndex >= 0 || element.hasAttribute('tabindex')) &&
  !(element as HTMLElement & { disabled?: boolean }).disabled &&
  (typeof element.checkVisibility !== 'function' || element.checkVisibility())

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
 * @summary Base for every element that participates in a form.
 *
 * @description
 * `HelixFormElement` is a class because the browser reads `formAssociated` from
 * the constructor during element upgrade, and a mixin or controller cannot
 * supply it.
 *
 * `internals` comes from `HelixElement`, which attaches it for every component.
 * `attachInternals()` throws on a second call, so only one class attaches it.
 *
 * The class carries only what every form participant needs. `value` and the
 * reset and restore callbacks are added with the first input component.
 *
 * **The validity API is the platform's, read through `internals`**, so
 * `checkValidity()`, `reportValidity()` and `setCustomValidity()` work on the
 * host as they do on a native control. A custom message is laid over whatever
 * the control itself reports, which is why `setValidity` is wrapped below.
 *
 * **Focus goes to the control's first tab stop**, for `focus()` and for a
 * press on a `<label>` that names the host. A host is not focusable itself, so
 * without this a label press focused nothing on half the controls.
 *
 * @since 0.1.0
 * @status experimental
 * @documentation https://fusion.dev/helix/docs/tiers
 */
export class HelixFormElement extends HelixElement {
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
    if (this.validityFeedback !== this.appliedFeedback) {
      this.applyValidity()
    }
  }

  /**
   * Announces `input` from the host, the way the control it stands for would.
   *
   * Composed, as the native one is: `input` crosses shadow boundaries by
   * specification, so a consumer listening above a composition hears it.
   */
  protected announceInput(): void {
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
  }

  /**
   * Announces `change` from the host, the way the control it stands for would.
   *
   * **Not composed, and that is the shape of the native event rather than a
   * choice made here.** `change` stops at a shadow boundary, so a composed
   * control hears its inner control's and relays it under the same name from
   * its own host, which is what `onChange` binds. Every control here that
   * commits a value announces it through this, whether the commit came from an
   * inner control's own `change`, a step, a scrub or a completed code, so the
   * event is one shape in one place.
   */
  protected announceChange(): void {
    this.dispatchEvent(new Event('change', { bubbles: true, composed: false }))
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

  constructor() {
    super()
    /* **Wrapped, so a custom error survives the control's next report.** Every
       control reports its own verdict through `internals.setValidity` on each
       update, and the platform keeps one verdict per element, so a message set
       through `setCustomValidity` or `feedback` would be gone the moment the
       control next reported. Wrapping the one call every family already makes
       keeps the two in one place without asking each family to merge them. */
    const internals = this.internals
    const report = internals.setValidity.bind(internals)
    this.reportValidityTo = report
    internals.setValidity = (
      flags?: ValidityStateFlags,
      message?: string,
      anchor?: HTMLElement,
    ) => {
      this.reported = { anchor, flags: flags ?? {}, message: message ?? '' }
      this.applyValidity()
    }
  }

  /** The platform's own `setValidity`, which the wrapper above calls. */
  private readonly reportValidityTo: ElementInternals['setValidity']

  /** What the control last reported, before any custom error is laid over it. */
  private reported: Reported = { anchor: undefined, flags: {}, message: '' }

  /** The message `setCustomValidity` was given. */
  private customValidity = ''

  /** The `validityFeedback` the platform was last told about. */
  private appliedFeedback = ''

  /**
   * @internal A message that marks the control invalid, from a layer above this
   * one. `MixinField` answers with `feedback`, so a field showing what is wrong
   * does not submit.
   */
  protected get validityFeedback(): string {
    return ''
  }

  /**
   * Hands the platform the control's own verdict with any custom error on top,
   * anchored where focus can go.
   */
  private applyValidity(): void {
    const feedback = this.validityFeedback
    this.appliedFeedback = feedback
    const custom = this.customValidity || feedback
    const flags: ValidityStateFlags = {}
    for (const flag of VALIDITY_FLAGS) {
      if (this.reported.flags[flag] === true) {
        flags[flag] = true
      }
    }
    if (custom !== '') {
      flags.customError = true
    }
    if (Object.keys(flags).length === 0) {
      this.reportValidityTo({})
      return
    }
    this.reportValidityTo(
      flags,
      custom || this.reported.message,
      this.validationAnchor(this.reported.anchor),
    )
  }

  /**
   * Where the browser points its bubble: the anchor a control gave if focus
   * can go there, and its first tab stop otherwise.
   *
   * A group anchors on a part that holds its members and cannot take focus,
   * and the platform then refuses the submission, logs that the control is
   * not focusable, and leaves the reader on the submit button.
   */
  protected validationAnchor(anchor?: HTMLElement): HTMLElement | undefined {
    if (anchor && takesFocus(anchor)) {
      return anchor
    }
    return this.focusTarget ?? anchor
  }

  /**
   * Whether the control meets its constraints, and why not.
   *
   * @reference https://developer.mozilla.org/docs/Web/API/ElementInternals/validity ElementInternals.validity
   */
  get validity(): ValidityState {
    return this.internals.validity
  }

  /** The message the browser would show for the control, or an empty string. */
  get validationMessage(): string {
    return this.internals.validationMessage
  }

  /** Whether the control is checked when its form is submitted. */
  get willValidate(): boolean {
    return this.internals.willValidate
  }

  /**
   * Returns whether the control is valid, and fires `invalid` on it when it is
   * not.
   */
  checkValidity(): boolean {
    return this.internals.checkValidity()
  }

  /**
   * Returns whether the control is valid, and when it is not, fires `invalid`
   * and shows the browser's message at the control.
   */
  reportValidity(): boolean {
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

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('click', this.focusFromLabel)
    this.addEventListener('invalid', this.refreshAnchor)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('click', this.focusFromLabel)
    this.removeEventListener('invalid', this.refreshAnchor)
  }

  /**
   * @internal Whether this control is a field that counts against implicit
   * submission: a single line of text, as `<input type="text">` is.
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
   * Submits the form the way pressing Enter in a native text field does.
   *
   * The control's own input is in a shadow root and has no form owner, so the
   * platform never runs implicit submission for it. This runs it: the form's
   * default button is activated, the first submit button in it, a Helix one
   * included. With none, the form is submitted when it holds no more than one
   * field that counts against implicit submission, and nothing happens
   * otherwise.
   *
   * @reference https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#implicit-submission implicit submission
   */
  protected submitImplicitly(): void {
    const { form } = this
    if (!form) {
      return
    }
    const elements = [...form.elements]
    const button = HelixFormElement.defaultButton(form)
    if (button) {
      if (button.matches(':disabled')) {
        return
      }
      if (button instanceof HelixFormElement) {
        button.activate()
      } else {
        ;(button as HTMLElement).click()
      }
      return
    }
    const blocking = elements.filter((element) =>
      element instanceof HelixFormElement
        ? element.blocksImplicitSubmission
        : element instanceof HTMLInputElement && BLOCKING_TYPES.has(element.type),
    )
    if (blocking.length <= 1) {
      form.requestSubmit()
    }
  }

  /** The form's default button, the first submit button in it, native or Helix. */
  protected static defaultButton(form: HTMLFormElement): Element | undefined {
    return [...form.elements].find((element) => HelixFormElement.submits(element))
  }

  /** Whether `target` is a native field of `form` that Enter submits it from. */
  protected static submitsOnEnter(target: EventTarget | undefined, form: HTMLFormElement): boolean {
    return (
      target instanceof HTMLInputElement && target.form === form && BLOCKING_TYPES.has(target.type)
    )
  }

  /** Whether `element` is a submit button, native or Helix. */
  protected static submits(element: Element): boolean {
    if (element instanceof HelixFormElement) {
      return element.submitsForm
    }
    if (element instanceof HTMLButtonElement) {
      return element.type === 'submit'
    }
    return (
      element instanceof HTMLInputElement && (element.type === 'submit' || element.type === 'image')
    )
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
