import { customElement, HelixElement } from '@fusion.dev/helix-core'
import { arrowDown, arrowUp, minus } from '@fusion.dev/helix-icons'
import { html, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'

/**
 * The three directions a measurement can have moved, how each is drawn, and
 * the property that holds its word.
 */
const DIRECTIONS = {
  down: { icon: arrowDown, word: 'downLabel' },
  neutral: { icon: minus, word: 'unchangedLabel' },
  up: { icon: arrowUp, word: 'upLabel' },
} as const

type Direction = keyof typeof DIRECTIONS

/**
 * Reads the direction, treating an absent or unrecognised one as neutral.
 *
 * The cast is a lie the fallback catches: an attribute is a string and a
 * consumer can write anything into it, so an unrecognised word has to draw
 * something rather than fail to index and throw inside `render`.
 */
const readDirection = (value: string | undefined): (typeof DIRECTIONS)[Direction] =>
  DIRECTIONS[value as Direction] ?? DIRECTIONS.neutral

/**
 * @summary An indicator that shows which way a measurement moved, and whether the change is good.
 *
 * @description
 * A trend has three parts: a direction of up, down, or neutral, the metric that
 * moved, and a label for the period it moved over. The arrow shows the
 * direction and its color shows whether the change is good. Direction and
 * judgment are separate properties because they are separate facts.
 *
 * `good` is unset by default, so a trend with no judgment is gray. For churn,
 * latency, error rate, cost, and bounce rate, up is bad. Set the metric's
 * polarity once with `good`, and the component picks the color from the
 * direction.
 *
 * The direction is also written as a word, so a screen reader reads it. The
 * styled tier hides `part="direction"` visually and keeps it in the
 * accessibility tree. The words are properties, `up-label` through
 * `worse-label`, so a page in another language can set its own.
 *
 * The metric and the label are bare slots. An element that assigned its own
 * slot on connect would add an attribute to its host after upgrade, which the
 * React server markup did not have.
 *
 * @since 0.1.0
 * @status stable
 * @category charts
 * @aliases Delta, Change, Movement
 * @documentation https://fusion.dev/helix/components/trend
 *
 * @slot - The metric that moved.
 * @slot label - The period the metric moved over.
 *
 * @csspart direction - The direction as a word, for people who cannot see the arrow.
 * @csspart icon - The arrow.
 */
@customElement('helix-headless-trend')
export class HelixHeadlessTrend extends HelixElement {
  /**
   * The word read out after the direction when the move is an improvement.
   */
  @property({ attribute: 'better-label' })
  betterLabel = 'better'

  /**
   * Which way the measurement moved.
   *
   * Absent is neutral, so a trend with nothing to report draws a bar rather
   * than picking a direction. Optional rather than defaulted for the reason
   * `Stat.direction` is: a reflecting property with a default writes its
   * attribute onto the host the moment the element upgrades, and the host is
   * markup the consumer rendered, which React compares against what it rendered
   * and reports as a hydration mismatch.
   */
  @property({ reflect: true })
  direction?: 'down' | 'neutral' | 'up'

  /**
   * The word read out for a move down.
   */
  @property({ attribute: 'down-label' })
  downLabel = 'Down'

  /**
   * Which direction counts as an improvement for this metric.
   *
   * Absent states the movement without judging it, which is the honest default:
   * revenue up is good news and latency up is bad news, and only the consumer
   * knows which one this is. Set it once per metric and it holds while the
   * direction changes underneath.
   */
  @property({ reflect: true })
  good?: 'down' | 'up'

  /**
   * The word read out for no move, or for a direction that is not one of the
   * three.
   */
  @property({ attribute: 'unchanged-label' })
  unchangedLabel = 'Unchanged'

  /**
   * The word read out for a move up.
   */
  @property({ attribute: 'up-label' })
  upLabel = 'Up'

  /**
   * The word read out after the direction when the move is a setback.
   */
  @property({ attribute: 'worse-label' })
  worseLabel = 'worse'

  protected override render(): TemplateResult {
    const direction = readDirection(this.direction)
    /* Silent on a neutral move, whatever `good` says. Neither better nor worse
       is a reading of "unchanged" that the word already carries. */
    const judgment =
      this.good && this.direction && this.direction !== 'neutral'
        ? `, ${this.good === this.direction ? this.betterLabel : this.worseLabel}`
        : ''

    /* One interpolation rather than two, so the phrase is one text node.
       Lit SSR writes a `<!--lit-part-->` marker around every binding, and two
       bindings put a pair of comments between "Up" and ", worse" in the served
       markup, which a spec then cannot assert in one string. */
    /* Written out rather than through `drawIcon`, because this one needs a
       `part` and a part behind an interpolation is one the manifest cannot see:
       the helper's `part=${…}` binding took `[part="icon"]` out of the
       stylesheet's reach. */
    return html`<svg
        aria-hidden="true"
        data-glyph
        fill="currentColor"
        part="icon"
        viewBox=${direction.icon.viewBox}
      >
        ${unsafeSVG(direction.icon.content)}
      </svg>
      <span part="direction">${`${this[direction.word]}${judgment}`}</span>
      <slot></slot>
      <slot name="label"></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-trend': HelixHeadlessTrend
  }
}
