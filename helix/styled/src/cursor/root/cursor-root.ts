import { customElement, HelixElement, numberConverter } from '@fusion.dev/helix-core'
import { type CSSResultGroup, html, nothing, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './cursor-root.css.js'

/** How many colors the series palette holds. */
const SERIES = 20

/**
 * @summary Another person's pointer on a shared surface, with their name beside it.
 *
 * @description
 * The pointer glides from each place to the next as `x` and `y` change, so
 * updates that arrive a few times a second read as a hand moving.
 *
 * **Each person in a color of their own** from the series palette, by
 * `series`.
 *
 * **Nothing to a screen reader, and nothing to the pointer.** Where another
 * person is matters to the eye of someone working beside them; a page that
 * says who is present says so once, such as in an `Avatar` group. Where the
 * reader asked for less movement, the pointer moves to each place at once.
 *
 * A single tier, as `Marquee` is: the pointer is the whole of the component.
 *
 * @since 0.241.0
 * @status experimental
 * @category content
 * @aliases Presence cursor, Multiplayer cursor, Collaborator pointer, Live cursor
 * @use Where another person points, on a board or a document you edit together.
 * @instead avatar - Who is present, shown once for the whole surface.
 * @instead spotlight - A light under your own pointer as it moves over a card.
 * @anatomy arrow
 * @anatomy label
 * @practice Put one Cursor for each person in a positioned box, and set `x` and `y` in pixels from its top left. - The pointer is placed as a collaboration service reports it.
 * @practice Draw a person's other marks, such as a selection, in the color their `series` names. - Their pointer and their marks then read as one person's.
 * @documentation https://fusion.dev/design/components/cursor
 *
 * @csspart arrow - The pointer's arrow.
 * @csspart label - The person's name, in their color, beside the arrow.
 * @csspart pointer - The arrow and the name together, which moves to each place.
 *
 * @cssproperty --cursor-color - The person's color. Defaults to the series color `series` names, or `--helix-color-primary` without one.
 * @cssproperty --cursor-duration - How long the pointer takes to reach a new place. Defaults to `--helix-duration-normal`.
 * @cssproperty --cursor-on-color - The color drawn on the person's: the name's words and the edge of the arrow. Defaults to `--helix-color-background`, which stands clear of a series color in either mode.
 */
@customElement('helix-cursor')
export class HelixCursor extends HelixElement {
  static override styles: CSSResultGroup = styles

  /** The person's name, drawn beside the pointer. No label where it is empty. */
  @property()
  name = ''

  /** Which series color the person takes, from 1 to 20. */
  @property({ converter: numberConverter('series', 0) })
  series = 0

  /** How far the pointer is from the box's left edge, in pixels. */
  @property({ converter: numberConverter('x', 0) })
  x = 0

  /** How far the pointer is from the box's top edge, in pixels. */
  @property({ converter: numberConverter('y', 0) })
  y = 0

  protected override render(): TemplateResult {
    const series =
      this.series >= 1
        ? `--_cursor-series: var(--helix-color-series-${((Math.round(this.series) - 1) % SERIES) + 1});`
        : ''
    return html`<div
      part="pointer"
      aria-hidden="true"
      style="${series}--_cursor-x: ${this.x}px; --_cursor-y: ${this.y}px"
    >
      <svg part="arrow" viewBox="0 0 16 16"><path d="M2 1.5 14 7.2 8.6 8.6 6.6 14Z"></path></svg>
      ${this.name ? html`<span part="label">${this.name}</span>` : nothing}
    </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-cursor': HelixCursor
  }
}
