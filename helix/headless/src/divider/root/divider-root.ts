import {
  customElement,
  HelixElement,
  markRegion,
  toolbarAround,
  toolbarAxis,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary A line that separates content into groups.
 *
 * @description
 * The separator role is on the rule inside the shadow root. A role does not
 * need to cross the shadow boundary the way an IDREF does, so it can sit on the
 * rendered element. The semantics are then in the server-rendered markup, with
 * no attribute written by script after the element connects.
 *
 * **The line is a separator**, as `<hr>` is, and as Radix Separator, React
 * Aria Separator, and Web Awesome's divider are. It is named by any content
 * set into it, so a screen reader says "Or, separator" where you wrote "Or" on
 * the line. Set `decorative` on a rule that separates nothing, such as one
 * under a heading or between the facts of a byline, and it leaves the
 * accessibility tree.
 *
 * Use `orientation="vertical"` between items on one line. A vertical divider
 * stretches to fit its flex parent and sets no height of its own.
 *
 * **Inside a toolbar it runs across the toolbar** without being told: vertical
 * in a horizontal toolbar and horizontal in a vertical one, with
 * `aria-orientation` to match, as React Aria's separator does inside a
 * toolbar. Inside means a child of Toolbar or of the page's own
 * `role="toolbar"`. An `orientation` you write still wins. A server cannot see
 * the toolbar, so the turn arrives with hydration, inside the shadow root.
 *
 * @since 0.1.0
 * @status stable
 * @category layout
 * @aliases Separator, Rule
 * @documentation https://fusion.dev/helix/components/divider
 *
 * @slot - Content set into the line, such as a word between two sections.
 *
 * @csspart content - The content set into the line.
 * @csspart line - The line, or each half of it when content is set into it.
 *
 * @cssstate vertical - The line runs vertically: `orientation="vertical"`, or no `orientation` inside a horizontal toolbar.
 */
@customElement('helix-headless-divider')
export class HelixHeadlessDivider extends HelixElement {
  /**
   * Whether screen readers announce the line as a separator, which they now do
   * by default.
   *
   * It dates from when the line was decorative by default. It is still read,
   * and it wins over `decorative`, so a divider written with it stays a
   * separator.
   */
  @property({ reflect: true, type: Boolean })
  announced = false

  /**
   * Takes the line out of the accessibility tree, for a rule that separates
   * nothing: one under a heading, or between the facts of a byline.
   *
   * Absent, the line is a separator, as `<hr>` is. Radix Separator's opt-out
   * has the same name. It turns the role off because a boolean attribute that
   * is on by default cannot be turned off from HTML.
   */
  @property({ reflect: true, type: Boolean })
  decorative = false

  /**
   * The direction the line runs: `horizontal` or `vertical`.
   *
   * Unset is horizontal, or across the toolbar the divider sits in.
   */
  @property({ reflect: true })
  orientation?: 'horizontal' | 'vertical'

  /**
   * The direction the line is drawn and announced in: `orientation`, else
   * across the toolbar around it, else horizontal.
   *
   * The toolbar is read only where the tree is known, never while hydrating
   * what a server sent, whose render has to be the server's.
   */
  private get drawn(): 'horizontal' | 'vertical' {
    const toolbar = this.orientation || this.hydrating ? null : toolbarAround(this)
    if (toolbar) {
      return toolbarAxis(toolbar) === 'vertical' ? 'horizontal' : 'vertical'
    }
    return this.orientation ?? 'horizontal'
  }

  /** Reads the toolbar again when the divider moves into or out of one. */
  override connectedCallback(): void {
    super.connectedCallback()
    this.requestUpdate()
  }

  /**
   * Marks the middle region when nothing has been set into it.
   *
   * A divider with no content has to be one continuous line, and the space
   * either side of the content is what would break it. `:empty` cannot answer
   * this and neither can `:host(:has(...))`, which is invalid CSS dropped at
   * parse time.
   *
   * On the region inside the shadow root rather than on the host, because an
   * attribute written onto the host is a change to markup the consumer rendered.
   */
  private markEmpty(): void {
    /* `hidden` beside the mirror, because `data-empty` is the hook a sheet
       selects on and this tier ships none: an empty region left in the box tree
       is a gap a consumer cannot close without knowing to look for it. Both
       stay, since `[hidden]` is a UA rule and a sheet setting `display` on this
       part outranks it. */
    markRegion(this.renderRoot, 'content', [''])
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    this.toggleState('vertical', this.drawn === 'vertical')
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.finishHydration()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.markEmpty()
  }

  protected override render(): TemplateResult {
    /* Two rules and a slot between them, always.
     *
     * A separator unless `decorative` says the rule only draws a line, as
     * `<hr>` is; `announced`, from when the default was the other way, keeps
     * a page's separator a separator whatever else it says.
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
    /* **A separator is named by what is set into it**, so a reader
       hears "Or, separator" where the page wrote "Or" on the line. By id, in
       one shadow root, which reads the slotted words where a name taken from
       the line's own content would not; an empty content names nothing. */
    const separator = this.announced || !this.decorative
    return html`<div
      part="line"
      role=${separator ? 'separator' : 'presentation'}
      aria-labelledby=${separator ? 'content' : nothing}
      aria-orientation=${separator ? this.drawn : nothing}
    ></div>
      <span id="content" part="content"><slot @slotchange=${() => this.markEmpty()}></slot></span>
      <div part="line" role="presentation"></div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-divider': HelixHeadlessDivider
  }
}
