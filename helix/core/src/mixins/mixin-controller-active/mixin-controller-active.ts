import { property } from 'lit/decorators.js'
import { HelixChangeEvent } from '../../events/events.js'
import type { HelixElement } from '../../helix-element/helix-element.js'
import { requestControlledChange } from '../../utils/request-controlled-change/request-controlled-change.js'
import {
  type ActivatableItem,
  resolveActiveItem,
} from '../../utils/resolve-active-item/resolve-active-item.js'

// biome-ignore lint/suspicious/noExplicitAny: mixin constructors are variadic by nature
type Constructor<T> = new (...args: any[]) => T

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

  /**
   * Which item is current, by its `value`.
   *
   * Reading gives the real one, in either mode. Writing hands ownership to the
   * consumer: from then on the set announces changes and applies none of them.
   */
  active: string

  /** Initial item for uncontrolled use. Ignored once `active` is written. */
  defaultActive: string

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

    /**
     * Which item is current, by its `value`.
     *
     * Called `active`, which is what this mixin is named for and what it was
     * not: it declared `value`, so the one mixin whose whole subject is which
     * item is active had no such property, and `active` meant something else
     * entirely elsewhere in the library. It still does, and only there now:
     * `option.active` is the option the keyboard is on, which is a different
     * question from which one is chosen.
     *
     * An accessor pair, the same shape as the other three. Reading gives the
     * real item; writing hands ownership to the consumer, so `<helix-tabs
     * active="one">` is a set that stays on that tab and `default-active` is
     * how markup says where to start.
     */
    @property()
    get active(): string {
      return this.ownedActive ?? this.internalActive ?? this.defaultActive
    }

    set active(next: string) {
      const previous = this.active
      this.ownedActive = next
      this.requestUpdate('active', previous)
    }

    /** Initial item for uncontrolled use. Ignored once `active` is written. */
    @property({ attribute: 'default-active' })
    defaultActive = ''

    /** What the consumer set, and the only thing that says they own this. */
    private ownedActive: string | undefined = undefined

    /**
     * Uncontrolled state, `undefined` until the set is first moved.
     *
     * Not seeded from `defaultActive` in `connectedCallback`, which SSR never
     * calls: falling back in the getter needs no lifecycle, so the server and
     * the client agree.
     */
    private internalActive: string | undefined = undefined

    private get isControlled(): boolean {
      return this.ownedActive !== undefined
    }

    /**
     * Requests a new current item, and reports whether the request stood.
     *
     * Announces before it acts, so `preventDefault()` on the `helix-change` is
     * a refusal and nothing moves. Unlike a native control, nothing has moved
     * by the time this runs, so refusing is simply not writing: there is
     * nothing to put back.
     */
    requestActive(next: string): boolean {
      if (next === this.active) {
        return true
      }
      return requestControlledChange({
        apply: (value) => {
          /* Nothing at all in controlled mode, which is what controlled means:
             the set announces and waits to be told. This was a bare
             `this.value = next`, so a consumer who owned the state had it
             overwritten on every choice and could not own it at all. */
          if (this.isControlled) {
            return
          }
          const previous = this.active
          this.internalActive = value
          this.requestUpdate('active', previous)
        },
        event: (value) => new HelixChangeEvent({ name: '', value }),
        host: this,
        next,
        notify: this.onActiveChange,
      })
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
      return resolveActiveItem(this.active, items)
    }
  }

  return ActiveElement as unknown as Constructor<MixinControllerActiveInterface> & T
}
