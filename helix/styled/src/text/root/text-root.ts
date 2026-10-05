import { customElement, HelixElement, reportRuntime } from '@fusion.dev/helix-core'
import type { CSSResultGroup, PropertyValues } from 'lit'
import { nothing } from 'lit'
import { property } from 'lit/decorators.js'
import { literal, type StaticValue, html as staticHtml } from 'lit/static-html.js'
import { clampOf } from '../clamp.js'
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
 * `lines` cuts the text off after that many lines and ends it with an
 * ellipsis. `text-wrap` balances or tidies the line breaks, and `text-align`
 * sets the alignment. Each `--text-*` property overrides one value of the
 * ramp, for a text or for every text inside an element.
 *
 * **To label a control, write a native `<label data-text="label">`.** The
 * base layer gives it the label ramp. A Helix field takes its own `label`.
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
 *
 * @cssproperty --text-font-family - The typeface. Overrides the ramp's.
 * @cssproperty --text-font-size - The size. Overrides the ramp's.
 * @cssproperty --text-font-weight - The weight. Overrides the ramp's.
 * @cssproperty --text-letter-spacing - The tracking. Overrides the ramp's.
 * @cssproperty --text-line-height - The leading. Overrides the ramp's.
 */
@customElement('helix-text')
export class HelixText extends HelixElement {
  /**
   * The HTML element to render.
   *
   * Decides the outline and the semantics.
   *
   * **`label` is deprecated and no longer listed.** The element is in this
   * one's shadow root, which neither `for` nor a wrapped control can reach, so
   * it labeled nothing. Written anyway, it still renders a `<label>` in the
   * label ramp and warns. Use `variant="label"` for the look, a native
   * `<label data-text="label">` to label a native control, and a Helix field's
   * own `label`.
   */
  @property({ reflect: true })
  as?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'strong' | 'em' | 'code'

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
   * The most lines to show. Text past the last one is cut off with an
   * ellipsis.
   *
   * Lays the text out as a block, because a line count needs a width to break
   * against. The whole text stays in the page, so a screen reader and a search
   * still read all of it. Set it as an attribute, such as `lines="1"` for a
   * single line. A count that is not a whole number above zero, such as `0`,
   * cuts nothing off.
   */
  @property({ reflect: true, type: Number })
  lines?: number

  /**
   * How the lines align, set as `text-align`.
   *
   * Named for the CSS property it sets. `align` alone is a legacy HTML
   * attribute the browser maps to `text-align` by itself on any element, and
   * it has no `start` or `end`.
   */
  @property({ attribute: 'text-align', reflect: true })
  textAlign?: 'start' | 'center' | 'end' | 'justify'

  /**
   * How the lines break, set as `text-wrap`.
   *
   * `balance` evens out the length of every line, for a heading of a few
   * lines. `pretty` avoids a last line of one short word, for a paragraph.
   * `nowrap` keeps the text on one line. Absent, the lines break as the
   * browser breaks them.
   */
  @property({ attribute: 'text-wrap', reflect: true })
  textWrap?: 'balance' | 'pretty' | 'nowrap'

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
    if (changed.has('as') && (this.as as string) === 'label') {
      reportRuntime({
        kind: 'unreachable-label',
        message:
          '<helix-text as="label"> is deprecated: its label is in a shadow root, which `for` ' +
          'and a wrapped control cannot reach, so it labels nothing. Write `variant="label"` ' +
          'for the look, `<label data-text="label">` for a native control, and give a Helix ' +
          'field its own `label`.',
        tag: this.localName,
      })
    }
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
    return staticHtml`<${tag} part="text" style=${clampOf(this.lines) ?? nothing}><slot></slot></${tag}>`
  }

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-text': HelixText
  }
}
