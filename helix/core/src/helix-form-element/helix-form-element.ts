import type { PropertyValues } from 'lit'
import { internalsOf } from '../helix-element/helix-element.js'
import { HelixFormElementBase } from './helix-form-element-base.js'

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

/** How many `form.checkValidity()` calls on a watched form are running, nested ones included. */
let formChecks = 0

/** The forms whose `checkValidity()` is wrapped, so several controls share one wrapper. */
const watchedForms = new WeakSet<HTMLFormElement>()

/**
 * Wraps `checkValidity()` on the one form a control belongs to, so the control
 * can tell the `invalid` from a form's check apart from one from a submission
 * attempt.
 *
 * **The platform gives the two no difference to read.** Measured in Chromium,
 * the `invalid` that `form.checkValidity()` fires and the one a submit button,
 * Enter in a field, or `form.requestSubmit()` fires are alike: both trusted,
 * both cancelable, both dispatched in the call, with `window.event` the
 * `invalid` itself and the same user activation. Yet the platform treats them
 * apart: after a submission attempt every invalid native field in the form
 * matches `:user-invalid`, and after `form.checkValidity()` none does. So the
 * check is the call that is marked, for as long as it runs, and every other
 * source keeps counting as an attempt.
 *
 * **On the form instance, never on `HTMLFormElement.prototype`**, as
 * Shoelace's `FormControlController` wraps the form it is associated with: a
 * library that changed the prototype would change every form on the page,
 * one with no Helix control included, and stack under other code that wraps
 * it. Only the check is wrapped. The platform runs a submission's validation
 * without calling it, so a submit button, Enter and `requestSubmit()` still
 * reach a control as an attempt.
 *
 * **Left in place when the controls leave.** The wrapper only counts and
 * calls the form's own method, so a form whose Helix controls are gone checks
 * exactly as before; taking it off would mean counting the controls in each
 * form through every move between forms, for no difference anyone can see.
 */
const watchFormChecks = (form: HTMLFormElement | null): void => {
  if (!form || watchedForms.has(form)) {
    return
  }
  watchedForms.add(form)
  const check = form.checkValidity
  form.checkValidity = function checkValidity(this: HTMLFormElement): boolean {
    formChecks += 1
    try {
      return check.call(this)
    } finally {
      formChecks -= 1
    }
  }
}

/**
 * @summary Base for every element that participates in a form and judges what it holds.
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
 * Ownership, `disabled`, `name`, focus and the validity API are
 * `HelixFormElementBase`'s, which a control that reports no verdict of its
 * own, as Button does, extends directly.
 *
 * @since 0.1.0
 * @status experimental
 * @documentation https://fusion.dev/helix/docs/tiers
 */
export class HelixFormElement extends HelixFormElementBase {
  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
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

  constructor() {
    super()
    /* **Wrapped, so a custom error survives the control's next report.** Every
       control reports its own verdict through `internals.setValidity` on each
       update, and the platform keeps one verdict per element, so a message set
       through `setCustomValidity` or `feedback` would be gone the moment the
       control next reported. Wrapping the one call every family already makes
       keeps the two in one place without asking each family to merge them. */
    const internals = internalsOf(this)
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
  protected override applyValidity(): void {
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
   * Returns whether the control is valid, and fires `invalid` on it when it is
   * not. The control shows no message for it: `reportValidity()` does that.
   */
  override checkValidity(): boolean {
    this.runPendingUpdate()
    this.checkInProgress = true
    try {
      return internalsOf(this).checkValidity()
    } finally {
      this.checkInProgress = false
    }
  }

  /** Whether `checkValidity()` is running, set only for the `invalid` it fires. */
  private checkInProgress = false

  /**
   * @internal Whether the `invalid` firing now comes from `checkValidity()`.
   *
   * **Such an `invalid` reports and shows nothing**, as on a native control: a
   * required `<input>` checked from a script fires `invalid` and does not match
   * `:user-invalid`, measured in Chromium. Every layer that takes `invalid` as
   * a reader's attempt asks this first, so a script that checks an untouched
   * field does not mark it wrong. The same holds for `form.checkValidity()`,
   * which fires `invalid` on every control in the form and marks no native
   * one. A submission, `reportValidity()`, and the reader's own edits still
   * mark it.
   */
  protected get checkingValidity(): boolean {
    return this.checkInProgress || formChecks > 0
  }

  override connectedCallback(): void {
    super.connectedCallback()
    watchFormChecks(internalsOf(this).form)
  }

  /**
   * Called by the browser when the control's form changes: watches the new
   * form's `checkValidity()`, as connecting does for the form it starts in.
   */
  formAssociatedCallback(form: HTMLFormElement | null): void {
    watchFormChecks(form)
  }
}
