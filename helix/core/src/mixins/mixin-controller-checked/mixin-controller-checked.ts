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
   * matching `on[A-Z]` and drops the ones it does not recognise. The generated
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
 * Controlled mode is detected automatically: once a consumer sets `checked`,
 * the element stops managing the value and only announces. Uncontrolled
 * consumers set `defaultChecked` and let the element own it.
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
      return this.ownedChecked ?? this.internalChecked ?? this.defaultChecked
    }

    set checked(next: boolean) {
      const previous = this.checked
      this.ownedChecked = next
      this.requestUpdate('checked', previous)
    }

    /** What the consumer set, and the only thing that says they own this. */
    private ownedChecked: boolean | undefined = undefined

    /** Initial checked state for uncontrolled use. Ignored once `checked` is set. */
    @property({ attribute: 'default-checked', type: Boolean })
    defaultChecked = false

    /**
     * Uncontrolled state, `undefined` until the control is first changed.
     *
     * Not seeded from `defaultChecked` in `connectedCallback`: SSR never calls
     * that hook, so a `default-checked` control would render unchecked on the
     * server and snap checked at hydration. Falling back in the getter needs no
     * lifecycle at all, so server and client agree.
     */
    private internalChecked: boolean | undefined = undefined

    private get isControlled(): boolean {
      return this.ownedChecked !== undefined
    }

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
     * The consumer's callback, invoked after the state is applied.
     *
     * Not an attribute: it is a function. And not reachable from React's JSX,
     * which reserves every `on[A-Z]` prop for its own event system and drops
     * what it does not recognise; the generated wrapper listens for the event
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
          if (this.isControlled) {
            return
          }
          const previous = this.checked
          this.internalChecked = checked
          this.requestUpdate('checked', previous)
        },
        event: (checked) =>
          new HelixChangeEvent({
            name: (this as Named).name ?? '',
            value: String(checked),
          }),
        host: this,
        next,
        notify: this.onCheckedChange,
      })
    }

    /** Requests the opposite of the current state. */
    toggleChecked(): boolean {
      return this.requestChecked(!this.checked)
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
      this.internalChecked = undefined
      this.ownedChecked = undefined
      this.requestUpdate('checked', previous)
    }
  }

  return CheckedElement as Constructor<MixinControllerCheckedInterface> & T
}
