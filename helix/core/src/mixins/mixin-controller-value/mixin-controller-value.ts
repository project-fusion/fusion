import type { PropertyValues } from 'lit'
import { property } from 'lit/decorators.js'
import type { HelixFormElement } from '../../helix-form-element/helix-form-element.js'

// biome-ignore lint/suspicious/noExplicitAny: mixin constructors are variadic by nature
type Constructor<T> = new (...args: any[]) => T

/**
 * The public surface `MixinControllerValue` adds.
 *
 * Declared separately because TypeScript cannot emit declarations for an
 * anonymous class that has private members (TS4094).
 */
export declare class MixinControllerValueInterface {
  /**
   * The value the markup declared, which is where a reset returns to.
   *
   * Separate from `value`, which is where the control is now, and gone from the
   * reader's view the moment they change anything.
   */
  defaultValue: string

  /** What the control holds now, and what its form submits. */
  value: string

  /** Returns the control to the value its markup declared. */
  formResetCallback(): void

  /** Restores the value when the browser brings a form back. */
  formStateRestoreCallback(state: string | null): void
}

/**
 * Grafts `value`, `defaultValue`, and the two callbacks that answer a form.
 *
 * Every control with a value had written this, and by the third it was three
 * copies of the same four members and the same seeding rule: `Input`, then
 * `Toggle.Group`, then `Radio.Group`. The copies had not diverged, which is the
 * argument for the mixin rather than against it, because the next one would
 * have.
 *
 * **Seeded in `willUpdate`, not `connectedCallback`.** SSR never calls the
 * latter, so a control with a `default-value` would serve empty and fill itself
 * at hydration, which is a flash for a reader and a mismatch for React. Seeding
 * once, before the first render, is what makes the server and the client agree.
 *
 * **What it does not own is reporting.** `setFormValue` stays with the
 * component, because what an empty value means is the component's business: a
 * text field submits its emptiness, since `""` is an answer and the field was
 * on the form, while a group with nothing chosen submits nothing at all. One
 * mixin cannot hold both without a flag, and a flag would be this rule written
 * down twice.
 *
 * `Checkbox` deliberately does not take this. Its `value` is what it submits
 * *when it is on* rather than what it holds, so it is configuration rather than
 * state, and the state it does have is `checked`, which is
 * `MixinControllerChecked`'s.
 */
export const MixinControllerValue = <T extends Constructor<HelixFormElement>>(Base: T) => {
  // JSDoc is duplicated from the interface deliberately. The interface is what
  // TypeScript consumers see; this class is what the manifest analyzer reads
  // when resolving inherited members into dependent packages.
  class ValueElement extends Base {
    /** The value the markup declared, which is where a reset returns to. */
    @property({ attribute: 'default-value' })
    defaultValue = ''

    /** What the control holds now, and what its form submits. */
    @property()
    value = ''

    /** Returns the control to the value its markup declared. */
    formResetCallback(): void {
      this.value = this.defaultValue
    }

    /**
     * Restores the value when the browser brings a form back.
     *
     * Falling back to `defaultValue` rather than to empty, because a restore
     * with no state is a form the browser has nothing recorded for, which is
     * the same situation as a fresh one.
     */
    formStateRestoreCallback(state: string | null): void {
      this.value = state ?? this.defaultValue
    }

    protected override willUpdate(changed: PropertyValues): void {
      super.willUpdate(changed)
      /* Once, before anything has been entered or chosen. After that
         `defaultValue` is history and `value` is the answer, so this must not
         run again: a control that re-seeded would undo the reader's own work
         every time anything else about it updated. */
      if (!this.hasUpdated && this.value === '' && this.defaultValue !== '') {
        this.value = this.defaultValue
      }
    }
  }

  return ValueElement as unknown as Constructor<MixinControllerValueInterface> & T
}
