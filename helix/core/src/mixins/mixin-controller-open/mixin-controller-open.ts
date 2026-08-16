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
 * Which mode it is in is read once, at the first update, from whether anything
 * had set `open` by then: markup, a hydrating server's attributes and a
 * framework's initial properties have all arrived, and nothing else has
 * happened yet. Set, and the consumer owns it and the element only announces.
 * Unset, and the element owns it and `defaultOpen` says where it starts.
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
     * **Not reflected, and that is required rather than tidy.** Reflection
     * writes the resolved state back as an attribute, and writing the attribute
     * is how a consumer says they own it. So an uncontrolled element that
     * opened itself would put `open` on its own host and, from the next thing
     * that read it, be indistinguishable from one the consumer controls:
     * cloned, serialised for hydration, or diffed by a framework, it would come
     * back controlled and stop responding. `data-open` carries the resolved
     * state for stylesheets, which is what it has always been for.
     */
    @property({ type: Boolean })
    get open(): boolean {
      return this.openState ?? this.defaultOpen
    }

    set open(next: boolean) {
      const previous = this.open
      this.openState = next
      this.requestUpdate('open', previous)
    }

    /** Initial open state for uncontrolled use, where nothing declared one. */
    @property({ attribute: 'default-open', type: Boolean })
    defaultOpen = false

    /**
     * The state, whoever set it, and `undefined` until somebody has.
     *
     * Prefixed, and it has to be. These mixins compose onto one prototype
     * chain, `Select` takes this one and `MixinControllerValue` together, and
     * TypeScript's `private` is a compile-time fiction: two mixins with a field
     * called `state` share one property on the instance, and the second one
     * silently overwrites the first. Measured, as a select whose `value` came
     * back holding its `open` boolean.
     *
     * One field and not two. Writing always applies, which is what a native
     * control does when a script assigns to it, and is the behaviour an
     * imperative `element.open = true` should have whatever mode the element is
     * in. What the write does *not* do is change which mode that is.
     */
    private openState: boolean | undefined = undefined

    /**
     * Whether the consumer owns the state, decided once and then fixed.
     *
     * Read off whether anything had set `open` by the time of the first update,
     * which is where markup, a hydrating server's attributes and a framework's
     * initial properties have all landed and nothing else has happened yet.
     *
     * Decided once, because the alternative is deciding continuously, and that
     * was tried: taking any write as a claim of ownership meant an uncontrolled
     * element became controlled the moment a script assigned to it, or the
     * moment the component set its own state, and then stopped responding. Both
     * were real and neither is anything a consumer asked for. A mode is a
     * declaration, and a declaration is made once.
     */
    private openMode: boolean | undefined = undefined

    private get openIsControlled(): boolean {
      return this.openMode === true
    }

    /**
     * Mirrors the resolved state onto the host as `data-open`.
     *
     * In `willUpdate` rather than `connectedCallback` because SSR calls the
     * former and not the latter, so the attribute is present in server output.
     */
    protected override willUpdate(changed: PropertyValues): void {
      super.willUpdate(changed)
      /* Before anything else reads it, and only the first time. Everything that
         declares the mode has arrived by now: attributes from markup or from a
         server's output, and properties a framework assigned on mount. */
      if (this.openMode === undefined) {
        this.openMode = this.openState !== undefined
      }
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
          /* Nothing in controlled mode: the element announced, and the consumer
             is the one who decides. This is the only path that respects that,
             which is why a component's own changes go through here and never
             through the setter. */
          if (this.openIsControlled) {
            return
          }
          const previous = this.open
          this.openState = open
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
