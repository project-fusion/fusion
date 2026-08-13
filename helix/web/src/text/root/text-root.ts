import { customElement, HelixElement } from '@helix-io/core'
import type { CSSResultGroup, PropertyValues } from 'lit'
import { property } from 'lit/decorators.js'
import { literal, type StaticValue, html as staticHtml } from 'lit/static-html.js'
import { styles } from './text-root.css.js'

/** Tags this may render. Static values, so they can be interpolated as a tag. */
const TAGS: Record<string, StaticValue> = {
  code: literal`code`,
  em: literal`em`,
  h1: literal`h1`,
  h2: literal`h2`,
  h3: literal`h3`,
  h4: literal`h4`,
  h5: literal`h5`,
  h6: literal`h6`,
  label: literal`label`,
  p: literal`p`,
  span: literal`span`,
  strong: literal`strong`,
}

/**
 * Appearance each element defaults to.
 *
 * The point of the pairing: `as="h2"` is already styled as a heading, so the
 * common case needs one property. `appearance` is then only ever set to break
 * the pairing deliberately, which is rare and visible when it happens.
 */
const DEFAULT_APPEARANCE: Record<string, string> = {
  code: 'code',
  h1: 'display',
  h2: 'heading',
  h3: 'subheading',
  h4: 'title',
  h5: 'body-strong',
  h6: 'body-strong',
  label: 'label',
  strong: 'body-strong',
}

/**
 * @summary Text: what element it is, and what it looks like.
 *
 * @description
 * Two properties, and they answer different questions. `as` is the element,
 * which decides the document outline and what a screen reader announces.
 * `appearance` is the treatment, which decides size, weight, leading, and
 * tracking together.
 *
 * They are separate because they genuinely come apart: a section's second
 * heading sometimes has to look smaller without lying about the outline, and a
 * `<p>` sometimes has to read as a caption. They default to matching, so the
 * common case is `as="h2"` and nothing else.
 *
 * **Size, weight, and leading are not properties.** Exposing them separately
 * offers a few hundred combinations of which a handful are right, and every
 * caller then picks one. An appearance is a decision the system already made:
 * the ramp is named, and a page built from it is consistent because there was
 * nothing else to choose.
 *
 * `tone` stays separate, because colour carries state rather than typography.
 * Folding it in would mean `caption-danger` and `label-primary` and the rest of
 * the cross product, which is the explosion `appearance` exists to prevent.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Paragraph, Copy, Label, Caption, Heading, Title
 * @documentation https://helix.fusion.dev/components/text
 *
 * @slot - The text.
 *
 * @csspart text - The rendered element.
 */
@customElement('helix-text')
export class HelixText extends HelixElement {
  /** Which element to render. Decides the outline and the semantics. */
  @property({ reflect: true })
  as: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'strong' | 'em' | 'code' | 'label' =
    'span'

  /** Type treatment. Defaults to the one that matches `as`. */
  @property({ reflect: true })
  appearance:
    | ''
    | 'display'
    | 'heading'
    | 'subheading'
    | 'title'
    | 'body'
    | 'body-strong'
    | 'caption'
    | 'label'
    | 'code' = ''

  /** Colour role. Separate from `appearance`, because colour carries state. */
  @property({ reflect: true })
  tone: 'default' | 'muted' | 'subtle' | 'primary' | 'danger' = 'default'

  /**
   * Writes the appearance in force onto the host.
   *
   * A computed value rather than a reflected property, because it is derived
   * from two others and Lit reflects on assignment. Set in `willUpdate`, which
   * the server calls, so the served markup is styled without waiting for
   * hydration.
   */
  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    this.setAttribute('data-appearance', this.appearance || DEFAULT_APPEARANCE[this.as] || 'body')
  }

  protected override render(): unknown {
    const tag = TAGS[this.as] ?? literal`span`
    return staticHtml`<${tag} part="text"><slot></slot></${tag}>`
  }

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-text': HelixText
  }
}
