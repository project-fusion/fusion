import {
  closestInstance,
  customElement,
  HelixElement,
  numberConverter,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { HelixHeadlessMeter } from '../root/meter-root.js'

/**
 * @summary One share of a meter's whole, drawn as a slice of its bar.
 *
 * @description
 * A segment says how much of the range one part of the whole takes, such as the
 * tokens a model's context holds for its tools, against the tokens it holds for
 * the conversation. Write one for each part inside a `Meter`.
 *
 * **The meter's reading is the sum of its segments.** `value` on the meter is
 * ignored while it has any, so the two cannot disagree, and the bands, the ticks
 * and the reading answer to the total. A segment is drawn as wide as its `value`
 * is of the meter's range, so segments that add up to less than the range leave
 * the rest of the track empty, and ones that add up to more are cut at the end.
 *
 * **A meter's children are presentational to a screen reader**, so a segment
 * reaches no one that cannot see the bar. Say the breakdown in text beside it,
 * such as a list with the name and the amount of each part, which is also where a
 * reader finds the exact figures.
 *
 * A segment draws only in the bar. A meter in `ring` or `arc` draws its total.
 *
 * @since 0.1.0
 * @status experimental
 * @category feedback
 * @documentation https://fusion.dev/helix/components/meter
 *
 * @slot - Nothing. A segment draws its share and has no content.
 *
 * @csspart fill - The slice of the bar the segment takes.
 *
 * @cssproperty --meter-segment-value - How much of the range the segment takes, in the meter's own units.
 */
@customElement('helix-headless-meter-segment')
export class HelixHeadlessMeterSegment extends HelixElement {
  /**
   * What the segment is, such as "Tools", which names the slice when a pointer
   * rests on it.
   *
   * Not announced: see the note on a meter's children above.
   */
  @property()
  label = ''

  /**
   * What the segment means, as it does on a callout. Takes the tone's color in
   * place of the next color in the series.
   */
  @property({ reflect: true })
  tone?: 'accent' | 'danger' | 'info' | 'neutral' | 'primary' | 'success' | 'warning'

  /**
   * How much of the meter's range the segment takes, in the units of the meter's
   * `min` and `max`.
   *
   * A value that is not a number, or is below zero, draws nothing.
   */
  @property({ converter: numberConverter('value', 0) })
  value = 0

  /** The meter this is a segment of, which reads its sum. */
  private get meter(): HelixHeadlessMeter | null {
    return closestInstance(this, HelixHeadlessMeter)
  }

  /** The amount drawn: never below zero, and never a number that is not one. */
  private get amount(): number {
    return Number.isFinite(this.value) && this.value > 0 ? this.value : 0
  }

  /**
   * The meter sums its segments, so it hears when one arrives or changes. The
   * segment is the one that knows, so it reaches up by identity and the meter
   * does not have to ask. A meter's own update never updates a segment, so this
   * cannot loop.
   */
  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.meter?.requestUpdate()
  }

  /** A segment taken out leaves the meter with a smaller sum, which it reads again. */
  override disconnectedCallback(): void {
    const meter = this.meter
    super.disconnectedCallback()
    /* Out of the tree by now, so the meter is asked as the move settles. */
    queueMicrotask(() => meter?.requestUpdate())
  }

  protected override render(): TemplateResult {
    return html`<span
      part="fill"
      title=${this.label || nothing}
      style="--meter-segment-value: ${this.amount}"
    ></span>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-meter-segment': HelixHeadlessMeterSegment
  }
}
