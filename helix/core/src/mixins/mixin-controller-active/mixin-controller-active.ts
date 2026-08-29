import { property } from 'lit/decorators.js'
import { HelixActivateEvent, HelixBeforeActivateEvent } from '../../events/events.js'
import type { HelixElement } from '../../helix-element/helix-element.js'
import { requestChange } from '../../utils/request-change/request-change.js'
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
   * Which item is current, by its `value`.
   *
   * Reading gives the real one. Writing always applies, and is a seed and a
   * correction rather than a claim of ownership: a consumer who wants the
   * decision refuses the `helix-before-activate`.
   */
  active: string

  /** Initial item for uncontrolled use. Ignored once `active` is written. */
  defaultActive: string

  /** Requests a new current item, and reports whether the request stood. */
  requestActive(next: string): boolean

  /**
   * Which item is current, given what there is to choose from.
   *
   * The first enabled one when `active` names nothing, which is a set before
   * its consumer has chosen and a set whose current item has just been removed.
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
 * **Announcing before applying is the part worth sharing.** Writing the current
 * value straight from the item's event leaves a consumer no way to refuse a
 * change, and whether a selection can be refused must not depend on which
 * component a reader is looking at.
 *
 * **The fallback is the other half.** `items.find(match) ?? items[0]` is not
 * the obvious line it looks like: it is what makes a set whose `active` names
 * nothing still show something, which is every set before its consumer has set
 * one and every set whose current item has just been removed. `resolveActive`
 * also skips disabled items in that fallback, or a set opening on a disabled
 * first item shows it as current.
 */
export const MixinControllerActive = <T extends Constructor<HelixElement>>(Base: T) => {
  // JSDoc is duplicated from the interface deliberately. The interface is what
  // TypeScript consumers see; this class is what the manifest analyzer reads
  // when resolving inherited members into dependent packages.
  class ActiveElement extends Base {
    /**
     * Which item is current, by its `value`.
     *
     * Not `option.active`, which is the option the keyboard is on: that is a
     * different question from which one is chosen.
     *
     * Writing always applies, so `<helix-tabs active="one">` starts on that
     * tab, and `default-active` is how markup says where to start without
     * naming the current one.
     */
    @property()
    get active(): string {
      return this.activeState ?? this.defaultActive
    }

    set active(next: string) {
      const previous = this.active
      this.activeState = next
      this.requestUpdate('active', previous)
    }

    /**
     * Initial item for uncontrolled use.
     *
     * Ignored once `active` is written.
     */
    @property({ attribute: 'default-active' })
    defaultActive = ''

    /**
     * The state, whoever set it, and `undefined` until somebody has.
     *
     * One field and not two. Writing always applies, the way a native control
     * does when a script assigns to it.
     */
    private activeState: string | undefined = undefined

    /**
     * Requests a new current item, and reports whether the request stood.
     *
     * Announces before it acts, so `preventDefault()` on the `helix-before-activate` is
     * a refusal and nothing moves. Unlike a native control, nothing has moved
     * by the time this runs, so refusing is simply not writing: there is
     * nothing to put back. Nobody refusing means the set updates itself,
     * whether or not a consumer declared `active`, a declared property being a
     * seed and a correction. See (294).
     */
    requestActive(next: string): boolean {
      if (next === this.active) {
        return true
      }
      const applied = requestChange({
        apply: (value) => {
          const previous = this.active
          this.activeState = value
          this.requestUpdate('active', previous)
        },
        event: (value) => new HelixBeforeActivateEvent({ value }),
        host: this,
        next,
      })
      if (applied) {
        this.announceActivated(next)
      }
      return applied
    }

    /**
     * Says the current child moved, once it has.
     *
     * `helix-activate` rather than a native word: nothing on the platform means
     * "a set chose a different member", and borrowing `change` would be a lie
     * about what moved.
     *
     * A consumer who only wants to know which child is current cannot use
     * `helix-before-activate` for it, that one firing *before* `apply`, so
     * `currentTarget.active` is the previous value inside the handler and
     * `detail.value` is a proposal another listener may refuse. `helix-select`
     * is no substitute either: it fires when an item is *chosen* and not when
     * `active` is assigned.
     *
     * **After `apply`, which is the whole reason it is a second event**, so the
     * state is on the element by the time a handler reads it. Not cancelable:
     * the decision was taken by the event before this one, and two refusable
     * events for one transition are two answers to one question. See (325).
     */
    private announceActivated(value: string): void {
      this.dispatchEvent(new HelixActivateEvent({ value }))
    }

    /**
     * Which item is current, given what there is to choose from.
     *
     * The first enabled one when `active` names nothing, which is a set before
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
