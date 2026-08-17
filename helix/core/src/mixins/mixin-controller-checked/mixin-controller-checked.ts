import type { PropertyValues } from 'lit'
import { property } from 'lit/decorators.js'
import { HelixChangeEvent } from '../../events/events.js'
import type { HelixElement } from '../../helix-element/helix-element.js'
import { requestControlledChange } from '../../utils/request-controlled-change/request-controlled-change.js'

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
   * The consumer's callback, invoked after the state is applied.
   *
   * A React consumer cannot pass this through JSX: React reserves every prop
   * matching `on[A-Z]` and drops the ones it does not recognize. The generated
   * wrapper listens for `helix-change` instead. This is for a consumer
   * holding a reference, or a framework that assigns properties.
   */
  onCheckedChange: ((checked: boolean) => void) | undefined

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

/** The name a form control carries, which the change event reports. */
interface Named {
  name?: string
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
     * Whether the consumer owns the state, decided once and then fixed.
     *
     * Read off whether anything had set `checked` by the first update, which is
     * where markup, a hydrating server's attributes and a framework's initial
     * properties have all landed. See `MixinControllerOpen` for why this is
     * decided once rather than continuously.
     */
    private checkedMode: boolean | undefined = undefined

    private get checkedIsControlled(): boolean {
      return this.checkedMode === true
    }

    /**
     * Mirrors the resolved state onto the host as `data-checked`.
     *
     * In `willUpdate` rather than `connectedCallback` because SSR calls the
     * former and not the latter, so the attribute is present in server output.
     */
    protected override willUpdate(changed: PropertyValues): void {
      super.willUpdate(changed)
      // Only the first time, before anything reads it. See `MixinControllerOpen`.
      if (this.checkedMode === undefined) {
        this.checkedMode = this.checkedState !== undefined
      }
      this.toggleAttribute('data-checked', this.checked)
    }

    /**
     * The consumer's callback, invoked after the state is applied.
     *
     * Not an attribute: it is a function. And not reachable from React's JSX,
     * which reserves every `on[A-Z]` prop for its own event system and drops
     * what it does not recognize; the generated wrapper listens for the event
     * instead.
     */
    @property({ attribute: false })
    onCheckedChange: ((checked: boolean) => void) | undefined = undefined

    /**
     * Requests a checked change, and reports whether it was applied.
     *
     * Announces before it acts, so `preventDefault()` on the
     * `helix-change` is a refusal and nothing moves. In uncontrolled mode
     * the element then updates itself; in controlled mode it applies nothing
     * and waits for the consumer to pass a new `checked`, which is what
     * "controlled" means.
     */
    requestChecked(next: boolean): boolean {
      if (this.checked === next) {
        return true
      }
      return requestControlledChange({
        apply: (checked) => {
          if (this.checkedIsControlled) {
            return
          }
          const previous = this.checked
          this.checkedState = checked
          this.requestUpdate('checked', previous)
        },
        controlled: this.checkedIsControlled,
        event: (checked) =>
          new HelixChangeEvent({
            name: (this as Named).name ?? '',
            value: String(checked),
          }),
        host: this,
        label: 'checked',
        next,
        notify: this.onCheckedChange,
        read: () => this.checked,
      })
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
