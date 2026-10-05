import { customElement, HelixElement } from '@fusion.dev/helix-core'
import { arrowDown, arrowUp, minus } from '@fusion.dev/helix-icons'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'

/**
 * The three ways a measurement can have moved, how each is drawn, and the
 * property that holds its word.
 */
const DIRECTIONS = {
  down: { icon: arrowDown, word: 'downLabel' },
  neutral: { icon: minus, word: 'unchangedLabel' },
  up: { icon: arrowUp, word: 'upLabel' },
} as const

type Direction = keyof typeof DIRECTIONS

/**
 * Reads the movement, treating an absent or unrecognised one as neutral.
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
 * A trend has three parts: a `movement` of up, down, or neutral, the metric
 * that moved, and a label for the period it moved over. The arrow shows the
 * movement and its color shows whether the change is good. Movement and
 * judgment are separate properties because they are separate facts.
 *
 * `good` is unset by default, so a trend with no judgment is gray. For churn,
 * latency, error rate, cost, and bounce rate, up is bad. Set the metric's
 * polarity once with `good`, and the component picks the color from the
 * movement. The judgment is also a custom state, `better` or `worse`, for a
 * sheet of your own.
 *
 * The movement is also written as a word, so a screen reader reads it. The
 * styled tier hides `part="direction"` visually and keeps it in the
 * accessibility tree. The words are properties, `up-label` through
 * `worse-label`, so a page in another language can set its own. The arrow and
 * any glyph slotted in its place are hidden from screen readers.
 *
 * Slot one glyph per movement into `up-icon`, `down-icon` and `neutral-icon`,
 * and the trend shows the one that matches; a glyph in `icon` stands in for
 * all three. Inside a `Stat`, put the trend in the stat's `trend` slot so it is
 * read with the figure it qualifies.
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
 * @slot down-icon - Replaces the arrow while `movement` is `down`. Hidden from screen readers.
 * @slot icon - Replaces the arrow for every movement, such as with a glyph of your own set. Hidden from screen readers, since the movement is also a word.
 * @slot label - The period the metric moved over.
 * @slot neutral-icon - Replaces the bar while the trend has not moved. Hidden from screen readers.
 * @slot up-icon - Replaces the arrow while `movement` is `up`. Hidden from screen readers.
 *
 * @csspart direction - The movement as a word, for people who cannot see the arrow.
 * @csspart icon - The arrow.
 *
 * @cssstate better - The trend moved the way `good` names.
 * @cssstate worse - The trend moved against the way `good` names.
 */
@customElement('helix-headless-trend')
export class HelixHeadlessTrend extends HelixElement {
  /**
   * The word read out after the direction when the move is an improvement.
   */
  @property({ attribute: 'better-label' })
  betterLabel = 'better'

  /**
   * Which way the measurement moved, as `movement` says it.
   *
   * @deprecated Use `movement`. `direction` is a layout on `Stat` and `Flex`,
   * which are written beside a trend, so one word meant two things. Still read
   * when `movement` is absent.
   */
  @property({ reflect: true })
  direction?: 'down' | 'neutral' | 'up'

  /**
   * The word read out for a move down.
   */
  @property({ attribute: 'down-label' })
  downLabel = 'Down'

  /**
   * Which movement counts as an improvement for this metric.
   *
   * Absent states the movement without judging it, which is the honest default:
   * revenue up is good news and latency up is bad news, and only the consumer
   * knows which one this is. Set it once per metric and it holds while the
   * movement changes underneath.
   */
  @property({ reflect: true })
  good?: 'down' | 'up'

  /**
   * Which way the measurement moved.
   *
   * Absent is neutral, so a trend with nothing to report draws a bar rather
   * than picking a direction. Optional rather than defaulted: a reflecting
   * property with a default writes its attribute onto the host the moment the
   * element upgrades, and the host is markup the consumer rendered, which React
   * compares against what it rendered and reports as a hydration mismatch.
   */
  @property({ reflect: true })
  movement?: 'down' | 'neutral' | 'up'

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

  /**
   * The arrow for the direction, as the fallback of the `icon` slot.
   *
   * Slot fallback, so the page replaces it by slotting a glyph of its own and
   * a trend with none draws the arrow it always did; and a method, so the tier
   * above replaces it by overriding. The word beside it still says the
   * direction either way.
   */
  protected renderIcon(icon: { content: string; viewBox: string }): TemplateResult {
    /* Written out rather than through `drawIcon`, because this one needs a
       `part` and a part behind an interpolation is one the manifest cannot see:
       the helper's `part=${…}` binding took `[part="icon"]` out of the
       stylesheet's reach.

       **Hidden on the slot, so a glyph the page slots is hidden too.** The
       word beside it says the movement; a slotted `^` or an unlabeled image
       read as well put "^ Up, better 8%" into the name of a button holding
       the trend. */
    return html`<slot aria-hidden="true" name="icon"
      ><svg
        aria-hidden="true"
        data-glyph
        fill="currentColor"
        part="icon"
        viewBox=${icon.viewBox}
      >
        ${unsafeSVG(icon.content)}
      </svg></slot
    >`
  }

  /** The movement, read from `movement` and then from the old `direction`. */
  private get moved(): 'down' | 'neutral' | 'up' | undefined {
    return this.movement ?? this.direction
  }

  /** Better or worse, or neither when `good` is unset or nothing moved. */
  private get judged(): 'better' | 'worse' | undefined {
    const moved = this.moved
    if (!this.good || !moved || !(moved in DIRECTIONS) || moved === 'neutral') {
      return undefined
    }
    return this.good === moved ? 'better' : 'worse'
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    const judged = this.judged
    this.toggleState('better', judged === 'better')
    this.toggleState('worse', judged === 'worse')
  }

  protected override render(): TemplateResult {
    const moved = this.moved
    const direction = readDirection(moved)
    /* Silent on a neutral move, whatever `good` says. Neither better nor worse
       is a reading of "unchanged" that the word already carries. */
    const judged = this.judged
    const judgment = judged ? `, ${judged === 'better' ? this.betterLabel : this.worseLabel}` : ''

    /* A slot per movement around the one for all three, so a page slots three
       glyphs once and the trend shows the one that matches. Unmatched slots
       are not rendered, and what is slotted into them draws nothing. Written
       as three literal slots, since a name behind an interpolation is one the
       manifest cannot read. */
    const icon = this.renderIcon(direction.icon)
    const glyph =
      moved === 'up'
        ? html`<slot aria-hidden="true" name="up-icon">${icon}</slot>`
        : moved === 'down'
          ? html`<slot aria-hidden="true" name="down-icon">${icon}</slot>`
          : html`<slot aria-hidden="true" name="neutral-icon">${icon}</slot>`

    /* One interpolation rather than two, so the phrase is one text node.
       Lit SSR writes a `<!--lit-part-->` marker around every binding, and two
       bindings put a pair of comments between "Up" and ", worse" in the served
       markup, which a spec then cannot assert in one string. */
    return html`${glyph}
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
