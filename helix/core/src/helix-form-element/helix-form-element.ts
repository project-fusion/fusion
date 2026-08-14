import { property } from 'lit/decorators.js'
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

  /** The form this control belongs to, if any. */
  get form(): HTMLFormElement | null {
    return this.internals.form
  }

  /** Labels associated with this control. */
  get labels(): NodeList {
    return this.internals.labels
  }
}
