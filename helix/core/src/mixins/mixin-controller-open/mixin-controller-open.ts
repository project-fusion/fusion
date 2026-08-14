import type { PropertyValues } from 'lit'
import { property } from 'lit/decorators.js'
import { HelixCloseEvent, HelixOpenEvent } from '../../events/events.js'
import type { HelixElement } from '../../helix-element/helix-element.js'
import { requestControlledChange } from '../../utils/request-controlled-change/request-controlled-change.js'

// biome-ignore lint/suspicious/noExplicitAny: mixin constructors are variadic by nature
type Constructor<T> = new (...args: any[]) => T

/**
 * The public surface `MixinControllerOpen` adds.
 *
 * Declared separately because TypeScript cannot emit declarations for an
 * anonymous class that has private members (TS4094). Casting the mixin's return
 * to this interface keeps the internals private and the build working.
 */
export declare class MixinControllerOpenInterface {
  /** Initial open state for uncontrolled use. Ignored once `open` is set. */
  defaultOpen: boolean

  /** The resolved open state, whichever mode the element is in. */
  readonly isOpen: boolean

  /** Whether the element is open. Setting this enters controlled mode. */
  open: boolean | undefined

  /**
   * The consumer's callback, invoked after the state is applied.
   *
   * A React consumer cannot pass this through JSX: React reserves every prop
   * matching `on[A-Z]` and drops the ones it does not recognise. The generated
   * wrapper attaches a listener for `helix-open` and `helix-close` instead.
   * This is for a consumer holding a reference, or a framework that assigns
   * properties.
   */
  onOpenChange: ((open: boolean) => void) | undefined

  /**
   * Requests an open-state change, and reports whether it was applied.
   *
   * Announces before it acts: a listener calling `preventDefault()` on the
   * `helix-open` or `helix-close` refuses the change, and nothing moves.
   */
  requestOpen(next: boolean): boolean

  /** Requests the opposite of the current state. */
  toggleOpen(): boolean
}

/**
 * Grafts controlled and uncontrolled open state onto a base class.
 *
 * Controlled mode is detected automatically: once a consumer sets `open`, the
 * element stops managing the value and only emits `open-change`. Uncontrolled
 * consumers set `defaultOpen` and let the element own it.
 *
 * Sets `data-open` on the host whenever the element is open, in either mode.
 * Styled tiers select on that rather than `[open]`, which is absent for
 * uncontrolled consumers.
 */
export const MixinControllerOpen = <T extends Constructor<HelixElement>>(Base: T) => {
  // JSDoc is duplicated from MixinControllerOpenInterface deliberately. The interface is
  // what TypeScript consumers see; this class is what the manifest analyzer
  // reads when resolving inherited members into dependent packages.
  class OpenElement extends Base {
    /** Whether the element is open. Setting this enters controlled mode. */
    @property({ reflect: true, type: Boolean })
    open: boolean | undefined = undefined

    /** Initial open state for uncontrolled use. Ignored once `open` is set. */
    @property({ attribute: 'default-open', type: Boolean })
    defaultOpen = false

    /**
     * Uncontrolled state, `undefined` until the element is first toggled.
     *
     * Deliberately not seeded from `defaultOpen` in `connectedCallback`: SSR
     * never calls that hook, so a `default-open` element would render closed on
     * the server and snap open at hydration. Falling back to `defaultOpen` in
     * the getter needs no lifecycle at all, so server and client agree.
     */
    private internalOpen: boolean | undefined = undefined

    /** The resolved open state, whichever mode the element is in. */
    get isOpen(): boolean {
      if (this.isControlled) {
        return this.open ?? false
      }
      return this.internalOpen ?? this.defaultOpen
    }

    private get isControlled(): boolean {
      return this.open !== undefined
    }

    /**
     * Mirrors the resolved state onto the host as `data-open`.
     *
     * In `willUpdate` rather than `connectedCallback` because SSR calls the
     * former and not the latter, so the attribute is present in server output.
     */
    protected override willUpdate(changed: PropertyValues): void {
      super.willUpdate(changed)
      this.toggleAttribute('data-open', this.isOpen)
    }

    /**
     * The consumer's callback, invoked after the state is applied.
     *
     * Not an attribute: it is a function. And not reachable from React's JSX,
     * which reserves every `on[A-Z]` prop for its own event system and drops
     * what it does not recognise; the generated wrapper listens for the events
     * instead.
     */
    @property({ attribute: false })
    onOpenChange: ((open: boolean) => void) | undefined = undefined

    /**
     * Requests an open-state change, and reports whether it was applied.
     *
     * Announces before it acts, so `preventDefault()` on the `helix-open` or
     * `helix-close` is a refusal and nothing moves. In uncontrolled mode the
     * element then updates itself; in controlled mode it applies nothing and
     * waits for the consumer to pass a new `open`, which is what "controlled"
     * means.
     */
    requestOpen(next: boolean): boolean {
      if (this.isOpen === next) {
        return true
      }
      return requestControlledChange({
        apply: (open) => {
          if (this.isControlled) {
            return
          }
          this.internalOpen = open
          this.requestUpdate()
        },
        event: (open) => (open ? new HelixOpenEvent() : new HelixCloseEvent()),
        host: this,
        next,
        notify: this.onOpenChange,
      })
    }

    /** Requests the opposite of the current state. */
    toggleOpen(): boolean {
      return this.requestOpen(!this.isOpen)
    }
  }

  return OpenElement as Constructor<MixinControllerOpenInterface> & T
}
