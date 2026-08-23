import { customElement, HelixElement } from '@helix-io/core'
import type { CSSResultGroup } from 'lit'
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
 * @summary A run of text, with the element and the look chosen separately.
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
 * The pairing is resolved in CSS rather than by computing an attribute, so the
 * element writes nothing to its own host: `as="h2"` picks up the heading ramp
 * through a selector, and setting `appearance` takes the pairing rule out of
 * play. Deriving it in `willUpdate` worked, but it put an attribute on the host
 * that the server's markup did not have, which is a hydration mismatch in every
 * React consumer.
 *
 * **Size, weight, and leading are not properties.** Exposing them separately
 * offers a few hundred combinations of which a handful are right, and every
 * caller then picks one. An appearance is a decision the system already made:
 * the ramp is named, and a page built from it is consistent because there was
 * nothing else to choose.
 *
 * `tone` stays separate, because color carries state rather than typography.
 * Folding it in would mean `caption-danger` and `label-primary` and the rest of
 * the cross product, which is the explosion `appearance` exists to prevent.
 *
 * @since 0.1.0
 * @status experimental
 * @category content
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
  as?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'strong' | 'em' | 'code' | 'label'

  /** Type treatment. Defaults to the one that matches `as`. */
  @property({ reflect: true })
  appearance?:
    | 'display'
    | 'heading'
    | 'subheading'
    | 'title'
    | 'body'
    | 'body-strong'
    | 'caption'
    | 'label'
    | 'code'

  /**
   * Color role. A separate axis from the type ramp, because color carries
   * state: folding it in would mean `caption-danger` and the rest of the cross
   * product.
   *
   * **`default` is gone, having been styled nowhere.** It matched no rule and
   * fell through to the inherited ink, so it read as working while saying
   * nothing, which is the same shape as the `shadow` an example wrote at Video.
   * The resting case is the absent attribute.
   *
   * **`muted` and `subtle` are weight rather than meaning and belong on
   * `emphasis`, which is why this is still off the registry.** Splitting them
   * out is blocked on the palette rather than on the rename: there is a quiet
   * step for the neutral ink and none for any other tone, so a muted danger has
   * nothing to be made of. `primary-subtle` is a tinted *ground* and not a
   * quiet ink. That is #141's to derive, and until it does, folding the two
   * halves apart would leave three of the four combinations unsayable.
   */
  @property({ reflect: true })
  tone?: 'muted' | 'subtle' | 'primary' | 'danger'

  protected override render(): unknown {
    /* `Object.hasOwn`, not a truthy index.
     *
     * `TAGS[this.as]` reaches `Object.prototype`, so `as="constructor"` and
     * every other inherited key came back truthy and were passed to
     * `staticHtml` as a tag: the result is a lit marker rendered as an element
     * name, not the span fallback and not a throw. Own keys only. */
    const tag =
      (this.as && Object.hasOwn(TAGS, this.as) ? TAGS[this.as] : undefined) ?? literal`span`
    return staticHtml`<${tag} part="text"><slot></slot></${tag}>`
  }

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-text': HelixText
  }
}
