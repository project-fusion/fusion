import { customElement, HelixElement } from '@fusion.dev/helix-core'
import { nothing, type PropertyValues } from 'lit'
import { property } from 'lit/decorators.js'
import type { HelixHeadlessOption } from '../../option/index.js'
import { DEFAULT_FILTER_OPERATORS, type FilterGrammarField } from '../grammar.js'
import type { HelixHeadlessFilterOperator } from '../operator/filter-operator.js'

/**
 * @summary One thing a set can be filtered by, and how.
 *
 * @description
 * **A declaration, not a control.** It renders nothing and is never seen. A
 * consumer writes one per field, with the comparisons that field supports and
 * the values it supports them on, and the filter input reads them to build its
 * menu:
 *
 * ```html
 * <helix-headless-filter-field name="disposition" label="Disposition">
 *   <helix-headless-filter-operator name="any" label="is any of" default>
 *   </helix-headless-filter-operator>
 *   <helix-headless-filter-operator name="none" label="is none of">
 *   </helix-headless-filter-operator>
 *   <helix-headless-option value="refunded">Refunded</helix-headless-option>
 * </helix-headless-filter-field>
 * ```
 *
 * **Operators are per field and never global.** `is after` belongs to a date and
 * `has all of` to a set, and a field that supports one comparison shows no
 * chooser at all. A global list would offer every field every word and leave the
 * component deciding which of them made sense, which is the domain question it
 * declines to answer.
 *
 * **A field that declares none gets two, and they are the ones the punctuation
 * can say.** `is any of` and `is none of` are what `field:a,b` and `-field:a,b`
 * mean, so declaring them was ceremony for the case every product has; the
 * example above is what a consumer writes when the words matter, not the price
 * of admission. Declaring one comparison replaces both rather than joining
 * them — see `vocabulary`, which is where that is decided once for the menu and
 * the grammar together.
 *
 * **Values are `Option`s, which is the element a consumer already has.** They
 * carry a value, a label and a disabled state, and a picker built on `Menu` or
 * `Listbox` can render them without this element inventing a second way to say
 * the same thing. A field whose values cannot be enumerated declares none, and
 * what fills a chip then is whatever the consumer types.
 *
 * @since 0.23.0
 * @status experimental
 * @category forms
 * @aliases Facet, Dimension
 * @documentation https://helix.fusion.dev/components/filter-input
 *
 * @slot - The comparisons this field supports, as `FilterOperator`s, and the
 * values it supports them on, as `Option`s. Neither is rendered: they are read.
 */
@customElement('helix-headless-filter-field')
export class HelixHeadlessFilterField extends HelixElement {
  /**
   * What a reader is shown, in the menu and on every chip built from this field.
   */
  @property()
  label = ''

  /**
   * What the consumer's own model calls this field.
   *
   * Never shown, and what arrives in the filter this helps build.
   *
   * Reflected and so undefaulted: a reflected property with a default writes an
   * attribute on upgrade that the server never wrote.
   */
  @property({ reflect: true })
  name?: string

  /**
   * The comparisons declared under this field, in the order they were written.
   *
   * Read from the light DOM rather than from a slot, because there is no slot:
   * this element renders nothing, so nothing is ever assigned. Order is the
   * consumer's, which is the order a chooser should offer them in.
   *
   * **As declared, so empty where nothing was.** The defaults are applied by
   * `vocabulary` and not here: this getter answers what the consumer wrote, and
   * a caller that wants what the field *supports* wants the other one.
   */
  get operators(): HelixHeadlessFilterOperator[] {
    return [
      ...this.querySelectorAll<HelixHeadlessFilterOperator>(
        ':scope > helix-headless-filter-operator, :scope > helix-filter-operator',
      ),
    ]
  }

  /**
   * The comparison a chip leaves unwritten, or nothing where the consumer named
   * none.
   *
   * **The first one marked, and a second is reported rather than resolved.** Two
   * defaults on one field is a consumer saying two different things, and picking
   * one of them quietly would show a chip whose operator is missing and whose
   * meaning is not the one they wrote. A field with no default has none: every
   * chip built from it then spells its operator out, which is correct for a
   * field whose comparisons are all equally surprising.
   */
  get defaultOperator(): HelixHeadlessFilterOperator | null {
    const marked = this.operators.filter((operator) => operator.default)
    if (marked.length > 1) {
      console.warn(
        `\`${this.name || 'A filter field'}\` names ${marked.length} default operators, and a chip can only leave one unwritten. Mark one.`,
      )
    }
    return marked[0] ?? null
  }

  /**
   * The values declared under this field, in the order they were written.
   *
   * Empty is meaningful rather than missing: a field whose values cannot be
   * listed, a free text search or an open ended number, declares none and the
   * picker offers typing instead of choosing.
   */
  get values(): HelixHeadlessOption[] {
    return [
      ...this.querySelectorAll<HelixHeadlessOption>(
        ':scope > helix-headless-option, :scope > helix-option',
      ),
    ]
  }

  /**
   * This field flattened into what the menu renders and the grammar reads.
   *
   * **The one place the defaults are applied.** A field that declares no
   * comparisons supports `is any of` and `is none of`, which is what the typed
   * grammar can say and so what the picker offers; declaring one replaces both,
   * because a set half inherited and half written is one nobody can read off the
   * markup. Two things need this answer and neither should be resolving it
   * itself.
   *
   * Data rather than elements, so the grammar stays a module with no DOM in it
   * and the menu renders rows from the same shape whether the consumer wrote the
   * operators or not.
   */
  get vocabulary(): FilterGrammarField {
    const declared = this.operators
    const unwritten = this.defaultOperator
    return {
      label: this.label,
      name: this.name ?? '',
      operators:
        declared.length > 0
          ? declared.map((operator) => ({
              default: operator === unwritten,
              label: operator.label,
              name: operator.name ?? '',
            }))
          : DEFAULT_FILTER_OPERATORS,
      values: this.values.map((option) => ({
        label: option.textContent?.trim() || option.value,
        value: option.value,
      })),
    }
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    // Never in the accessibility tree, because never on the page. See the note
    // on `FilterOperator`, which says the same for the same reason.
    this.internals.role = 'none'
  }

  /**
   * Nothing, which is what makes this a declaration.
   *
   * No `<slot>`, so none of the children a consumer wrote is painted. See
   * `FilterOperator`'s note, which records the mechanism.
   */
  protected override render(): typeof nothing {
    return nothing
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-filter-field': HelixHeadlessFilterField
  }
}
