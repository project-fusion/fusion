import { customElement, HelixElement, HelixFacetEvent } from '@fusion.dev/helix-core'
import { nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
/* `lit/static-html.js`, because this template interpolates tag names: it renders
   the placeholder as the element otherwise, which shifts every attribute after
   it by one. `Notification` records the same trap. */
import { html } from 'lit/static-html.js'
import { HelixHeadlessFilterField } from '../field/filter-field.js'
import type { FilterGrammarOperator } from '../grammar.js'
import '../../divider/index.js'
import '../../menu/index.js'

/**
 * @summary A menu for building a filter by picking a field and checking its values.
 *
 * @description
 * Reads the `FilterField` declarations inside it and renders a two-level menu:
 * the fields, and under each field its operators and values. The menu does not
 * interpret what a field means.
 *
 * ```html
 * <helix-headless-filter-menu label="Filter">
 *   <helix-headless-filter-field name="disposition" label="Disposition">
 *     <helix-headless-option value="refunded">Refunded</helix-headless-option>
 *   </helix-headless-filter-field>
 * </helix-headless-filter-menu>
 * ```
 *
 * That field declares no operators, so it offers `is any of` and `is none of`,
 * the two the typed grammar supports. The menu and the typed text offer the
 * same filters because both read `FilterField.vocabulary`. Declare other
 * operators on the field when you need them.
 *
 * Ticking a value applies the filter immediately. There is no Apply button.
 * Each tick fires `helix-facet` with the field's whole set of values, so
 * results narrow as the user works. Unticking the last value fires an empty
 * set, which is your cue to remove the chip.
 *
 * The operator is chosen in the menu. `helix-facet` carries an empty
 * `operatorLabel` when the operator is the field's default, which is the value
 * a chip's `operator-label` expects, so the operator segment appears only for a
 * non-default choice. The menu decides this because it is the only element that
 * reads both the field and its operators.
 *
 * An operator's `arity` sets what appears under it:
 *
 * - `arity="none"`, such as `is empty` or `is set`, offers no values and clears
 *   any that were ticked. The operator is the whole filter.
 * - `arity="one"` offers the values as a single choice. Pressing another value
 *   replaces the choice, and pressing the chosen value clears it.
 *
 * `helix-facet` includes `arity`, so you can tell an empty filter from no
 * filter.
 *
 * The menu applies nothing. The chips are your markup and the rows are your
 * data, so the menu fires the event and leaves the change to you, as
 * `Notification` does for a read. Call `preventDefault()` on `helix-facet` to
 * cancel the change.
 *
 * @since 0.25.0
 * @status stable
 * @category forms
 * @aliases FacetPicker, FilterBuilder
 * @documentation https://fusion.dev/helix/components/filter-input
 *
 * @slot - The fields the menu can filter by, as `FilterField`s. The menu reads them and does not render them.
 * @slot trigger - The control that opens the menu, usually a `Button`.
 *
 * @event {HelixFacetEvent} helix-facet - Fired when a field's values change. Cancelable: call `preventDefault()` to keep the previous values.
 *
 * @csspart divider - The line between a field's comparisons and its values.
 * @csspart divider-content - The content set into the line.
 * @csspart divider-line - The line itself.
 * @csspart entry - One row: a field, its comparison, an operator, or a value.
 * @csspart entry-end - The trailing column of a row, which holds its shortcut.
 * @csspart entry-item - The row itself.
 * @csspart entry-mark - The mark at the end of a row: a check mark on a chosen value, and a caret on a field.
 * @csspart entry-shortcut - The key drawn for a row's shortcut. The filter menu sets none, so it renders only where a subclass does.
 * @csspart entry-shortcut-kbd - The key inside it.
 * @csspart entry-start - The leading column.
 * @csspart menu - The menu the fields are offered in.
 * @csspart menu-back - The button that goes back from a field's page.
 * @csspart menu-back-mark - The icon on the back button.
 * @csspart menu-empty - Shown when there are no fields to offer.
 * @csspart menu-header - The bar above a field's page, with the back button and the field's name.
 * @csspart menu-live - The inner menu's `live` part: the region that screen readers announce the empty and loading messages from.
 * @csspart menu-loading - Shown while the fields are loading.
 * @csspart menu-surface - The floating panel the menu is drawn on.
 * @csspart menu-title - The name of the field whose page is showing.
 */
@customElement('helix-headless-filter-menu')
export class HelixHeadlessFilterMenu extends HelixElement {
  /**
   * The menu's name, read by screen readers.
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

  /**
   * The fields declared inside the menu, in source order.
   *
   * What a render may know of them: none on a server, whose shim has no tree
   * and threw here, and none while hydrating what one sent.
   *
   * By identity rather than by tag. A list of names can only hold the tags this
   * package knows about, so it misses any third one, which is what subclassing
   * a headless element produces, and it is also how a headless package learns a
   * styled tag. `instanceof` answers for every one of them and proves the type
   * the signature claims.
   */
  get fields(): HelixHeadlessFilterField[] {
    return this.knownChildren.filter(
      (child): child is HelixHeadlessFilterField => child instanceof HelixHeadlessFilterField,
    )
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.finishHydration()
  }

  /** The values checked for one field. */
  valuesFor(field: string): readonly string[] {
    return [...(this.picked.get(field) ?? [])]
  }

  /**
   * The comparison a field uses: the one the user chose, or the field's
   * `default`, or the first one the field supports, in that order.
   *
   * **The last of those is not a fallback for nothing, it is the scalar case.**
   * A date supports `after` and nothing else and marks no default, because there
   * is nothing for a default to distinguish it from. Answering `null` there left
   * a chip built from it with no comparison at all: `Created` and a date, with
   * the word that made it mean anything missing. It is not marked `default`, so
   * it is not the unwritten one and the chip says it, which is right.
   *
   * Read off `vocabulary` rather than off the operator elements, so a field that
   * declared none is offered the defaults here and parses them in the text, from
   * one answer rather than two that can drift.
   */
  operatorFor(field: HelixHeadlessFilterField): FilterGrammarOperator | null {
    const { operators } = field.vocabulary
    const chosen = this.comparisons.get(field.name ?? '')
    const declared = operators.find((operator) => operator.default) ?? operators[0] ?? null
    if (chosen === undefined) {
      return declared
    }
    return operators.find((operator) => operator.name === chosen) ?? declared
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
    return this.dispatchEvent(
      new HelixFacetEvent({
        /* What tells a consumer an empty filter from no filter: `is empty` is a
           filter with no values and never will have any, and every other
           comparison with none is a field nobody is narrowing by. */
        arity: operator?.arity ?? 'many',
        field: field.name ?? '',
        label: field.label,
        operator: operator?.name ?? '',
        /* Empty where it is the field's usual comparison, which is what makes a
           chip drawn from this read as a field and its values and nothing
           between them. The grammar decides it the same way. */
        operatorLabel: operator?.default ? '' : (operator?.label ?? ''),
        values: this.valuesFor(field.name ?? ''),
      }),
    )
  }

  /**
   * Filters a field by the given values and sends `helix-facet`, as checking a
   * value does.
   *
   * **The one way this element's state changes**, whether the move came from a
   * row here, from a filter typed into the field around it, or from a chip
   * somebody dismissed. Before this existed the ticks were only ever written by
   * a press, so a chip removed anywhere else left the menu still showing it
   * ticked, and the reader's next press on that value read as *unticking* it:
   * they pressed `Refunded`, an empty set was announced, and nothing appeared.
   *
   * Refusing the `helix-facet` puts everything back, so a consumer who declines
   * a filter is never left looking at a menu that says it took.
   */
  apply(field: string, values: readonly string[], operator?: string): boolean {
    const declared = this.fields.find((one) => (one.name ?? '') === field)
    if (!declared) {
      return false
    }
    const heldValues = this.picked.get(field)
    const heldOperator = this.comparisons.get(field)
    if (operator !== undefined) {
      this.comparisons.set(field, operator)
    } else if (values.length === 0) {
      /* Nothing left and nobody named a comparison, so the field is not being
         filtered at all and the comparison goes back to the field's usual one.
         Held, it was invisible: the chip was gone and the reader's next tick
         quietly came back `is none of`, which is not what pressing a value in a
         fresh menu should mean. Naming one is the other case, a reader picking
         a comparison before they have ticked anything, and that stands. */
      this.comparisons.delete(field)
    }
    /* A comparison that takes no values is the whole filter, so anything ticked
       under the last one is not just unused, it is untrue. */
    const arity = this.operatorFor(declared)?.arity ?? 'many'
    this.picked.set(field, new Set(arity === 'none' ? [] : values))
    const stood = this.announce(declared)
    if (!stood) {
      if (heldValues === undefined) {
        this.picked.delete(field)
      } else {
        this.picked.set(field, heldValues)
      }
      if (heldOperator === undefined) {
        this.comparisons.delete(field)
      } else {
        this.comparisons.set(field, heldOperator)
      }
    }
    this.requestUpdate()
    return stood
  }

  /**
   * Keeps each choice row's tick where this element puts it.
   *
   * A choice row checks itself after `helix-before-toggle`, and this element
   * already sets `checked` on every row from its own state. The request is
   * refused, so a tick moves only when the choice is applied, and stopped, so
   * it does not reach a page that never placed the row.
   */
  private readonly keepTick = (event: Event): void => {
    if (event.target === event.currentTarget) {
      event.preventDefault()
      event.stopPropagation()
    }
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
   * control they did not write. Only the two rows that choose something need it:
   * a row that opens a page is stopped by `Menu` itself, in a capture-phase
   * handler, on the ground that looking into a submenu is not a choice. Measured
   * both ways, and widening this to every `data-facet` row changed nothing.
   */
  private readonly handleSelect = (event: Event): void => {
    const row = event.composedPath()[0]
    if (!(row instanceof HTMLElement)) {
      return
    }
    const kind = row.dataset.facet
    if (kind !== 'value' && kind !== 'operator') {
      return
    }
    event.stopPropagation()
    const field = row.dataset.field ?? ''
    const value = row.dataset.value ?? ''
    if (kind === 'operator') {
      this.apply(field, this.valuesFor(field), value)
      return
    }
    const declared = this.fields.find((one) => (one.name ?? '') === field)
    const held = this.picked.get(field) ?? new Set<string>()
    /* A scalar comparison takes one value, so pressing another replaces rather
       than adds: `is after` two dates is not a filter anybody can run. Pressing
       the one already on still takes it off, which is how a reader clears it
       without a second control to do it with. */
    if (declared && this.operatorFor(declared)?.arity === 'one') {
      this.apply(field, held.has(value) && held.size === 1 ? [] : [value])
      return
    }
    const ticked = new Set(held)
    if (ticked.has(value)) {
      ticked.delete(value)
    } else {
      ticked.add(value)
    }
    this.apply(field, [...ticked])
  }

  protected override render(): TemplateResult {
    const divider = this.tag('divider')
    const menu = this.tag('menu')
    const item = this.tag('menu-item')
    return html`<${menu}
      part="menu"
      exportparts="back: menu-back, back-mark: menu-back-mark, empty: menu-empty, header: menu-header,
        live: menu-live, loading: menu-loading, surface: menu-surface, title: menu-title"
      label=${this.label}
      @helix-select=${this.handleSelect}
    >
      <slot name="trigger" slot="trigger"></slot>
      ${this.fields.map((field) => {
        const { label, name, operators, values } = field.vocabulary
        const ticked = this.picked.get(name) ?? new Set<string>()
        const using = this.operatorFor(field)
        /* Nothing to offer under a comparison that takes no values. `is empty`
           is the whole filter, so a page of values beneath it would be a page of
           choices that change nothing, and ticking one would say something the
           comparison cannot mean. */
        const offered = using?.arity === 'none' ? [] : values
        return html`<${item}
          part="entry"
          exportparts="end: entry-end, item: entry-item, mark: entry-mark, shortcut: entry-shortcut,
            shortcut-kbd: entry-shortcut-kbd, start: entry-start"
          data-facet="field"
          data-field=${name}
        >
          ${label}
          ${
            /* **A page of its own rather than a run of rows above the values.**
               Flat, the comparison and the values were five rows drawn the same
               way, and a reader had nothing to tell them apart by: `is any of`
               and `Refunded` both took a tick, though one is a single choice and
               the other is not. Nested, the row shows the comparison in force,
               carries a caret rather than a tick, and the choosing happens
               somewhere a tick means one thing. A field with one comparison has
               nothing to choose and shows no row at all. */
            operators.length > 1
              ? html`<${item}
                  part="entry"
                  exportparts="end: entry-end, item: entry-item, mark: entry-mark, shortcut: entry-shortcut,
            shortcut-kbd: entry-shortcut-kbd, start: entry-start"
                  slot="submenu"
                  data-facet="comparison"
                  data-field=${name}
                >
                  ${using?.label ?? ''}
                  ${operators.map(
                    (operator) => html`<${item}
                      part="entry"
                      exportparts="end: entry-end, item: entry-item, mark: entry-mark, shortcut: entry-shortcut,
            shortcut-kbd: entry-shortcut-kbd, start: entry-start"
                      slot="submenu"
                      checkable
                      exclusive
                      ?checked=${operator.name === using?.name}
                      @helix-before-toggle=${this.keepTick}
                      data-facet="operator"
                      data-field=${name}
                      data-value=${operator.name}
                    >${operator.label}</${item}>`,
                  )}
                </${item}>`
              : nothing
          }
          ${
            /* And a rule under it, because the two runs are different questions:
               one comparison and any number of values. The row above already
               reads differently, carrying a caret where the values carry ticks,
               and the rule is what makes them two groups rather than one list
               that happens to change halfway down. Only where there is a
               comparison to separate. */
            operators.length > 1 && offered.length > 0
              ? html`<${divider}
                  part="divider"
                  exportparts="content: divider-content, line: divider-line"
                  slot="submenu"
                  announced
                ></${divider}>`
              : nothing
          }
          ${offered.map(
            (option) => html`<${item}
              part="entry"
              exportparts="end: entry-end, item: entry-item, mark: entry-mark, shortcut: entry-shortcut,
            shortcut-kbd: entry-shortcut-kbd, start: entry-start"
              slot="submenu"
              checkable
              ?exclusive=${using?.arity === 'one'}
              ?checked=${ticked.has(option.value)}
              @helix-before-toggle=${this.keepTick}
              data-facet="value"
              data-field=${name}
              data-value=${option.value}
            >${option.label}</${item}>`,
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
