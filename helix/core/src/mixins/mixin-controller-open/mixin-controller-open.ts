import type { PropertyValues } from 'lit'
import { property } from 'lit/decorators.js'
import { HelixBeforeCloseEvent, HelixBeforeOpenEvent } from '../../events/events.js'
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
   * `helix-before-open` or `helix-before-close` refuses the change, and nothing moves.
   */
  requestOpen(next: boolean): boolean

  /** Requests the opposite of the current state. */
  toggleOpen(): boolean
}

/**
 * Grafts open state onto a base class, and says so twice.
 *
 * `helix-before-open` and `helix-before-close` announce the change while it is
 * still a request, so `preventDefault()` refuses it and nothing moves. Native
 * `toggle` announces it afterwards, once the state has actually gone, carrying
 * `newState` and `oldState` the way the platform does on `<details>` and on a
 * popover. The first is how a consumer takes the decision; the second is what
 * they bind when they only want to know. See 294 and 296.
 *
 * `open` is a seed and a correction rather than a claim: the element applies
 * its own changes from wherever markup started it, and `defaultOpen` is what a
 * reset returns to.
 *
 * Records `:state(open)` whenever the element is open. Styled tiers select on
 * that rather than on `[open]`, which is absent until somebody writes it.
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
     * back holding whatever the last reader did rather than what the author
     * wrote. `:state(open)` carries the resolved state for stylesheets, which
     * is what the mirror has always been for.
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

    /**
     * Initial open state for uncontrolled use, where nothing declared one.
     */
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
     * Records the resolved state as the custom state `open`.
     *
     * **A state and not `data-open`, which is what this wrote until 27 Aug
     * 2026.** An `<helix-accordion-item default-open>` was served without the
     * attribute and gained it on upgrade, which is a hydration mismatch a React
     * consumer reports. See `HelixElement.toggleState`, and see `Toast.Item`
     * for the other answer to the same fault: inverting the hook so the write
     * falls on the side that only happens after somebody acts. Inversion works
     * where the resting state is the loud one and cannot help here, `checked`
     * and `open` being true only because a consumer asked for them.
     */
    protected override willUpdate(changed: PropertyValues): void {
      super.willUpdate(changed)
      this.toggleState('open', this.open)
    }

    /**
     * Requests an open-state change, and reports whether it was applied.
     *
     * Announces before it acts, so `preventDefault()` on the `helix-before-open` or
     * `helix-before-close` is a refusal and nothing moves. Nobody refusing means the
     * element opens or closes itself, whether or not a consumer declared
     * `open`: a declared property is a seed and a correction, and a consumer
     * who wants the decision for themselves refuses it and assigns their own.
     * See 294.
     */
    requestOpen(next: boolean): boolean {
      if (this.open === next) {
        return true
      }
      const applied = requestChange({
        apply: (open) => {
          const previous = this.open
          this.openState = open
          this.requestUpdate('open', previous)
        },
        event: (open) => (open ? new HelixBeforeOpenEvent() : new HelixBeforeCloseEvent()),
        host: this,
        next,
      })
      if (applied) {
        this.announceToggle(next)
      }
      return applied
    }

    /**
     * Says the state moved, under the platform's own name and in its shape.
     *
     * **`<details>` fires `toggle` and a popover fires `toggle`, and sixteen
     * families here fired neither.** Two of them render a real `<dialog>` and
     * ten show a `popover="manual"` panel, so the browser was already firing
     * something on an element inside a shadow root, where `toggle` neither
     * bubbles nor composes and so reaches nobody. The rest, the disclosures,
     * have no native element to fire anything at all: `AccordionItem` and
     * `TreeItem` are `aria-expanded` and `hidden` written by hand, which is
     * `<details>`'s job done manually.
     *
     * **From here rather than from `PopoverController`, which had it first.**
     * The controller covers eleven families and the mixin covers sixteen, and
     * the overlap is ten that would have announced twice. What `toggle` reports
     * is the *state*, and the state is this mixin's; the controller is a way of
     * putting a panel on the screen.
     *
     * **`newState` and `oldState`, because that is the platform's shape**, so a
     * consumer arriving from `<details>` reads the same two words. Not
     * cancelable: the before events are the request, and a second cancelable
     * event for one transition is two answers to one question.
     */
    private announceToggle(open: boolean): void {
      const event = new Event('toggle', { bubbles: false, cancelable: false, composed: false })
      Object.assign(event, {
        newState: open ? 'open' : 'closed',
        oldState: open ? 'closed' : 'open',
      })
      this.dispatchEvent(event)
    }

    /** Requests the opposite of the current state. */
    toggleOpen(): boolean {
      return this.requestOpen(!this.open)
    }
  }

  return OpenElement as Constructor<MixinControllerOpenInterface> & T
}
