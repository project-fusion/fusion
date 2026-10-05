import { customElement, HelixElement, reportRuntime } from '@fusion.dev/helix-core'
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
 * @summary Text, with its HTML element and its type style set separately.
 *
 * @description
 * `as` sets the element, which decides the document outline and what a screen
 * reader announces. `variant` sets the type ramp, which decides size, weight,
 * leading, and tracking together.
 *
 * The two match by default, so usually you set only `as`, such as `as="h2"`.
 * Set `variant` when the look and the element differ, such as a heading that
 * looks smaller or a `<p>` styled as a caption.
 *
 * The pairing is resolved in CSS, so the element writes nothing to its host.
 * `as="h2"` picks up the heading ramp through a selector, and setting `variant`
 * overrides the pairing. Do not derive it in `willUpdate`, because that adds a
 * host attribute the server markup does not have, which causes a hydration
 * mismatch in React.
 *
 * Size, weight, and leading are not separate properties. Choose a named ramp
 * with `variant`.
 *
 * `tone` and `emphasis` are separate from `variant`, because color carries
 * state. Combining them would need a variant for every pair, such as
 * `caption-danger` and `label-muted`.
 *
 * @since 0.1.0
 * @status stable
 * @category typography
 * @aliases Paragraph, Copy, Label, Caption, Heading, Title
 * @documentation https://fusion.dev/helix/components/text
 *
 * @slot - The text.
 *
 * @csspart text - The rendered element.
 */
@customElement('helix-text')
export class HelixText extends HelixElement {
  /**
   * The HTML element to render.
   *
   * Decides the outline and the semantics.
   *
   * **`label` gives the label ramp and labels no control.** The element is in
   * this one's shadow root, which neither `for` nor a wrapped control can
   * reach, so a page that writes either is warned. Name a Helix field with its
   * own `label`, and a native control with `<label data-text="label">`.
   */
  @property({ reflect: true })
  as?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'strong' | 'em' | 'code' | 'label'

  /**
   * Makes the text quieter: `muted`, or the quieter `subtle`.
   *
   * `muted` is the quiet ink that still has to be read, and `subtle` the
   * quieter one below it. Two axes because the test says so: a line can be a
   * danger *and* quiet at once, and a muted danger is what a validation hint
   * under a field is.
   *
   * **With a `tone`, both are that tone's one quiet ink**: the tone's hue at half
   * its chroma, as readable as the tone. The readable range holds one quiet step
   * and not two, measured in #124 for the neutral ink, and a tone has less room
   * there rather than more, so `subtle` on a tone is the same ink as `muted`
   * rather than a second one that could not be read.
   *
   * The resting case is the absent attribute, full strength.
   */
  @property({ reflect: true })
  emphasis?: 'muted' | 'subtle'

  /**
   * The meaning of the text, shown by its color, such as `danger` or `success`.
   * It is set separately from `variant`.
   *
   * **There is no `default` value**, and one must not be added: it would match
   * no rule and fall through to the inherited ink, reading as working while
   * saying nothing. The resting case is the absent attribute.
   *
   * Weight is not a tone. How loud the text is belongs on `emphasis`, which is
   * why `muted` and `subtle` moved there.
   */
  @property({ reflect: true })
  tone?: 'accent' | 'danger' | 'info' | 'primary' | 'success' | 'warning'

  /**
   * The type style, which sets the size, weight, leading, and tracking.
   *
   * Defaults to the one that matches `as`: `body` for `p`, `body-strong` for
   * `strong`, `h5` and `h6`. A `span` or an `em` keeps the type around it.
   */
  @property({ reflect: true })
  variant?:
    | 'display'
    | 'heading'
    | 'subheading'
    | 'title'
    | 'body'
    | 'body-strong'
    | 'caption'
    | 'label'
    | 'code'

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    if (changed.has('as') && this.as === 'label' && this.labelsNothing()) {
      reportRuntime({
        kind: 'unreachable-label',
        message:
          '<helix-text as="label"> names no control: its label is in a shadow root, which ' +
          '`for` and a wrapped control cannot reach. Give a Helix field its own `label`, or ' +
          'write `<label data-text="label">` for a native control.',
        tag: this.localName,
      })
    }
  }

  /** Whether the page wrote this as the label of a control, which it cannot be. */
  private labelsNothing(): boolean {
    const fields = [...this.querySelectorAll('*')].some(
      (element) => (element.constructor as { formAssociated?: boolean }).formAssociated === true,
    )
    return (
      fields ||
      this.hasAttribute('for') ||
      this.querySelector('input, select, textarea, button, meter, output, progress') !== null
    )
  }

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
