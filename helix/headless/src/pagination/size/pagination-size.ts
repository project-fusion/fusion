import {
  customElement,
  HelixChangeEvent,
  HelixElement,
  requestControlledChange,
} from '@helix-io/core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary Chooses how many items a page holds.
 *
 * @description
 * Its own element beside `Pagination` rather than a slot inside it, for the
 * reason `Pagination.Summary` is: a footer's direction and order are the
 * consumer's, and a control that can only sit at one end of one row has taken
 * that decision for them.
 *
 * **A native `<select>`, which is a deliberate exception and worth the note.**
 * The library ships `Select` because a closed list needs a panel it can style,
 * and this is four numbers. The native control opens as the platform's own
 * menu, which on a phone is a wheel and under a screen reader is the widget the
 * reader already knows, and it needs no popover, no listbox and no second
 * element to register. The trigger wears the same frame as every other field, so
 * what differs from `Select` is only what happens while it is open, which for a
 * list of four numbers is the half that native does better.
 *
 * **The label sits on the row, not above it.** Every other field in the library
 * stacks its label because it stands in a column of fields; this one stands in a
 * footer beside a run of page numbers, and a two-line control there makes the
 * whole row two lines tall. It is a real `<label for>` against a real `<select>`
 * in one shadow root, so the association is the platform's rather than an ARIA
 * reconstruction of it.
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
 * @csspart label - The words naming the control.
 * @csspart control - The select itself.
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
    const next = Number.parseInt((event.target as HTMLSelectElement).value, 10)
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
    /* Put back where the consumer refused it or owns it, because the native
       control has already moved: a `<select>` changes itself and then tells you,
       which is the one case `requestControlledChange` cannot announce ahead of.
       Deferred, so the read happens after the render a successful change asked
       for rather than racing it. */
    this.updateComplete.then(() => {
      const control = this.renderRoot?.querySelector<HTMLSelectElement>('[part="control"]')
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
  }

  protected override render(): TemplateResult {
    /* A real `for` against a real `id`, both inside this shadow root. Ids are
       scoped to their root, so this collides with nothing in the document and
       needs none of the element-reference machinery a label outside a shadow
       boundary would. */
    return html`<label part="label" for="helix-pagination-size">${this.label}</label>
      <select
        part="control"
        id="helix-pagination-size"
        .value=${String(this.current)}
        @change=${this.handleChange}
      >
        ${this.options.map(
          (size) =>
            html`<option value=${size} ?selected=${size === this.current}>
              ${this.numbers(size)}
            </option>`,
        )}
      </select>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-pagination-size': HelixBasePaginationSize
  }
}
