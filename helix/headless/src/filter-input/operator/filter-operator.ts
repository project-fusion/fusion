import { customElement, HelixElement } from '@fusion.dev/helix-core'
import { nothing, type PropertyValues } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary One way a filter can compare a field to its values.
 *
 * @description
 * Declares one operator a field supports. It renders nothing. Write operators
 * in markup beside the field's values. `FilterField` reads them, the chip shows the
 * one in use, and the menu offers the rest.
 *
 * Helix defines the shape of a filter, which is a field, an operator, and
 * values, and the interaction that builds one. The meaning of each operator
 * belongs to your domain: the element compares nothing and does not interpret
 * `name`.
 *
 * Mark the field's usual operator `default`. A chip with the default operator
 * shows only the field and the values. Marking a second operator `default` on
 * one field is an error, and the field reports it.
 *
 * @since 0.23.0
 * @status stable
 * @category forms
 * @aliases Comparator, Predicate
 * @documentation https://fusion.dev/helix/components/filter-input
 */
@customElement('helix-headless-filter-operator')
export class HelixHeadlessFilterOperator extends HelixElement {
  /**
   * How many values the comparison takes.
   *
   * `none` is a comparison that is complete on its own, which is what `is empty`
   * and `is set` are: a chip drawn for one shows no values because there are
   * none to show, and the menu that builds it offers nothing to pick.
   *
   * `one` takes a single value, which is every scalar comparison: `is after` a
   * date, `is above` a number. `many` takes a set, which is what `is any of` and
   * `is none of` are, and is the only arity a multi-select panel makes sense
   * for.
   *
   * Read rather than enforced. This element applies nothing, so the arity is a
   * fact the picker uses to decide what to offer, not a rule it polices. What
   * the picker does with it: `none` offers no values at all and takes back any
   * that were ticked, since the comparison is the whole filter; `one` replaces
   * rather than adds, and its rows announce as one of a set. The typed grammar
   * reads it too, refusing a list where a scalar was declared and never writing
   * a comparison that takes nothing.
   *
   * The arity reaches a consumer in `helix-facet`, which is what tells an empty
   * filter from no filter: `values` empty means the field is no longer narrowing
   * anything, unless the comparison is one that never had values to give.
   *
   * **Undefined reads as `many`, and takes no default**, which is the rule every
   * reflected property here answers to: a default writes an attribute on upgrade
   * that the server never wrote, and the two markups differ before a reader has
   * touched anything.
   */
  @property({ reflect: true })
  arity?: 'many' | 'none' | 'one'

  /**
   * Marks the comparison as the field's usual one, used unless the user picks
   * another.
   *
   * The chip leaves a default operator unwritten, so the common filter reads as
   * a field and its values and nothing else, and the word only appears once
   * somebody has chosen a comparison worth noticing.
   */
  @property({ reflect: true, type: Boolean })
  default = false

  /**
   * The comparison's text, shown on the chip and in the menu that changes it.
   *
   * Words rather than symbols, and the reason is that a set has more than one
   * negation: `!=` cannot tell "is none of" from "is not all of", and both are
   * filters somebody wants. A chip is read, so it takes the reading. The text
   * grammar a consumer types is theirs and may use whatever symbols it likes.
   */
  @property()
  label = ''

  /**
   * The comparison's name in your data model.
   *
   * Never shown. It is what arrives in the filter this element helps build, so
   * a consumer matches on it rather than on the words a reader sees, and
   * translating the label breaks nothing.
   *
   * Reflected and so undefaulted, for the reason `arity` gives above.
   */
  @property({ reflect: true })
  name?: string

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    /* Not a `listitem`, not an `option`, not anything. This element is never in
       the accessibility tree because it is never on the page: the menu that
       offers these renders its own rows. Saying so here stops a consumer's own
       stylesheet or a future refactor from quietly giving it one. */
    this.internals.role = 'none'
  }

  /**
   * Nothing, which is what makes this a declaration.
   *
   * **No `<slot>`, deliberately.** An element that renders no slot renders none
   * of its children, so the words a consumer writes inside one are held for
   * whoever reads them and never painted. That is the whole mechanism, and it
   * costs no `display: none` in a tier that has no stylesheet to put one in.
   */
  protected override render(): typeof nothing {
    return nothing
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-filter-operator': HelixHeadlessFilterOperator
  }
}
