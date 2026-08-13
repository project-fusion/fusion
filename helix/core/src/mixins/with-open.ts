import type { PropertyValues } from 'lit'
import { property } from 'lit/decorators.js'
import { HelixOpenChangeEvent } from '../events.js'
import type { HelixElement } from '../helix-element.js'

// biome-ignore lint/suspicious/noExplicitAny: mixin constructors are variadic by nature
type Constructor<T> = new (...args: any[]) => T

/**
 * The public surface `WithOpen` adds.
 *
 * Declared separately because TypeScript cannot emit declarations for an
 * anonymous class that has private members (TS4094). Casting the mixin's return
 * to this interface keeps the internals private and the build working.
 */
export declare class WithOpenInterface {
  /** Initial open state for uncontrolled use. Ignored once `open` is set. */
  defaultOpen: boolean

  /** The resolved open state, whichever mode the element is in. */
  readonly isOpen: boolean

  /** Whether the element is open. Setting this enters controlled mode. */
  open: boolean | undefined

  /** Requests an open-state change. */
  setOpen(next: boolean): void
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
export const WithOpen = <T extends Constructor<HelixElement>>(Base: T) => {
  // JSDoc is duplicated from WithOpenInterface deliberately. The interface is
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
     * Requests an open-state change. In uncontrolled mode the element updates
     * itself; in controlled mode it only notifies and waits for the consumer.
     */
    setOpen(next: boolean): void {
      if (this.isOpen === next) {
        return
      }
      if (!this.isControlled) {
        this.internalOpen = next
        this.requestUpdate()
      }
      this.dispatchEvent(new HelixOpenChangeEvent({ open: next }))
    }
  }

  return OpenElement as Constructor<WithOpenInterface> & T
}
