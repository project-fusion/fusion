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
 * `max` caps the number. Past it the indicator reads `9+` rather than growing
 * to fit, because a corner mark that widens with its value pushes the layout
 * around for the one case nobody planned for.
 *
 * **A dot needs a label.** Without one it is a coloured circle that announces
 * nothing, which tells a sighted reader there is something new and tells
 * everyone else there is not. The label is required in that form and the
 * indicator is hidden from assistive technology when a number already says it.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Count, Indicator, Pip
 * @documentation https://helix.fusion.dev/components/badge
 *
 * @slot - The element being decorated.
 *
 * @csspart indicator - The count or dot.
 */
@customElement('helix-base-badge')
export class HelixBaseBadge extends HelixElement {
  /** The count or short text to show. */
  @property()
  value = ''

  /** Cap for a numeric value. Past it the indicator reads `{max}+`. */
  @property({ type: Number })
  max?: number

  /** Shows a presence mark with no text. `value` is ignored. */
  @property({ reflect: true, type: Boolean })
  dot = false

  /** Accessible name. Required for a dot, which has no text to read. */
  @property()
  label = ''

  /** What the indicator reads, once the cap has been applied. */
  private get text(): string {
    if (this.dot) {
      return ''
    }
    const count = Number(this.value)
    if (this.max !== undefined && Number.isFinite(count) && count > this.max) {
      return `${this.max}+`
    }
    return this.value
  }

  protected override render(): TemplateResult | typeof nothing {
    const text = this.text
    if (!this.dot && text === '') {
      // Nothing to say, so nothing is rendered: an empty indicator is a mark
      // that means "zero of something", which is not what zero looks like.
      return html`<slot></slot>`
    }

    return html`<slot></slot>
      <span
        part="indicator"
        role=${this.label ? 'status' : nothing}
        aria-label=${this.label || nothing}
        aria-hidden=${this.label ? nothing : 'true'}
        >${text}</span
      >`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-badge': HelixBaseBadge
  }
}
