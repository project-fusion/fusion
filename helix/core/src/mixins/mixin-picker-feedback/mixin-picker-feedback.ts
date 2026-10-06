import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
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

  /** Whether a reader is told the answer is wrong: `invalid`, or `feedback`. */
  protected get marked(): boolean

  /** The `feedback` line, or nothing while there is none. */
  protected renderPickerFeedback(): TemplateResult | typeof nothing
}

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

    /** Whether a reader is told the answer is wrong: `invalid`, or `feedback`. */
    protected get marked(): boolean {
      return this.invalid || this.feedback !== ''
    }

    /** @internal `feedback` marks the picker invalid, as a field's does. */
    protected override get validityFeedback(): string {
      return this.feedback
    }

    /* `ariaInvalid` on the host through `ElementInternals` rather than as an
       attribute, which a React consumer's server markup never had. */
    protected override willUpdate(changed: PropertyValues): void {
      super.willUpdate(changed)
      this.internals.ariaInvalid = this.marked ? 'true' : null
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
