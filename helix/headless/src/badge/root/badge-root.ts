import { customElement, HelixElement } from '@fusion.dev/helix-core'
import { html, nothing, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary A count or a dot pinned to the corner of another element.
 *
 * @description
 * Badge wraps the element it decorates and pins an indicator to its corner, so
 * the wrapped element keeps its place in the layout.
 *
 * What the indicator shows depends on `value`:
 *
 * - A `value` of zero shows no indicator.
 * - No `value` shows a dot.
 * - Any other value shows the value. Above `max`, the indicator shows `{max}+`,
 *   so its width stays the same as the count grows.
 *
 * A count is announced from its own text, and `label` replaces that with a
 * fuller name, such as `4 unread`. A dot needs a `label`. Without one, the dot
 * is a colored circle that screen readers do not announce.
 *
 * @since 0.1.0
 * @status stable
 * @category markers
 * @aliases Count, Indicator, Pip
 * @documentation https://fusion.dev/helix/components/badge
 *
 * @slot - The element being decorated.
 *
 * @csspart indicator - The count, or the dot when there is no value.
 */
@customElement('helix-headless-badge')
export class HelixHeadlessBadge extends HelixElement {
  /**
   * The badge's name, read by screen readers.
   *
   * Required for a dot, which has no text to read.
   */
  @property()
  label = ''

  /**
   * The largest number the badge shows.
   *
   * Past it the indicator reads `{max}+`.
   */
  @property({ type: Number })
  max?: number

  /**
   * The count or short text to show.
   *
   * Absent shows a dot, zero shows nothing.
   *
   * **A string, and a number is taken anyway.** What this shows is usually a
   * count, so `value={unread}` is the first thing a React consumer writes, and
   * a property assignment does not go through the attribute converter that
   * would have made it a string. Read raw it went straight into
   * `this.value.trim()`, which threw inside `render` and left the mark showing
   * whatever it had last: measured, a badge set to the number 2 stayed an 8px
   * dot with no digit in it, and the console carried
   * `TypeError: this.value.trim is not a function`. A component whose whole job
   * is showing a count must not lose the count for being handed one.
   */
  @property()
  value: number | string = ''

  /** The value as text, whatever it was set to. */
  private get given(): string {
    return String(this.value ?? '')
  }

  /** Whether the value counts nothing, in which case there is no mark. */
  private get blank(): boolean {
    return this.given.trim() !== '' && Number(this.given) === 0
  }

  /** What the indicator reads, once the cap has been applied. */
  private get text(): string {
    const count = Number(this.given)
    if (this.max !== undefined && Number.isFinite(count) && count > this.max) {
      return `${this.max}+`
    }
    return this.given
  }

  protected override render(): TemplateResult {
    const blank = this.blank
    const text = this.text
    /* A mark with text is content and is announced; a dot is decoration and is
       not.
     *
     * It must not ask for a `label` as well, or a badge showing a count and no
     * label is `aria-hidden` and the number it exists to show reaches nobody
     * using a screen reader. The number is its own name where none is given,
     * which is why `aria-label` is conditional on the label rather than on this:
     * a `4` announces as "4" from the text, and `label="4 unread"` says the
     * better thing.
     *
     * A dot with no label still says nothing, which is the deliberate half: a
     * dot means "something here" and cannot say what, so naming it is the
     * consumer's to do and silence is better than "badge". */
    const announced = !blank && (text !== '' || this.label !== '')

    // The indicator holds the text and nothing else, so an absent value leaves
    // it empty and `[part="indicator"]:empty` is what draws the dot. Lit's
    // marker comments do not affect `:empty`, but a whitespace text node does,
    // which is why the tags close the way they do.
    //
    // **A status from the start, whatever it shows.** It gained the role only
    // once there was something to say, so the first count arrived in a region
    // appearing with it and a screen reader could miss it. A blank mark keeps
    // its text to fade out with, hidden, so clearing a count says nothing, and
    // a dot with no label is an empty region, which says nothing either.
    //
    // It stays mounted when there is nothing to show, so the styled tier can
    // transition it out rather than having it vanish between frames. Both
    // markers are on the shadow content, not the host, so they cost no
    // attribute a consumer's server markup would have to match.
    //
    // `single` is what lets a one-character mark be a circle. Whether the text
    // fits inside the square is a fact about the string, and CSS cannot count
    // characters.
    return html`<slot></slot>
      <span
        part="indicator"
        data-blank=${blank ? '' : nothing}
        data-single=${text.length <= 1 ? '' : nothing}
        role="status"
        aria-label=${this.label !== '' && announced ? this.label : nothing}
        >${blank ? html`<span aria-hidden="true">${text}</span>` : text}</span
      >`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-badge': HelixHeadlessBadge
  }
}
