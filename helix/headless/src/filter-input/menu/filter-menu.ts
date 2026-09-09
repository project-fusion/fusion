import { customElement, HelixElement, HelixFacetEvent } from '@fusion.dev/helix-core'
import { nothing, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
/* `lit/static-html.js`, because this template interpolates tag names: it renders
   the placeholder as the element otherwise, which shifts every attribute after
   it by one. `Notification` records the same trap. */
import { html } from 'lit/static-html.js'
import type { HelixHeadlessFilterField } from '../field/filter-field.js'
import type { HelixHeadlessFilterOperator } from '../operator/filter-operator.js'

/**
 * @summary The control that builds a filter: pick a field, tick its values.
 *
 * @description
 * **It reads the declarations and renders a menu.** A consumer writes their
 * fields as `FilterField`s inside this, and what comes out is a two level menu:
 * the fields, and under each one its comparisons and its values. Nothing here
 * knows what a field means, which is the line `FilterField` already draws.
 *
 * ```html
 * <helix-headless-filter-menu label="Filter">
 *   <helix-headless-filter-field name="disposition" label="Disposition">
 *     <helix-headless-filter-operator name="any" label="is any of" default>
 *     </helix-headless-filter-operator>
 *     <helix-headless-option value="refunded">Refunded</helix-headless-option>
 *   </helix-headless-filter-field>
 * </helix-headless-filter-menu>
 * ```
 *
 * **A tick is a filter, immediately.** There is no Apply: ticking a value
 * announces the field's whole set as it now stands, so a queue narrows as the
 * reader works rather than after they have finished. Unticking the last value
 * announces an empty set, which is a consumer's cue to drop the chip.
 *
 * **The operator is chosen here and written nowhere else.** `helix-facet` carries
 * `operatorLabel` empty when the comparison is the field's default, which is
 * exactly what a chip's `operator-label` wants: the segment appears only where
 * somebody picked something worth noticing. Deciding it here is the point, since
 * this is the only thing that has read both the field and its operators.
 *
 * **It applies nothing.** The chips are the consumer's markup and the rows are
 * their data, so this announces and stops, the way `Notification` reports a read
 * rather than inventing one. Refusing `helix-facet` refuses the change.
 *
 * @since 0.25.0
 * @status experimental
 * @category forms
 * @aliases FacetPicker, FilterBuilder
 * @documentation https://helix.fusion.dev/components/filter-input
 *
 * @slot - The fields this can filter by, as `FilterField`s. Read rather than rendered.
 * @slot trigger - The control that opens the menu. A `Button` is the usual one.
 *
 * @event {HelixFacetEvent} helix-facet - Fired when a field's values change. Cancelable: refusing it takes the decision and nothing moves.
 */
@customElement('helix-headless-filter-menu')
export class HelixHeadlessFilterMenu extends HelixElement {
  /**
   * Accessible name for the menu.
   */
  @property()
  label = 'Filter'

  /**
   * What is ticked, per field.
   *
   * **Held here rather than read back off the menu**, because the menu's rows
   * are rebuilt every time a page changes and a tick read from a row that has
   * been re-rendered is a tick nobody made. This is the answer; the rows are a
   * view of it.
   */
  private readonly picked = new Map<string, Set<string>>()

  /** Which comparison each field is using, where the reader chose one. */
  private readonly comparisons = new Map<string, string>()

  /** The fields declared inside this, in the order they were written. */
  get fields(): HelixHeadlessFilterField[] {
    return [
      ...this.querySelectorAll<HelixHeadlessFilterField>(
        ':scope > helix-headless-filter-field, :scope > helix-filter-field',
      ),
    ]
  }

  /** What is ticked for one field, as the consumer's own values. */
  valuesFor(field: string): readonly string[] {
    return [...(this.picked.get(field) ?? [])]
  }

  /**
   * Which comparison a field is using: the reader's choice, then the one the
   * field marked, then the first one it declared.
   *
   * **The last of those is not a fallback for nothing, it is the scalar case.**
   * A date supports `after` and nothing else and marks no default, because there
   * is nothing for a default to distinguish it from. Answering `null` there left
   * a chip built from it with no comparison at all: `Created` and a date, with
   * the word that made it mean anything missing. It is not marked `default`, so
   * it is not the unwritten one and the chip says it, which is right.
   */
  operatorFor(field: HelixHeadlessFilterField): HelixHeadlessFilterOperator | null {
    const chosen = this.comparisons.get(field.name ?? '')
    const declared = field.defaultOperator ?? field.operators[0] ?? null
    if (chosen === undefined) {
      return declared
    }
    return field.operators.find((operator) => operator.name === chosen) ?? declared
  }

  /**
   * Announces a field's set as it now stands, and reports whether it stood.
   *
   * The whole set rather than the one value that moved, because a filter is the
   * set: a consumer redrawing a chip from a single tick would have to keep their
   * own copy of everything else, which is the second source of truth this exists
   * to avoid.
   */
  private announce(field: HelixHeadlessFilterField): boolean {
    const operator = this.operatorFor(field)
    const isDefault = operator !== null && operator.default
    return this.dispatchEvent(
      new HelixFacetEvent({
        field: field.name ?? '',
        label: field.label,
        operator: operator?.name ?? '',
        /* Empty where it is the field's usual comparison, which is what makes a
           chip drawn from this read as a field and its values and nothing
           between them. */
        operatorLabel: isDefault ? '' : (operator?.label ?? ''),
        values: this.valuesFor(field.name ?? ''),
      }),
    )
  }

  /**
   * A row was chosen: a value to tick, or a comparison to use.
   *
   * **Read off the row rather than encoded into its `value`.** Packing the three
   * facts into one string and splitting them apart again was the first idea, and
   * it does not survive the template: a nested template literal inside a
   * `static-html` template comes back carrying Lit's own binding marker where
   * the separator was, so `field disposition` arrived with a null byte in the
   * middle of it and every split produced nonsense. Three data attributes cost
   * nothing and there is nothing to parse.
   *
   * Stopped here rather than let past, because a consumer listening for
   * `helix-select` on their own page should not receive one for a row inside a
   * control they did not write.
   */
  private readonly handleSelect = (event: Event): void => {
    const row = event.composedPath()[0]
    if (!(row instanceof HTMLElement)) {
      return
    }
    const kind = row.dataset.facet
    const field = row.dataset.field ?? ''
    const value = row.dataset.value ?? ''
    if (kind !== 'value' && kind !== 'operator') {
      return
    }
    event.stopPropagation()
    const declared = this.fields.find((one) => (one.name ?? '') === field)
    if (!declared) {
      return
    }

    if (kind === 'operator') {
      const previous = this.comparisons.get(field)
      this.comparisons.set(field, value)
      if (!this.announce(declared)) {
        /* Refused, so nothing moved: put the comparison back rather than leaving
           this holding a choice the consumer declined. */
        if (previous === undefined) {
          this.comparisons.delete(field)
        } else {
          this.comparisons.set(field, previous)
        }
      }
      this.requestUpdate()
      return
    }

    const ticked = this.picked.get(field) ?? new Set<string>()
    const was = ticked.has(value)
    if (was) {
      ticked.delete(value)
    } else {
      ticked.add(value)
    }
    this.picked.set(field, ticked)
    if (!this.announce(declared)) {
      // Refused: the tick goes back, so the menu keeps showing the truth.
      if (was) {
        ticked.add(value)
      } else {
        ticked.delete(value)
      }
    }
    this.requestUpdate()
  }

  protected override render(): TemplateResult {
    const menu = this.tag('menu')
    const item = this.tag('menu-item')
    return html`<${menu} label=${this.label} @helix-select=${this.handleSelect}>
      <slot name="trigger" slot="trigger"></slot>
      ${this.fields.map((field) => {
        const name = field.name ?? ''
        const ticked = this.picked.get(name) ?? new Set<string>()
        const operators = field.operators
        const using = this.operatorFor(field)
        return html`<${item} data-facet="field" data-field=${name}>
          ${field.label}
          ${
            operators.length > 1
              ? operators.map(
                  (operator) => html`<${item}
                    slot="submenu"
                    checkable
                    ?checked=${operator === using}
                    data-facet="operator"
                    data-field=${name}
                    data-value=${operator.name ?? ''}
                  >${operator.label}</${item}>`,
                )
              : nothing
          }
          ${field.values.map(
            (option) => html`<${item}
              slot="submenu"
              checkable
              ?checked=${ticked.has(option.value)}
              data-facet="value"
              data-field=${name}
              data-value=${option.value}
            >${option.textContent?.trim() || option.value}</${item}>`,
          )}
        </${item}>`
      })}
    </${menu}>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-filter-menu': HelixHeadlessFilterMenu
  }
}
