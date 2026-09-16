import { customElement, HelixElement } from '@fusion.dev/helix-core'
import { html, nothing, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary Attaches a count or a presence mark to another element.
 *
 * @description
 * Wraps whatever it decorates and pins the indicator to its corner, so the
 * thing being counted stays the thing in the layout: a badge is an annotation,
 * not a container that happens to hold an icon.
 *
 * The indicator says how many, and none is none. A `value` that reads as zero
 * shows no mark at all, an absent one shows a bare dot, and any other value
 * shows the value. `max` caps the top: past it the indicator reads `{max}+`
 * rather than growing to fit, since a corner mark that widens with its value
 * pushes the layout around.
 *
 * **A dot needs a label.** Without one it is a colored circle that announces
 * nothing, which tells a sighted reader there is something new and tells
 * everyone else there is not. The label is required in that form, and the
 * indicator is hidden from assistive technology when a number already says it.
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
   * Accessible name.
   *
   * Required for a dot, which has no text to read.
   */
  @property()
  label = ''

  /**
   * Cap for a numeric value.
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
        role=${announced ? 'status' : nothing}
        aria-label=${this.label !== '' && announced ? this.label : nothing}
        aria-hidden=${announced ? nothing : 'true'}
        >${text}</span
      >`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-badge': HelixHeadlessBadge
  }
}
