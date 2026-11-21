import {
  customElement,
  formatNumber,
  formatNumberParts,
  HelixElement,
  SPOKEN_RULE,
  wordsLocale,
} from '@fusion.dev/helix-core'
import { type CSSResultGroup, html, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { repeat } from 'lit/directives/repeat.js'
import { styles } from './sliding-number-root.css.js'

/** The ten digits, as each column of the number holds them. */
const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'] as const

/**
 * @summary A number whose digits roll to a new value, each in its own column.
 *
 * @description
 * Set `value`, and each digit that changes rolls up or down to its new figure,
 * as the wheels of a counter turn, while the digits that stay hold still. The
 * number is written in the page's locale, with `format-options` for a
 * currency, a percentage, or a compact `1.2K`.
 *
 * **Each column keeps its place from the end**, so the units stay the units
 * when the number gains a digit, and a column that arrives shows its figure at
 * once. The digits are tabular, so a column is as wide whatever it shows.
 *
 * **A screen reader reads the number once, as written**, and never the
 * columns. Where the reader asked for less movement, a digit changes in place.
 *
 * Where `Stat` counts its figure through every number between, this turns
 * only the digits that change, which reads at a glance for a figure that
 * changes often, such as a live count.
 *
 * A single tier, as `Marquee` is: the roll is the whole of the component.
 *
 * @since 0.241.0
 * @status experimental
 * @category data
 * @aliases Odometer, Rolling number, Animated number, Ticker digits
 * @use A number that changes while you watch, such as a live count of sales.
 * @instead stat - A measurement with a label that names it.
 * @instead rotating-text - A word in a sentence that turns through others.
 * @instead marquee - A row of content that scrolls round by itself, such as a band of logos.
 * @anatomy value
 * @anatomy digit
 * @anatomy character?
 * @documentation https://fusion.dev/design/components/sliding-number
 *
 * @csspart character - A sign, separator, or symbol in the number, which holds still.
 * @csspart digit - One digit's column, showing one figure at a time.
 * @csspart strip - The figures 0 to 9 down a column, which rolls.
 * @csspart value - The drawn number, hidden from screen readers.
 *
 * @cssproperty --sliding-number-duration - How long a digit takes to roll. Defaults to `--helix-duration-slow`.
 * @cssproperty --sliding-number-easing - The curve a digit rolls along. Defaults to `--helix-easing-emphasized`, which passes the figure a little and settles back.
 */
@customElement('helix-sliding-number')
export class HelixSlidingNumber extends HelixElement {
  protected static override markRules = [SPOKEN_RULE]

  static override styles: CSSResultGroup = styles

  /**
   * The `Intl.NumberFormat` options `value` is written with, such as
   * `{"style":"currency","currency":"EUR"}`.
   */
  @property({ attribute: 'format-options', type: Object })
  formatOptions?: Intl.NumberFormatOptions

  /** The number shown. Nothing is drawn where it is not a number. */
  @property({ type: Number })
  value?: number

  protected override render(): TemplateResult {
    const value = this.value
    if (value === undefined || !Number.isFinite(value)) {
      return html``
    }
    const locale = wordsLocale(this)
    const characters = formatNumberParts(value, locale, this.formatOptions).flatMap((piece) =>
      [...piece.value].map((character) => ({
        character,
        figure:
          piece.type === 'integer' || piece.type === 'fraction'
            ? DIGITS.indexOf(character as (typeof DIGITS)[number])
            : -1,
      })),
    )
    return html`<span part="value" aria-hidden="true"
        >${repeat(
          characters,
          (_, index) => characters.length - index,
          ({ character, figure }) =>
            figure === -1
              ? html`<span part="character">${character}</span>`
              : html`<span part="digit" style="--_figure: ${figure}"
                  ><span part="strip"
                    >${DIGITS.map((digit) => html`<span>${digit}</span>`)}</span
                  ></span
                >`,
        )}</span
      ><span data-spoken>${formatNumber(value, locale, this.formatOptions)}</span>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-sliding-number': HelixSlidingNumber
  }
}
