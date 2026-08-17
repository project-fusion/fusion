import { property, state } from 'lit/decorators.js'
import { HelixElement } from '../helix-element/helix-element.js'

/**
 * @summary Base for every element that participates in a form.
 *
 * @description
 * This has to be a class rather than a mixin or controller, and that is not a
 * style preference: the browser reads `formAssociated` off the constructor
 * during element upgrade, which cannot be delegated to a composed object.
 *
 * `internals` comes from `HelixElement`, which attaches it for every component.
 * `attachInternals()` throws on a second call, so there is exactly one owner.
 *
 * Deliberately small. It carries what every form participant needs and nothing
 * more; `value`, validity, and the reset and restore callbacks land when the
 * first input does, rather than being designed against components that do not
 * exist yet.
 *
 * @since 0.1.0
 * @status experimental
 * @documentation https://helix.fusion.dev/core/form-element
 */
export class HelixFormElement extends HelixElement {
  /** Opts the element into form ownership, labels, and submission. */
  static readonly formAssociated = true

  /**
   * Whether the control is non-interactive.
   *
   * Reflected, because the styled tier selects on it, and mirrored to
   * `aria-disabled` rather than removing the element from the accessibility
   * tree, so a screen reader can still announce that the control exists.
   */
  @property({ reflect: true, type: Boolean })
  disabled = false

  /**
   * Whether an ancestor `<fieldset disabled>` has switched this control off.
   *
   * The platform tells a form-associated element through `formDisabledCallback`
   * and nothing here implemented it, so a control inside a disabled fieldset
   * stayed fully typeable and announced itself as enabled. Measured: a
   * `helix-input` in one accepted text, reported `disabled` as false, and
   * carried no `aria-disabled`.
   *
   * What the platform already did on its own is the submission half. The same
   * measurement showed the fieldset's controls absent from the form's entry
   * list and the host matching `:disabled`, so the value never went anywhere.
   * What was missing is everything a reader can see or touch.
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
   */
  get isDisabled(): boolean {
    return this.disabled || this.formDisabled
  }

  /** The platform's notice that an ancestor fieldset changed. */
  formDisabledCallback(disabled: boolean): void {
    this.formDisabled = disabled
  }

  /** The form this control belongs to, if any. */
  get form(): HTMLFormElement | null {
    return this.internals.form
  }

  /** Labels associated with this control. */
  get labels(): NodeList {
    return this.internals.labels
  }
}
