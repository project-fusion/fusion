import { property } from 'lit/decorators.js'
import { HelixChangeEvent } from '../../events/events.js'
import type { HelixElement } from '../../helix-element/helix-element.js'

// biome-ignore lint/suspicious/noExplicitAny: mixin constructors are variadic by nature
type Constructor<T> = new (...args: any[]) => T

/** The least a thing must be for this to pick one of them. */
export interface ActivatableItem {
  /** Whether it can be the current one. A disabled item is skipped. */
  disabled?: boolean
  /** What identifies it, and what `value` is compared against. */
  value: string
}

/**
 * The public surface `MixinControllerActive` adds.
 *
 * Declared separately because TypeScript cannot emit declarations for an
 * anonymous class that has private members (TS4094).
 */
export declare class MixinControllerActiveInterface {
  /**
   * The consumer's callback, invoked after the change is applied.
   *
   * Not reachable from React's JSX, which reserves every `on[A-Z]` prop for its
   * own event system; the generated wrapper listens for the event instead.
   */
  onActiveChange: ((value: string) => void) | undefined

  /** Which item is current, by its `value`. */
  value: string

  /** Requests a new current item, and reports whether the request stood. */
  requestActive(next: string): boolean

  /**
   * Which item is current, given what there is to choose from.
   *
   * The first enabled one when `value` names nothing, which is a set before its
   * consumer has chosen and a set whose current item has just been removed.
   */
  protected resolveActive<Item extends ActivatableItem>(items: Item[]): Item | undefined
}

/**
 * Grafts "which one of these is the current one" onto a container.
 *
 * For a set where one member is current and the set is not a form control:
 * tabs, a tree, a nav bar, a carousel. Where it *is* a form control the value
 * is submitted and belongs to `MixinControllerValue`, which is why these are
 * two mixins and not one with a flag.
 *
 * **Announcing before applying is the part worth sharing.** `Tabs` and `Tree`
 * both wrote the current value straight from the item's event, so a consumer
 * had no way to refuse a change, while `Radio.Group` announced first. Neither
 * was wrong on its own and the two together are: whether a selection can be
 * refused should not depend on which component a reader is looking at.
 *
 * **The fallback is the other half.** Four components had written
 * `items.find(match) ?? items[0]`, and it is not the obvious line it looks
 * like: it is what makes a set with a `value` naming nothing still show
 * something, which is every set before its consumer has set one and every set
 * whose current item has just been removed. `resolveActive` also skips disabled
 * items, which the hand-written copies did not, so a set opening on a disabled
 * first item showed it as current.
 */
export const MixinControllerActive = <T extends Constructor<HelixElement>>(Base: T) => {
  // JSDoc is duplicated from the interface deliberately. The interface is what
  // TypeScript consumers see; this class is what the manifest analyzer reads
  // when resolving inherited members into dependent packages.
  class ActiveElement extends Base {
    /** The consumer's callback, invoked after the change is applied. */
    @property({ attribute: false })
    onActiveChange: ((value: string) => void) | undefined = undefined

    /** Which item is current, by its `value`. */
    @property()
    value = ''

    /**
     * Requests a new current item, and reports whether the request stood.
     *
     * Announces before it acts, so `preventDefault()` on the `helix-change` is
     * a refusal and nothing moves. Unlike a native control, nothing has moved
     * by the time this runs, so refusing is simply not writing: there is
     * nothing to put back.
     */
    requestActive(next: string): boolean {
      if (next === this.value) {
        return true
      }
      const allowed = this.dispatchEvent(new HelixChangeEvent({ name: '', value: next }))
      if (!allowed) {
        return false
      }
      this.value = next
      this.onActiveChange?.(next)
      return true
    }

    /**
     * Which item is current, given what there is to choose from.
     *
     * The first enabled one when `value` names nothing, which is a set before
     * its consumer has chosen and a set whose current item has just been
     * removed. Disabled items are skipped in the fallback but not in the match:
     * a consumer who names a disabled item meant it, and quietly moving to
     * another would be the component overruling them.
     */
    protected resolveActive<Item extends ActivatableItem>(items: Item[]): Item | undefined {
      return items.find((item) => item.value === this.value) ?? items.find((item) => !item.disabled)
    }
  }

  return ActiveElement as unknown as Constructor<MixinControllerActiveInterface> & T
}
