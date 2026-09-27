import {
  customElement,
  formatNumbers,
  HelixBeforeChangeEvent,
  HelixElement,
  requestChange,
} from '@fusion.dev/helix-core'
import { nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { html } from 'lit/static-html.js'
/* Relative, so this registers the base pair and the styled file's identical
   imports register the styled pair. `tier` picks which the template asks for. */
import '../../option/index.js'
import '../../select/index.js'

/**
 * @summary A control for choosing how many items each page shows.
 *
 * @description
 * A separate element that you place beside `Pagination`, like
 * `Pagination.Summary`, so you choose the direction and order of your footer.
 *
 * It uses `Select`, so it matches a table's filter dropdowns in the same
 * footer, both open and closed. The caret is `Select`'s, so it follows
 * `currentColor`, and the label is a real `<label for>` pointing at the
 * trigger's id.
 *
 * The label sits on the same row as the select. `Select`'s host is a column,
 * and an outer-tree rule overrides a `:host` rule, so the row layout needs no
 * property on `Select` and nothing added to your markup.
 *
 * An empty `sizes` renders nothing and does not fall back to the built-in list.
 * `Pagination` does the same with a single page, and both report it through
 * `ElementInternals.states`.
 *
 * `value` is the current size, and `default-value` is the size from the markup.
 * Changing it dispatches `helix-before-change`. Re-querying and returning to
 * page one is up to you, because only you know whether the current position
 * should be kept.
 *
 * @since 0.1.0
 * @status stable
 * @aliases Page size, Rows per page
 * @documentation https://fusion.dev/helix/components/pagination
 *
 * @event {HelixBeforeChangeEvent} helix-before-change - Fired before the size changes, and cancelable. Canceling it is the only way to stop a size change.
 *
 * @csspart control - The select.
 * @csspart control-feedback - The message that says what is wrong with the value.
 * @csspart control-hint - Help under the trigger.
 * @csspart control-indicator - The caret that shows the control opens.
 * @csspart control-label - The label beside the number.
 * @csspart control-listbox - The list inside the panel.
 * @csspart control-listbox-empty - The text shown when the filter hides every option.
 * @csspart control-listbox-feedback - The inner list's message that says what is wrong with the value.
 * @csspart control-listbox-filter-icon - The icon beside the filter field.
 * @csspart control-listbox-filter-mark - The default icon beside the filter field, shown when none is slotted.
 * @csspart control-listbox-hint - Help under the list.
 * @csspart control-listbox-items - The list of options.
 * @csspart control-listbox-label - The label above the list.
 * @csspart control-listbox-live - The inner list's `live` part, the region screen readers announce its empty and loading text from.
 * @csspart control-listbox-loading - The text shown while the options load.
 * @csspart control-listbox-search - The region that holds the filter field.
 * @csspart control-listbox-search-field - The filter field.
 * @csspart control-surface - The floating panel.
 * @csspart control-trigger - The closed control, which shows the chosen size.
 * @csspart control-value - The chosen size inside the trigger.
 * @csspart option - One size on offer.
 * @csspart option-description - The caption under the number, when there is one.
 * @csspart option-item - The row.
 * @csspart option-item-active - The row the keyboard is on.
 * @csspart option-item-selected - The row of the chosen size.
 * @csspart option-label - The number.
 * @csspart option-text - The number and the caption, as one column.
 *
 * @cssstate empty - While there are no sizes to offer.
 */
@customElement('helix-headless-pagination-size')
export class HelixHeadlessPaginationSize extends HelixElement {
  /**
   * The size to start on when `value` is not set.
   */
  @property({ attribute: 'default-value', type: Number })
  defaultValue = 0

  /**
   * The label beside the control.
   */
  @property()
  label = 'Per page'

  /**
   * Locale for the numbers.
   *
   * Absent uses the runtime's own.
   */
  @property()
  locale = ''

  /**
   * The sizes offered, comma separated.
   *
   * A string rather than an array, so the whole control is expressible in
   * markup and survives a server render. Anything that is not a positive number
   * is dropped rather than rendered as an option that cannot mean anything.
   */
  @property()
  sizes = '10,25,50,100'

  /**
   * The current page size.
   *
   * Reading gives the real one; writing declares it the consumer's, and
   * `default-value` seeds one this element owns. Same accessor pair as
   * `Pagination.page` and the calendar's `month`.
   */
  @property({ type: Number })
  get value(): number {
    return this.valueState ?? this.defaultValue
  }

  set value(next: number) {
    const previous = this.value
    this.valueState = next
    this.requestUpdate('value', previous)
  }

  /** The size, whoever set it, and `undefined` until somebody has. */
  private valueState: number | undefined = undefined

  /** Held across every component asking for the same locale. */
  private get numbers(): (value: number) => string {
    return formatNumbers(this.locale)
  }

  /** The sizes, parsed once, with anything that is not a size dropped. */
  private get options(): number[] {
    return this.sizes
      .split(',')
      .map((one) => Number.parseInt(one.trim(), 10))
      .filter((one) => Number.isFinite(one) && one > 0)
  }

  /** The one in force, which is the first offered where nothing named one. */
  private get current(): number {
    const options = this.options
    return options.includes(this.value) ? this.value : (options[0] ?? 0)
  }

  private readonly handleChange = (event: Event): void => {
    /* Stopped, then re-announced under this element's own name. `Select`'s
       `helix-before-change` bubbles and is composed, so left alone it would cross this
       shadow boundary and be retargeted to look like this element's: a consumer
       would get two events per change, one of them carrying `Select`'s idea of
       what a name and a value are. */
    event.stopPropagation()
    const next = Number.parseInt((event as CustomEvent<{ value: string }>).detail?.value ?? '', 10)
    if (!Number.isFinite(next) || next === this.current) {
      return
    }
    requestChange({
      apply: (size) => {
        const previous = this.value
        this.valueState = size
        this.requestUpdate('value', previous)
      },
      event: (size) => new HelixBeforeChangeEvent({ value: String(size) }),
      host: this,
      next,
    })
    /* Put back where the consumer refused it or owns it, because the control has
       already moved: a select changes itself and then tells you, which is the
       one case `requestChange` cannot announce ahead of. Lit skips a
       property binding whose value has not changed, so a refusal leaves the
       select holding the reader's choice and nothing else would put it back.
       Deferred, so the read happens after the render a successful change asked
       for rather than racing it. */
    this.updateComplete.then(() => {
      const control = this.renderRoot?.querySelector<HTMLElement & { value: string }>(
        '[part="control"]',
      )
      if (control && control.value !== String(this.current)) {
        control.value = String(this.current)
      }
    })
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    /* Through `toggleState`, like `Pagination`'s: an engine without
       `CustomStateSet` gets an empty select rather than no element. */
    this.toggleState('empty', this.options.length === 0)
  }

  /**
   * The control itself, which is the whole of this part, behind a seam the styled tier can move.
   *
   * A method rather than a fragment inline, so a tier above can render its own,
   * wrap this one, pass it a property the base does not know about, or leave it
   * out, without reimplementing the whole template to do any of them.
   *
   * **The tags are interpolated, so each tier renders its own.** Writing
   * `<helix-select>` out would make this tier compose an element it does not
   * ship and cannot test against, there being no `helix-select` here. `tier`
   * resolves the name instead, and the styled subclass changes it in one line.
   */
  protected renderSelect(): TemplateResult {
    const select = this.tag('select')
    const option = this.tag('option')
    return html`<${select}
      part="control"
      exportparts="feedback: control-feedback, hint: control-hint, indicator: control-indicator,
        label: control-label, listbox: control-listbox, listbox-empty: control-listbox-empty,
        listbox-feedback: control-listbox-feedback, listbox-filter-icon: control-listbox-filter-icon,
        listbox-filter-mark: control-listbox-filter-mark, listbox-hint: control-listbox-hint,
        listbox-items: control-listbox-items, listbox-label: control-listbox-label,
        listbox-live: control-listbox-live, listbox-loading: control-listbox-loading, listbox-search: control-listbox-search,
        listbox-search-field: control-listbox-search-field, surface: control-surface,
        trigger: control-trigger, value: control-value"
      label=${this.label}
      .value=${String(this.current)}
      @helix-before-change=${this.handleChange}
    >
      ${this.options.map(
        (size) =>
          html`<${option}
            part="option"
            exportparts="description: option-description, item: option-item,
              item-active: option-item-active, item-selected: option-item-selected,
              label: option-label, text: option-text"
            value=${String(size)}
            >${this.numbers(size)}</${option}
          >`,
      )}
    </${select}>`
  }

  protected override render(): TemplateResult | typeof nothing {
    if (this.options.length === 0) {
      return nothing
    }
    /* `Select` renders the label and gives the trigger the id it points at, so
       the association is the platform's and is already covered by that
       component's own specs. Nothing here reconstructs it. */
    return html`${this.renderSelect()}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-pagination-size': HelixHeadlessPaginationSize
  }
}
