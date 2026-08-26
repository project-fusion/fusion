import type { PropertyValues } from 'lit'
import { property } from 'lit/decorators.js'
import { HelixCloseEvent, HelixOpenEvent } from '../../events/events.js'
import type { HelixElement } from '../../helix-element/helix-element.js'
import { requestChange } from '../../utils/request-change/request-change.js'

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
     *
     * helix-close
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
     * control does when a script assigns to it, and is the behavior an
     * imperative `element.open = true` should have whatever mode the element is
     * in. What the write does *not* do is change which mode that is.
     */
    private openState: boolean | undefined = undefined

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
     * Requests an open-state change, and reports whether it was applied.
     *
     * Announces before it acts, so `preventDefault()` on the `helix-open` or
     * `helix-close` is a refusal and nothing moves. Nobody refusing means the
     * element opens or closes itself, whether or not a consumer declared
     * `open`: a declared property is a seed and a correction, and a consumer
     * who wants the decision for themselves refuses it and assigns their own.
     * See 294.
     */
    requestOpen(next: boolean): boolean {
      if (this.open === next) {
        return true
      }
      return requestChange({
        apply: (open) => {
          const previous = this.open
          this.openState = open
          this.requestUpdate('open', previous)
        },
        event: (open) => (open ? new HelixOpenEvent() : new HelixCloseEvent()),
        host: this,
        next,
      })
    }

    /** Requests the opposite of the current state. */
    toggleOpen(): boolean {
      return this.requestOpen(!this.open)
    }
  }

  return OpenElement as Constructor<MixinControllerOpenInterface> & T
}
