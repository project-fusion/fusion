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
   * Reading gives the real state, in either mode. Writing hands ownership to
   * the consumer: from then on the control announces changes and applies none
   * of them.
   */
  checked: boolean

  /** Initial checked state for uncontrolled use. Ignored once `checked` is set. */
  defaultChecked: boolean

  /**
   * Requests a checked change, and reports whether it was applied.
   *
   * Announces before it acts: a listener calling `preventDefault()` on the
   * `helix-change` refuses the change, and nothing moves.
   */
  requestChecked(next: boolean): boolean

  /** Requests the opposite of the current state. */
  toggleChecked(): boolean

  /**
   * Drops the uncontrolled state, so the control reads `defaultChecked` again.
   *
   * A form reset has to return a control to what its markup declared. Clearing
   * `checked` alone cannot do it: that only leaves controlled mode, and the
   * uncontrolled value the element has been keeping is private to the mixin
   * and would still be what `checked` reports.
   */
  resetChecked(): void
}

/**
 * Grafts controlled and uncontrolled checked state onto a base class.
 *
 * Which mode it is in is read once, at the first update, from whether anything
 * had set `checked` by then: markup, a hydrating server's attributes and a
 * framework's initial properties have all arrived, and nothing else has
 * happened yet. Set, and the consumer owns it and the element only announces.
 * Unset, and the element owns it and `defaultChecked` says where it starts.
 *
 * Sets `data-checked` on the host whenever the element is checked, in either
 * mode. Styled tiers select on that rather than `[checked]`, which is absent
 * for uncontrolled consumers.
 */
export const MixinControllerChecked = <T extends Constructor<HelixElement>>(Base: T) => {
  // JSDoc is duplicated from MixinControllerCheckedInterface deliberately. The
  // interface is what TypeScript consumers see; this class is what the manifest
  // analyzer reads when resolving inherited members into dependent packages.
  class CheckedElement extends Base {
    /**
     * Whether the control is checked.
     *
     * One property rather than two. Reading gives the real state whichever
     * mode the control is in; writing hands ownership to the consumer, which
     * is what the attribute in `<helix-checkbox checked>` does as well. The
     * same shape all four of these mixins have, for the reason given on
     * `MixinControllerOpen.open`.
     *
     * Not reflected: the attribute is the consumer's input and stays as they
     * wrote it, and `data-checked` carries the resolved state for stylesheets.
     *
     *
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

    /** Initial checked state for uncontrolled use, where nothing declared one. */
    @property({ attribute: 'default-checked', type: Boolean })
    defaultChecked = false

    /**
     * The state, whoever set it, and `undefined` until somebody has.
     *
     * One field and not two. Writing always applies, the way a native control
     * does when a script assigns to it. What the write does not do is change
     * which mode the element is in.
     */
    private checkedState: boolean | undefined = undefined

    /**
     * Mirrors the resolved state onto the host as `data-checked`.
     *
     * In `willUpdate` rather than `connectedCallback` because SSR calls the
     * former and not the latter, so the attribute is present in server output.
     */
    protected override willUpdate(changed: PropertyValues): void {
      super.willUpdate(changed)
      this.toggleAttribute('data-checked', this.checked)
    }

    /**
     * Requests a checked change, and reports whether it was applied.
     *
     * Announces before it acts, so `preventDefault()` on the
     * `helix-change` is a refusal and nothing moves. Nobody refusing means the element updates itself, whether or not a consumer
     * declared the property: a declared property is a seed and a correction,
     * the way `<input value>` is, and a consumer who wants the change for
     * themselves refuses it and assigns their own. See 294.
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
     * Hand-written on the checkbox and nowhere else, so `Switch`, the mixin's
     * only other consumer, had no restore at all: a reader who navigated away
     * and came back to a restored form found their switch flipped off. The
     * mixin owns `checked`, so the mixin owns putting it back.
     *
     * Through `checked` rather than the private state, so a controlled consumer
     * is asked the same way every other change asks.
     */
    formStateRestoreCallback(state: string | null): void {
      this.checked = state !== null
    }

    /**
     * Drops the uncontrolled state, so the control reads `defaultChecked`
     * again.
     *
     * A form reset has to return a control to what its markup declared, and
     * clearing `checked` alone only leaves controlled mode. The value the
     * element has been keeping lives here, so this is where it is dropped.
     */
    resetChecked(): void {
      const previous = this.checked
      this.checkedState = undefined
      this.requestUpdate('checked', previous)
    }
  }

  return CheckedElement as Constructor<MixinControllerCheckedInterface> & T
}
