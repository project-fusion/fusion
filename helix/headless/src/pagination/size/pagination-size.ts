import {
  customElement,
  HelixChangeEvent,
  HelixElement,
  requestControlledChange,
} from '@helix-io/core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
/* Side-effect imports, because this renders `<helix-select>` and
   `<helix-option>` in its own shadow root and a custom element registers on
   import. Same arrangement `Select` uses for the listbox it renders, down to
   naming the public tags rather than the base ones: a consumer on the styled
   tier gets the styled select, and one on the headless tier has to bring a
   select of their own under that name. */
import '../../option/index.js'
import '../../select/index.js'

/**
 * @summary Chooses how many items a page holds.
 *
 * @description
 * Its own element beside `Pagination` rather than a slot inside it, for the
 * reason `Pagination.Summary` is: a footer's direction and order are the
 * consumer's, and a control that can only sit at one end of one row has taken
 * that decision for them.
 *
 * **`Select`, not a native `<select>`.** It was native first, on the argument
 * that the platform's own menu is a wheel on a phone and the widget a
 * screen-reader user already knows. What that argument leaves out is that the
 * library then has two dropdowns that are identical closed and different open,
 * and a reader meets both in the same footer as a table's filters. Consistency
 * is the whole product here, and it wins.
 *
 * What it takes back with it: the caret is `Select`'s again rather than a color
 * literal baked into a data URI, because a background image cannot read
 * `currentColor`, and the label is a real `<label for>` against the trigger's
 * own id, which `Select` already renders and already tests.
 *
 * **The label sits on the row, not above it.** Every other field in the library
 * stacks its label because it stands in a column of fields; this one stands in a
 * footer beside a run of page numbers, and a two-line control there makes the
 * whole row two lines tall. `Select`'s host is a column, and an outer-tree rule
 * beats a `:host` rule, so turning it into a row needs no property on `Select`
 * and nothing written into the consumer's markup.
 *
 * **An empty `sizes` renders nothing.** A chooser with nothing to choose from
 * is a control a reader can operate and cannot use, which is worse than an
 * absence. Falling back to the built-in list was the other answer and it is a
 * component overruling a consumer who said "none". Same rule as `Pagination`
 * over a single page, and reported the same way, through
 * `ElementInternals.states` rather than an attribute the server never wrote.
 *
 * `value` is the controlled property and `default-value` seeds one this owns,
 * the same contract every other stateful element here carries. Changing it
 * announces `helix-change`; what a consumer does with that is re-query and move
 * back to page one, which is theirs to decide because only they know whether
 * the reader's position should survive it.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Page size, Rows per page
 * @documentation https://helix.fusion.dev/components/pagination
 *
 * @csspart control - The select.
 * @csspart label - The words beside the number, forwarded from the select.
 * @csspart trigger - The closed control, forwarded from the select.
 * @csspart value - The chosen size inside the trigger, forwarded from the select.
 *
 * @event {HelixChangeEvent} helix-change - Fired before the size changes, and cancelable. The only way to refuse one.
 */
@customElement('helix-base-pagination-size')
export class HelixBasePaginationSize extends HelixElement {
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
   * The size in force.
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

  /** Size to start on, where nothing declared one. */
  @property({ attribute: 'default-value', type: Number })
  defaultValue = 0

  /** The words beside the control. */
  @property()
  label = 'Per page'

  /** Locale for the numbers. Absent uses the runtime's own. */
  @property()
  locale = ''

  /** The size, whoever set it, and `undefined` until somebody has. */
  private valueState: number | undefined = undefined

  /** Whether the consumer owns it, decided once and then fixed. */
  private valueMode: boolean | undefined = undefined

  private get valueIsControlled(): boolean {
    return this.valueMode === true
  }

  /** Built once per locale. Same reasoning as the calendar's date formatters. */
  private cachedFormat: { format: Intl.NumberFormat; locale: string } | undefined

  private get numbers(): (value: number) => string {
    if (this.cachedFormat?.locale !== this.locale) {
      this.cachedFormat = {
        format: new Intl.NumberFormat(this.locale || undefined),
        locale: this.locale,
      }
    }
    const { format } = this.cachedFormat
    return (value) => format.format(value)
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
       `helix-change` bubbles and is composed, so left alone it would cross this
       shadow boundary and be retargeted to look like this element's: a consumer
       would get two events per change, one of them carrying `Select`'s idea of
       what a name and a value are. */
    event.stopPropagation()
    const next = Number.parseInt((event as CustomEvent<{ value: string }>).detail?.value ?? '', 10)
    if (!Number.isFinite(next) || next === this.current) {
      return
    }
    requestControlledChange({
      apply: (size) => {
        if (this.valueIsControlled) {
          return
        }
        const previous = this.value
        this.valueState = size
        this.requestUpdate('value', previous)
      },
      controlled: this.valueIsControlled,
      event: (size) => new HelixChangeEvent({ name: 'page-size', value: String(size) }),
      host: this,
      label: 'value',
      next,
      read: () => this.current,
    })
    /* Put back where the consumer refused it or owns it, because the control has
       already moved: a select changes itself and then tells you, which is the
       one case `requestControlledChange` cannot announce ahead of. Lit skips a
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
    // Only the first time, before anything reads it. See `MixinControllerOpen`.
    if (this.valueMode === undefined) {
      this.valueMode = this.valueState !== undefined
    }
    /* Feature-tested, like `Pagination`'s: an engine without `CustomStateSet`
       gets an empty select rather than no element, which is the behavior this
       had before. */
    if ('states' in this.internals) {
      this.internals.states[this.options.length === 0 ? 'add' : 'delete']('empty')
    }
  }

  protected override render(): TemplateResult | typeof nothing {
    if (this.options.length === 0) {
      return nothing
    }
    /* `Select` renders the label and gives the trigger the id it points at, so
       the association is the platform's and is already covered by that
       component's own specs. Nothing here reconstructs it. */
    return html`<helix-select
      part="control"
      exportparts="label, trigger, value"
      label=${this.label}
      .value=${String(this.current)}
      @helix-change=${this.handleChange}
    >
      ${this.options.map(
        (size) => html`<helix-option value=${String(size)}>${this.numbers(size)}</helix-option>`,
      )}
    </helix-select>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-pagination-size': HelixBasePaginationSize
  }
}
