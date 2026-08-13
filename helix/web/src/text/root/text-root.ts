import { customElement, HelixElement } from '@helix-io/core'
import type { CSSResultGroup, TemplateResult } from 'lit'
import { html } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './text-root.css.js'

/**
 * @summary Body text at a chosen size, tone, and weight.
 *
 * @description
 * For text that is not a heading. Headings have their own element, because a
 * heading carries an outline level and this does not; asking one element to do
 * both is what leads to a page whose outline is a styling accident.
 *
 * `block` makes it a paragraph rather than an inline run. It stays inline by
 * default because most text sits inside something else.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Paragraph, Copy, Label, Caption
 * @documentation https://helix.fusion.dev/components/text
 *
 * @slot - The text.
 *
 * @csspart text - The text container.
 */
@customElement('helix-text')
export class HelixText extends HelixElement {
  /** Size on the type scale. */
  @property({ reflect: true })
  size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 'md'

  /** Colour role for the text. */
  @property({ reflect: true })
  tone: 'default' | 'muted' | 'subtle' | 'primary' | 'danger' = 'default'

  /** Weight on the weight scale. */
  @property({ reflect: true })
  weight: 'regular' | 'medium' | 'semibold' = 'regular'

  /** Renders as a block, for a paragraph rather than an inline run. */
  @property({ reflect: true, type: Boolean })
  block = false

  /** Uses the monospace family, for code and identifiers. */
  @property({ reflect: true, type: Boolean })
  mono = false

  protected override render(): TemplateResult {
    return html`<span part="text"><slot></slot></span>`
  }

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-text': HelixText
  }
}
