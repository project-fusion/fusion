import { customElement, HelixElement } from '@helix-io/core'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { literal, type StaticValue, html as staticHtml } from 'lit/static-html.js'
import { styles } from './text-root.css.js'

/** Tags this can render, indexed by level. Static values, so they can be a tag. */
const TAGS: Record<number, StaticValue> = {
  1: literal`h1`,
  2: literal`h2`,
  3: literal`h3`,
  4: literal`h4`,
  5: literal`h5`,
  6: literal`h6`,
}

/**
 * @summary Text at a chosen size, tone, and weight, optionally a heading.
 *
 * @description
 * One component rather than two. A separate `Heading` differed from this only
 * in which tag it rendered and what its size defaulted to, and both are
 * expressible as a property. Two components meant two places to add a tone and
 * two contracts to keep aligned.
 *
 * `level` renders a real `<h1>` through `<h6>` and nothing else does. Without
 * it this is a `<span>`, so text is never accidentally structural: a heading is
 * something you ask for.
 *
 * Size follows `level` unless overridden, so a heading is correct by doing
 * nothing. Setting both is the deliberate exception, for the case where a
 * section's second heading must look smaller without lying about the outline.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Paragraph, Copy, Label, Caption, Heading, Title
 * @documentation https://helix.fusion.dev/components/text
 *
 * @slot - The text.
 *
 * @csspart text - The text element.
 */
@customElement('helix-text')
export class HelixText extends HelixElement {
  /** Outline level. Renders a real heading tag; omit for ordinary text. */
  @property({ reflect: true, type: Number })
  level: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 0

  /** Size on the type scale. Defaults to the one matching `level`. */
  @property({ reflect: true })
  size: '' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' = ''

  /** Colour role for the text. */
  @property({ reflect: true })
  tone: 'default' | 'muted' | 'subtle' | 'primary' | 'danger' = 'default'

  /** Weight on the weight scale. Headings default to semibold. */
  @property({ reflect: true })
  weight: '' | 'regular' | 'medium' | 'semibold' = ''

  /** Renders as a block, for a paragraph rather than an inline run. */
  @property({ reflect: true, type: Boolean })
  block = false

  /** Uses the monospace family, for code and identifiers. */
  @property({ reflect: true, type: Boolean })
  mono = false

  protected override render(): unknown {
    const tag = TAGS[this.level] ?? literal`span`
    return staticHtml`<${tag} part="text"><slot></slot></${tag}>`
  }

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-text': HelixText
  }
}
