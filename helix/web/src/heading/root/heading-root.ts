import { customElement, HelixElement } from '@helix-io/core'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { literal, type StaticValue, html as staticHtml } from 'lit/static-html.js'
import { styles } from './heading-root.css.js'

/** Real heading tags, indexed by level. Static values, so they can be a tag. */
const TAGS: Record<number, StaticValue> = {
  1: literal`h1`,
  2: literal`h2`,
  3: literal`h3`,
  4: literal`h4`,
  5: literal`h5`,
  6: literal`h6`,
}

/**
 * @summary A heading at a given level.
 *
 * @description
 * Renders a real `<h1>` through `<h6>` using Lit's static templates, never a
 * `<div role="heading">`. A real heading is what a screen reader's heading
 * navigation lists, and emulation has to be kept correct by hand forever.
 *
 * **`level` and `size` are separate on purpose, and that is the risk.** Level
 * is document structure and belongs to the outline; size is appearance. They
 * default to matching, so a heading is correct by doing nothing, and `size`
 * exists for the case where a section's second heading has to look smaller
 * without lying about the outline. Reach for it rarely: two headings at the
 * same level looking different is usually a sign the outline is wrong.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Title, H1, H2
 * @documentation https://helix.fusion.dev/components/heading
 *
 * @slot - The heading text.
 *
 * @csspart heading - The heading element.
 */
@customElement('helix-heading')
export class HelixHeading extends HelixElement {
  /** Outline level, one through six. */
  @property({ reflect: true, type: Number })
  level: 1 | 2 | 3 | 4 | 5 | 6 = 2

  /** Visual size, defaulting to the one that matches `level`. */
  @property({ reflect: true })
  size: '' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' = ''

  /** Colour role for the heading. */
  @property({ reflect: true })
  tone: 'default' | 'muted' | 'subtle' = 'default'

  protected override render(): unknown {
    const tag = TAGS[this.level] ?? TAGS[2]
    return staticHtml`<${tag} part="heading"><slot></slot></${tag}>`
  }

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-heading': HelixHeading
  }
}
