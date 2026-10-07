import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import type { HelixFormElement } from '../../helix-form-element/helix-form-element.js'
import { hostAria } from '../../utils/host-aria/host-aria.js'

// biome-ignore lint/suspicious/noExplicitAny: mixin constructors are variadic by nature
type Constructor<T> = new (...args: any[]) => T

export declare class MixinPickerFeedbackInterface {
  /**
   * A message under the picker, such as what is wrong with the answer.
   *
   * While set, the picker is invalid and does not submit, as a field's
   * `feedback` is, it is marked invalid to a reader and to CSS, and the
   * controls a reader answers with are described by it.
   */
  feedback: string

  /**
   * Whether the answer fails validation, marked on the controls a reader
   * answers with and as `:state(invalid)`.
   *
   * A flag a field that wraps the picker sets, since that field owns the
   * label, the hint and the message; on its own, `feedback` both marks the
   * picker and says why.
   */
  invalid: boolean

  /**
   * Whether a reader is told the answer is wrong: `invalid`, `feedback`, a
   * held answer the picker refuses, or a missing answer once the reader has
   * committed one or a form has refused the picker.
   */
  protected get marked(): boolean

  /**
   * What the picker's own validation finds: `missing` for a required picker
   * with nothing chosen, `refused` for an answer it holds and refuses, or
   * nothing. Read in `willUpdate`, so a picker answers it from its properties.
   */
  protected get failure(): PickerFailure | undefined

  /** The `feedback` line, or nothing while there is none. */
  protected renderPickerFeedback(): TemplateResult | typeof nothing
}

/** What a picker's own validation finds, which `marked` reads. */
export type PickerFailure = 'missing' | 'refused'

/**
 * `feedback` and `invalid` for a picker that stands on its own as a form
 * control: Color Picker, Date Picker and Time Picker.
 *
 * **One mark for both.** `invalid` is the flag a wrapping field sets, and
 * `feedback` is the message a picker on its own shows; either one marks the
 * picker invalid on its internals (`aria-invalid` on the host) and as
 * `:state(invalid)`, and each picker marks the controls it draws by `marked`.
 * Measured on Color Picker before this: `feedback` set `customError` in its
 * validity while every control reported `invalid: false`.
 *
 * The message is the validity's too, as a field's `feedback` is, through
 * `HelixFormElement`'s `validityFeedback`, so a form with one does not submit.
 */
export const MixinPickerFeedback = <T extends Constructor<HelixFormElement>>(Base: T) => {
  // JSDoc is duplicated from MixinPickerFeedbackInterface deliberately: the
  // interface is what TypeScript consumers see, this class is what the manifest
  // analyzer reads when resolving inherited members into dependent packages.
  class PickerFeedbackElement extends Base {
    /**
     * A message under the picker, such as what is wrong with the answer.
     *
     * While set, the picker is invalid and does not submit, as a field's
     * `feedback` is, it is marked invalid to a reader and to CSS, and the
     * controls a reader answers with are described by it.
     */
    @property()
    feedback = ''

    /**
     * Whether the answer fails validation, marked on the controls a reader
     * answers with and as `:state(invalid)`.
     *
     * A flag a field that wraps the picker sets, since that field owns the
     * label, the hint and the message; on its own, `feedback` both marks the
     * picker and says why.
     */
    @property({ reflect: true, type: Boolean })
    invalid = false

    /**
     * Whether the reader has committed an answer, or a form has refused the
     * picker. A reset forgets it.
     */
    @state()
    private touched = false

    /**
     * Whether a reader is told the answer is wrong: `invalid`, `feedback`, a
     * held answer the picker refuses, or a missing answer once the reader has
     * committed one or a form has refused the picker.
     *
     * **A refused answer is marked at once, and a missing one waits**, as
     * Chromium's tree does for native controls: a time input holding a time
     * past its `max` reports invalid on load, and an empty required text field
     * does not, since the reader already hears that it is required. Measured
     * before this on Time Picker: `value="13:00" max="12:00"` reported
     * `rangeOverflow` while the list said nothing and `:state(invalid)` was off.
     */
    protected get marked(): boolean {
      if (this.invalid || this.feedback !== '') {
        return true
      }
      const failure = this.failure
      return failure === 'refused' || (failure === 'missing' && this.touched)
    }

    /**
     * What the picker's own validation finds: `missing`, `refused`, or
     * nothing, which is what a picker that does not answer it reports.
     */
    protected get failure(): PickerFailure | undefined {
      return undefined
    }

    override formResetCallback(): void {
      super.formResetCallback()
      this.touched = false
    }

    /* The two moments a missing answer becomes one to mention: a form refused
       the picker, or the reader committed an answer. In `firstUpdated`, which
       a server never runs. */
    protected override firstUpdated(changed: PropertyValues): void {
      super.firstUpdated(changed)
      const touch = (): void => {
        this.touched = true
      }
      this.addEventListener('invalid', touch)
      this.addEventListener('change', touch)
    }

    /** @internal `feedback` marks the picker invalid, as a field's does. */
    protected override get validityFeedback(): string {
      return this.feedback
    }

    /* `ariaInvalid` on the host through `ElementInternals` rather than as an
       attribute, which a React consumer's server markup never had. **`false`
       while unmarked**: a host with a role and no
       `aria-invalid` is judged by its validity, and Chromium's tree reported
       an untouched required Date Picker, a `group`, as invalid on load. */
    protected override willUpdate(changed: PropertyValues): void {
      super.willUpdate(changed)
      this.internals.ariaInvalid = this.marked ? 'true' : 'false'
      this.toggleState('invalid', this.marked)
    }

    /* And the host described by the line, for a picker whose host is the
       group a reader is in: Date Picker's grid of months, or a picker named
       by a `<label>`. Through `ElementInternals`, since the line is in this
       shadow root and an IDREF from the host cannot reach it. */
    protected override updated(changed: PropertyValues): void {
      super.updated(changed)
      const line = this.partNamed('feedback')
      hostAria(this.internals, { describedBy: line ? [line] : [] })
    }

    /** The `feedback` line, or nothing while there is none. */
    protected renderPickerFeedback(): TemplateResult | typeof nothing {
      return this.feedback === ''
        ? nothing
        : html`<p part="feedback" id="feedback">${this.feedback}</p>`
    }
  }

  /* Through `unknown`, for the reason `MixinField` gives: the protected members
     here and on the declared interface are two declarations of the same names,
     which TypeScript treats as incompatible. */
  return PickerFeedbackElement as unknown as Constructor<MixinPickerFeedbackInterface> & T
}
