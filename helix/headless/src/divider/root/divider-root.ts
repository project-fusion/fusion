import { customElement, HelixElement, slotFilled } from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary Separates content into groups with a rule.
 *
 * @description
 * The separator role lives on the rule inside the shadow root rather than on
 * the host. A role does not need to cross the shadow boundary the way an IDREF
 * does, and putting it on the rendered element means the semantics are in the
 * server's markup with no attribute written during a lifecycle the server never
 * runs.
 *
 * Use `orientation="vertical"` between items on one line, such as inside a
 * toolbar. A vertical divider stretches to its flex parent rather than setting
 * a height of its own.
 *
 * @since 0.1.0
 * @status stable
 * @category layout
 * @aliases Separator, Rule
 * @documentation https://helix.fusion.dev/components/divider
 *
 * @slot - Content set into the rule, such as the word between two sections.
 *
 * @csspart content - What is set into it.
 * @csspart line - The rule itself, or each half of it where something is set in.
 */
@customElement('helix-headless-divider')
export class HelixHeadlessDivider extends HelixElement {
  /**
   * Which way the rule runs.
   */
  @property({ reflect: true })
  orientation?: 'horizontal' | 'vertical'

  /**
   * Whether the rule is announced as a separator.
   *
   * Off by default, and out of the accessibility tree. Most rules on a page
   * separate nothing: they underline a heading or close a section that space
   * had already closed, and announcing every one as a separator is noise a
   * screen-reader user has to walk past.
   *
   * An opt-in, not a `decorative` opt-out, because a boolean attribute cannot
   * be turned off: `decorative="false"` parses as `true`, which would put the
   * quiet default out of reach from HTML and leave it settable only as a
   * property. An opt-in is absent by default, which every reflected property
   * here has to be.
   */
  @property({ reflect: true, type: Boolean })
  announced = false

  /**
   * Marks the middle region when nothing has been set into it.
   *
   * A divider with no content has to be one continuous line, and the space
   * either side of the content is what would break it. `:empty` cannot answer
   * this and neither can `:host(:has(...))`, which is invalid CSS dropped at
   * parse time: `check:selectors` caught exactly that rule here, written in
   * this file, by an author who had already read the note saying so.
   *
   * On the region inside the shadow root rather than on the host, because an
   * attribute written onto the host is a change to markup the consumer rendered.
   */
  private markEmpty(): void {
    const region = this.renderRoot?.querySelector<HTMLElement>('[part="content"]')
    const empty = !slotFilled(this.renderRoot?.querySelector<HTMLSlotElement>('slot'))
    region?.toggleAttribute('data-empty', empty)
    /* `hidden` beside the mirror, because `data-empty` is a hook the styled
       sheet reads and this tier has no sheet: an empty region left in the box
       tree is a gap a consumer cannot close without knowing to look for it. The
       styled rule stays, because that sheet sets `display` on this part and so
       outranks the UA one. */
    region?.toggleAttribute('hidden', empty)
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.markEmpty()
  }

  protected override render(): TemplateResult {
    /* Two rules and a slot between them, always.
     *
     * `role="presentation"` is the honest default; `announced` is for the rule
     * that genuinely divides one thing from another rather than just drawing a
     * line under it.
     *
     * **Both halves are always rendered and the semantics stay on the first.**
     * A rule with nothing set into it is one line with a zero-width slot and a
     * second line of no length, which costs a reader nothing and costs the
     * component the branch that would otherwise decide between two markups. It
     * also means a consumer who slots something in later gets it without the
     * element re-rendering into a different shape.
     *
     * The role is not repeated on the second half. Two separators where a reader
     * crossed one line is the announcement saying twice what happened once, and
     * the content between them is not a boundary of its own. */
    return html`<div
      part="line"
      role=${this.announced ? 'separator' : 'presentation'}
      aria-orientation=${this.announced ? (this.orientation ?? 'horizontal') : nothing}
    ></div>
      <span part="content"><slot @slotchange=${() => this.markEmpty()}></slot></span>
      <div part="line" role="presentation"></div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-divider': HelixHeadlessDivider
  }
}
