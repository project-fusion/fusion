import type { PropertyValues } from 'lit'
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
   *
   * The mirror is below and was for a while only a sentence: this paragraph
   * described it, four components had their own copies of it, and the class
   * itself did nothing. Here is where it belongs, because here is where
   * `disabled` is.
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
   *
   * @internal Read by the component itself and by nothing outside it: every
   * call in the library is `this.isDisabled`. Public, it printed a row on
   * twenty-four families in both tiers, forty-eight in all, on every form
   * control's reference page, and it is the largest single entry in those
   * tables.
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
   * `helix/web` binds to it and that is exactly what it is for.
   */
  get isDisabled(): boolean {
    return this.disabled || this.formDisabled
  }

  /**
   * The platform's notice that an ancestor fieldset changed.
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

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    // Off for either reason, and said once for every control in the library.
    this.internals.ariaDisabled = this.isDisabled ? 'true' : null
  }

  /**
   * Name submitted with the form.
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
   * Here rather than on each control, where it was declared eight times and
   * reflected none of them.
   */
  @property({
    /* Empty means absent, which plain reflection cannot say. `name = ''` is the
       default and Lit reflects it as `name=""`, so every button, switch and
       calendar in the library shipped an empty name attribute the consumer
       never wrote, and six SSR specs said so. Returning `null` removes the
       attribute instead. Same trap `hostAria` exists for: a name of no
       characters is not the absence of one. */
    converter: {
      fromAttribute: (value: string | null): string => value ?? '',
      toAttribute: (value: string): string | null => (value === '' ? null : value),
    },
    reflect: true,
  })
  name = ''

  /**
   * The form this control belongs to, if any.
   *
   * @reference https://html.spec.whatwg.org/multipage/custom-elements.html#form-associated-custom-elements form-associated custom elements
   */
  get form(): HTMLFormElement | null {
    return this.internals.form
  }

  /**
   * Labels associated with this control.
   *
   * @reference https://html.spec.whatwg.org/multipage/custom-elements.html#form-associated-custom-elements form-associated custom elements
   */
  get labels(): NodeList {
    return this.internals.labels
  }
}
