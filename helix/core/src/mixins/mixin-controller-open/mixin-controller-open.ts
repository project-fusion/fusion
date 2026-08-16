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

  /**
   * Whether the element is open.
   *
   * Reading gives the real state, in either mode. Writing hands ownership to
   * the consumer: from then on the element announces changes and applies none
   * of them, and waits to be told.
   */
  open: boolean

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
    /**
     * Whether the element is open.
     *
     * One property, not two. Reading gives the real state whichever mode the
     * element is in, so `dialog.open` answers the question anyone asking it
     * meant. Writing hands ownership to the consumer, which is what the
     * attribute in `<helix-dialog open>` does as well: from then on the element
     * announces changes and applies none of them.
     *
     * It reads as an accessor pair rather than a field because those are two
     * different questions sharing one name, and the alternative was a second
     * property answering the first. That worked for a boolean, where `isOpen`
     * reads well; there is no such word for a value or an active item, so all
     * four of these mixins now have this shape instead of two shapes.
     *
     * Not reflected. The attribute is the consumer's input and stays as they
     * wrote it; `data-open` carries the resolved state for stylesheets, which
     * is what it has always been for.
     */
    @property({ type: Boolean })
    get open(): boolean {
      return this.ownedOpen ?? this.internalOpen ?? this.defaultOpen
    }

    set open(next: boolean) {
      const previous = this.open
      this.ownedOpen = next
      this.requestUpdate('open', previous)
    }

    /** Initial open state for uncontrolled use. Ignored once `open` is written. */
    @property({ attribute: 'default-open', type: Boolean })
    defaultOpen = false

    /**
     * What the consumer set, and the only thing that says they own this.
     *
     * `undefined` until they write, which is why it is a separate field from
     * the internal one rather than a flag beside it: "never written" and
     * "written false" have to be different, and one field cannot hold both.
     */
    private ownedOpen: boolean | undefined = undefined

    /**
     * Uncontrolled state, `undefined` until the element is first toggled.
     *
     * Deliberately not seeded from `defaultOpen` in `connectedCallback`: SSR
     * never calls that hook, so a `default-open` element would render closed on
     * the server and snap open at hydration. Falling back to `defaultOpen` in
     * the getter needs no lifecycle at all, so server and client agree.
     */
    private internalOpen: boolean | undefined = undefined

    private get isControlled(): boolean {
      return this.ownedOpen !== undefined
    }

    /**
     * Mirrors the resolved state onto the host as `data-open`.
     *
     * In `willUpdate` rather than `connectedCallback` because SSR calls the
     * former and not the latter, so the attribute is present in server output.
     */
    protected override willUpdate(changed: PropertyValues): void {
      super.willUpdate(changed)
      this.toggleAttribute('data-open', this.open)
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
      if (this.open === next) {
        return true
      }
      return requestControlledChange({
        apply: (open) => {
          if (this.isControlled) {
            return
          }
          const previous = this.open
          this.internalOpen = open
          this.requestUpdate('open', previous)
        },
        event: (open) => (open ? new HelixOpenEvent() : new HelixCloseEvent()),
        host: this,
        next,
        notify: this.onOpenChange,
      })
    }

    /** Requests the opposite of the current state. */
    toggleOpen(): boolean {
      return this.requestOpen(!this.open)
    }
  }

  return OpenElement as Constructor<MixinControllerOpenInterface> & T
}
