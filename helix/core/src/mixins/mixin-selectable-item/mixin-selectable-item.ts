import type { PropertyValues } from 'lit'
import { property } from 'lit/decorators.js'
import { HelixSelectEvent } from '../../events/events.js'
import type { HelixElement } from '../../helix-element/helix-element.js'

// biome-ignore lint/suspicious/noExplicitAny: mixin constructors are variadic by nature
type Constructor<T> = new (...args: any[]) => T

/**
 * The public surface `MixinSelectableItem` adds.
 *
 * Declared separately because TypeScript cannot emit declarations for an
 * anonymous class that has private members (TS4094). Casting the mixin's return
 * to this interface keeps the internals private and the build working.
 */
export declare class MixinSelectableItemInterface {
  /** Whether this one can be chosen. */
  disabled: boolean

  /** Moves focus to the control this renders, for the set's arrow keys. */
  focusItem(): void

  /**
   * The part `focusItem` focuses, which each family names for itself.
   *
   * Parameterised for the reason `MixinField`'s `reportRequired` takes its
   * anchor as an argument: the control is the family's to render, so a literal
   * here would be a lookup for a part this file does not write.
   */
  protected itemPart: string

  /**
   * Chooses this one and announces it, and reports whether the request stood.
   *
   * `MixinDismissible.dismiss` next door has the same shape and for the same
   * reason: a mixin has no family, so the answer to a cancelable event it
   * dispatches is read at the dispatch or nowhere. The set acting on the choice
   * offers the second refusal on its own root.
   */
  select(): boolean

  /** Whether this is the current one. Written by the set. */
  selected: boolean

  /** Identifies this one to the set, and is what a form submits. */
  value: string
}

/**
 * The item half of a set: what is chosen, and what the arrow keys move over.
 *
 * **This is `KeyboardNavigationController.NavigableItem`, implemented.** That
 * interface has declared the contract since the controller was written and
 * nothing implemented it, so every family that took the controller wrote the
 * same five members out again: Radio and Toggle were byte-identical down to the
 * fourteen-line note on `willUpdate`, and Tab differed in one part name. A
 * contract with no implementation is a contract each caller reinvents, and the
 * reinventions drift: the mirror is the half that must not, because a stylesheet
 * selects on it.
 *
 * **The render stays with the family and only the part name comes here.** These
 * elements are a radio, a switch and a tab, and what goes inside the control is
 * the whole of what makes them different. `itemPart` is the one thing the mixin
 * has to know, because focusing is the one thing it does to the render.
 *
 * **What is deliberately not here.** `defaultSelected` belongs to the families
 * whose selection a consumer declares in markup, and `focusable` to the ones
 * whose set has a tab stop to park while nothing is chosen. Neither is true of
 * every item in the library, and a mixin that granted them would publish a
 * property on a reference page for a fact the family has no answer to. The
 * items whose current one is wherever focus happens to be (`Menu.Item`,
 * `Drilldown.Item`, `SpeedDial.Item`) are the other kind again: their `selected`
 * is a getter over `activeElement` rather than a property a parent writes, so
 * they satisfy the same interface by a different route and take nothing from
 * here.
 */
export const MixinSelectableItem = <T extends Constructor<HelixElement>>(Base: T) => {
  // JSDoc is duplicated from MixinSelectableItemInterface deliberately. The
  // interface is what TypeScript consumers see; this class is what the manifest
  // analyzer reads when resolving inherited members into dependent packages.
  class SelectableItem extends Base {
    /**
     * Whether this one can be chosen.
     */
    @property({ reflect: true, type: Boolean })
    disabled = false

    /**
     * Whether this is the current one.
     *
     * Written by the set rather than by a consumer, which is why it takes no
     * default from an attribute here: a family whose selection a consumer
     * declares in markup carries `defaultSelected` of its own to say so.
     */
    @property({ type: Boolean })
    selected = false

    /**
     * Identifies this one to the set, and is what a form submits.
     */
    @property()
    value = ''

    /** The part `focusItem` focuses. See the interface note. */
    protected itemPart = 'item'

    /**
     * Moves focus to the control this renders, for the set's arrow keys.
     *
     * The set drives the keys and cannot reach the control itself, which is
     * inside this shadow root, so the intent is a method and the internals stay
     * the item's.
     */
    focusItem(): void {
      this.partNamed(this.itemPart)?.focus()
    }

    /** Chooses this one and announces it, and reports whether it stood. */
    select(): boolean {
      if (this.disabled) {
        return false
      }
      const event = new HelixSelectEvent({ value: this.value })
      this.dispatchEvent(event)
      return !event.defaultPrevented
    }

    /**
     * Mirrors the chosen state where a stylesheet can select on it.
     *
     * **A custom state rather than the `selected` attribute.** The parent writes
     * this: a listbox choosing a row, a tab strip moving the tab, a radio group
     * answering for its set. Reflected, that puts the element's own bookkeeping
     * onto markup a consumer wrote and a consumer's server never sent, which
     * React reconciles and reports as a mismatch, and which a serialized element
     * pasted back declares as a choice nobody made. `ElementInternals` holds it
     * instead, where it is not in the DOM at all.
     *
     * Reading `selected` is unaffected and so is writing it: the attribute still
     * seeds the property wherever a family declares one, which is what
     * `<helix-radio selected>` in a consumer's markup means. What stops is the
     * write back.
     */
    protected override willUpdate(changed: PropertyValues): void {
      super.willUpdate(changed)
      this.toggleState('selected', this.selected)
    }
  }

  /* Through `unknown`, for the reason `MixinField` records: two protected
     members are compatible only when they come from one declaration, and
     `itemPart` comes from two, the class here and the declared interface above.
     Making it public would put a part name on the reference page of every item
     in the library. */
  return SelectableItem as unknown as Constructor<MixinSelectableItemInterface> & T
}
