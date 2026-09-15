import type { PropertyValues } from 'lit'
import { property } from 'lit/decorators.js'
import { HelixBeforeToggleEvent } from '../../events/events.js'
import type { HelixElement } from '../../helix-element/helix-element.js'
import { requestChange } from '../../utils/request-change/request-change.js'

// biome-ignore lint/suspicious/noExplicitAny: mixin constructors are variadic by nature
type Constructor<T> = new (...args: any[]) => T

/**
 * The public surface `MixinControllerChecked` adds.
 *
 * Declared separately because TypeScript cannot emit declarations for an
 * anonymous class that has private members (TS4094). Casting the mixin's return
 * to this interface keeps the internals private and the build working.
 */
export declare class MixinControllerCheckedInterface {
  /**
   * Whether the control is checked.
   *
   * Reading gives the real state. Writing always applies, and is a seed and a
   * correction rather than a claim of ownership: a consumer who wants the
   * decision refuses the `helix-before-toggle`.
   */
  checked: boolean

  /** Initial checked state for uncontrolled use. Ignored once `checked` is set. */
  defaultChecked: boolean

  /**
   * Requests a checked change, and reports whether it was applied.
   *
   * Announces before it acts: a listener calling `preventDefault()` on the
   * `helix-before-toggle` refuses the change, and nothing moves.
   */
  requestChecked(next: boolean): boolean

  /** Requests the opposite of the current state. */
  toggleChecked(): boolean

  /**
   * Drops the recorded state, so the control reads `defaultChecked` again.
   *
   * A form reset has to return a control to what its markup declared, and
   * assigning `checked` cannot do it: any assignment records a state, and the
   * recorded state is private to the mixin. This is the only way to clear it.
   */
  resetChecked(): void
}

/**
 * Grafts checked state onto a base class.
 *
 * `checked` is a seed and a correction rather than a claim: the element applies
 * its own changes from wherever markup started it, `defaultChecked` is what a
 * reset returns to, and a consumer takes the decision by refusing the
 * `helix-before-toggle`.
 *
 * Records `:state(checked)` whenever the element is checked. Styled tiers
 * select on that rather than on `[checked]`, which is absent until somebody
 * writes it. Each element applying this lists it as `@cssstate checked`: a
 * class-level tag on a mixin reaches no manifest, here or on the inner class.
 */
export const MixinControllerChecked = <T extends Constructor<HelixElement>>(Base: T) => {
  // JSDoc is duplicated from MixinControllerCheckedInterface deliberately. The
  // interface is what TypeScript consumers see; this class is what the manifest
  // analyzer reads when resolving inherited members into dependent packages.
  class CheckedElement extends Base {
    /**
     * Whether the control is checked.
     *
     * One property rather than two. Writing always applies;
     * `<helix-checkbox checked>` is the same statement in markup.
     *
     * Not reflected: the attribute is the consumer's input and stays as they
     * wrote it, and `:state(checked)` carries the resolved state for
     * stylesheets.
     */
    @property({ type: Boolean })
    get checked(): boolean {
      return this.checkedState ?? this.defaultChecked
    }

    set checked(next: boolean) {
      const previous = this.checked
      this.checkedState = next
      this.requestUpdate('checked', previous)
    }

    /**
     * Initial checked state for uncontrolled use, where nothing declared one.
     */
    @property({ attribute: 'default-checked', type: Boolean })
    defaultChecked = false

    /**
     * The state, whoever set it, and `undefined` until somebody has.
     *
     * One field and not two. Writing always applies, the way a native control
     * does when a script assigns to it.
     */
    private checkedState: boolean | undefined = undefined

    /**
     * Records the resolved state as the custom state `checked`.
     *
     * **A custom state and never `data-checked`.** An attribute written here
     * means `<helix-checkbox default-checked>` comes back from a consumer's
     * server without it and gains it the moment the definition lands, which
     * React lists as a hydration mismatch and does not patch up.
     * `HelixElement.toggleState` says why the host is the wrong place to keep a
     * component's own bookkeeping.
     *
     * In `willUpdate`, which is where the resolved state is first known and is
     * what a subclass rendering from it expects.
     */
    protected override willUpdate(changed: PropertyValues): void {
      super.willUpdate(changed)
      this.toggleState('checked', this.checked)
    }

    /**
     * Requests a checked change, and reports whether it was applied.
     *
     * Announces before it acts, so `preventDefault()` on the
     * `helix-before-toggle` is a refusal and nothing moves. Nobody refusing
     * means the element updates itself, whether or not a consumer declared the
     * property: a declared property is a seed and a correction, the way
     * `<input value>` is, and a consumer who wants the change for themselves
     * refuses it and assigns their own.
     */
    requestChecked(next: boolean): boolean {
      if (this.checked === next) {
        return true
      }
      const applied = requestChange({
        apply: (checked) => {
          const previous = this.checked
          this.checkedState = checked
          this.requestUpdate('checked', previous)
        },
        event: (checked) => new HelixBeforeToggleEvent({ checked }),
        host: this,
        next,
      })
      if (applied) {
        /* `input` here and `change` relayed from the inner control, which is
           the pair a native checkbox sends. Announced after `apply`, so a
           handler reading `currentTarget.checked` reads the new state. */
        this.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
      }
      return applied
    }

    /** Requests the opposite of the current state. */
    toggleChecked(): boolean {
      return this.requestChecked(!this.checked)
    }

    /**
     * Restores the control when the browser brings a form back.
     *
     * The mixin owns `checked`, so the mixin owns putting it back: written on
     * one consumer and not the other, a reader who navigates away and comes
     * back to a restored form finds that control flipped off.
     *
     * Through the public accessor rather than the private field, so a restore
     * takes the same path a script assignment does.
     */
    formStateRestoreCallback(state: string | null): void {
      this.checked = state !== null
    }

    /**
     * Drops the recorded state, so the control reads `defaultChecked` again.
     *
     * A form reset has to return a control to what its markup declared, and no
     * assignment to `checked` can do that: any assignment records a state. The
     * recorded state lives here, so this is where it is dropped.
     */
    resetChecked(): void {
      const previous = this.checked
      this.checkedState = undefined
      this.requestUpdate('checked', previous)
    }
  }

  return CheckedElement as Constructor<MixinControllerCheckedInterface> & T
}
