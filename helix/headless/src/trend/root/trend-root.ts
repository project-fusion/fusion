import { customElement, HelixElement } from '@helix-io/core'
import { arrowDown, arrowUp, minus } from '@helix-io/icons'
import { html, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'

/** The three directions a measurement can have moved, and how each is drawn. */
const DIRECTIONS = {
  down: { icon: arrowDown, word: 'Down' },
  neutral: { icon: minus, word: 'Unchanged' },
  up: { icon: arrowUp, word: 'Up' },
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
 * @summary Which way a measurement moved, and whether that is good news.
 *
 * @description
 * Three parts: a direction that is up, down or neutral, the metric that moved,
 * and a label saying over what. The arrow carries the direction and its colour
 * carries the judgment, and the two are separate properties because they are
 * separate facts.
 *
 * **`good` is absent by default, so an unjudged trend is grey.** Every
 * dashboard convention says up is green, and for churn, latency, error rate,
 * cost and bounce rate that convention is a lie told in the most legible colour
 * on the page. A component that guesses is wrong roughly a third of the time
 * and silent about it; one that waits to be told is uninformative until it is,
 * which is the cheaper failure. State the metric's polarity once and the
 * component does the part that varies.
 *
 * The direction is also written as a word, because a coloured arrow says
 * nothing to a reader who is not looking at it. `part="direction"` is what the
 * styled tier clips out of sight and leaves in the accessibility tree.
 *
 * Both the metric and the label are bare slots. An element whose only job is to
 * assign itself a slot on connect gives its own host an attribute after
 * upgrade, which a React consumer's server markup never had.
 *
 * @since 0.1.0
 * @status experimental
 * @category content
 * @aliases Delta, Change, Movement
 * @documentation https://helix.fusion.dev/components/trend
 *
 * @slot - The metric that moved.
 * @slot label - What it moved over.
 *
 * @csspart direction - The direction as a word, for readers who are not looking.
 * @csspart icon - The arrow.
 */
@customElement('helix-base-trend')
export class HelixBaseTrend extends HelixElement {
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
   * Which direction is the improvement, for this metric.
   *
   * Absent states the movement without judging it, which is the honest default:
   * revenue up is good news and latency up is bad news, and only the consumer
   * knows which one this is. Set it once per metric and it holds while the
   * direction changes underneath.
   */
  @property({ reflect: true })
  good?: 'down' | 'up'

  protected override render(): TemplateResult {
    const direction = readDirection(this.direction)
    /* Silent on a neutral move, whatever `good` says. Neither better nor worse
       is a reading of "unchanged" that the word already carries. */
    const judgment =
      this.good && this.direction && this.direction !== 'neutral'
        ? this.good === this.direction
          ? ', better'
          : ', worse'
        : ''

    /* One interpolation rather than two, so the phrase is one text node.
       Lit SSR writes a `<!--lit-part-->` marker around every binding, and two
       bindings put a pair of comments between "Up" and ", worse" in the served
       markup. No screen reader is confused by adjacent text nodes, but the
       server output should read as the thing the DOM will hold, and a test
       against it should be able to say so in one string. */
    /* Written out rather than through `drawIcon`, because this one needs a
       `part` and a part behind an interpolation is one the manifest cannot see:
       the helper's `part=${…}` binding took `[part="icon"]` out of the
       stylesheet's reach and `check:selectors` said so. */
    return html`<svg
        aria-hidden="true"
        data-glyph
        fill="currentColor"
        part="icon"
        viewBox=${direction.icon.viewBox}
      >
        ${unsafeSVG(direction.icon.content)}
      </svg>
      <span part="direction">${`${direction.word}${judgment}`}</span>
      <slot></slot>
      <slot name="label"></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-trend': HelixBaseTrend
  }
}
