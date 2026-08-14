import { customElement, HelixElement } from '@helix-io/core'
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
 * @status experimental
 * @aliases Count, Indicator, Pip
 * @documentation https://helix.fusion.dev/components/badge
 *
 * @slot - The element being decorated.
 *
 * @csspart indicator - The count, or the dot when there is no value.
 */
@customElement('helix-base-badge')
export class HelixBaseBadge extends HelixElement {
  /** The count or short text to show. Absent shows a dot, zero shows nothing. */
  @property()
  value = ''

  /** Cap for a numeric value. Past it the indicator reads `{max}+`. */
  @property({ type: Number })
  max?: number

  /** Accessible name. Required for a dot, which has no text to read. */
  @property()
  label = ''

  /** Whether the value counts nothing, in which case there is no mark. */
  private get blank(): boolean {
    return this.value.trim() !== '' && Number(this.value) === 0
  }

  /** What the indicator reads, once the cap has been applied. */
  private get text(): string {
    const count = Number(this.value)
    if (this.max !== undefined && Number.isFinite(count) && count > this.max) {
      return `${this.max}+`
    }
    return this.value
  }

  protected override render(): TemplateResult {
    const blank = this.blank
    const text = this.text
    const announced = this.label !== '' && !blank

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
        aria-label=${announced ? this.label : nothing}
        aria-hidden=${announced ? nothing : 'true'}
        >${text}</span
      >`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-badge': HelixBaseBadge
  }
}
