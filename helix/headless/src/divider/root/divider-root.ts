import { customElement, HelixElement } from '@helix-io/core'
import { html, nothing, type TemplateResult } from 'lit'
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
 * @status experimental
 * @aliases Separator, Rule
 * @documentation https://helix.fusion.dev/components/divider
 *
 * @csspart line - The rule itself.
 */
@customElement('helix-base-divider')
export class HelixBaseDivider extends HelixElement {
  /** Which way the rule runs. */
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
   * Stated this way round rather than as `decorative`, which is how the
   * reference implementation has it, because a boolean attribute cannot be
   * turned off: `decorative="false"` is still `true` to the parser, so the
   * quiet default would have been unreachable from HTML and settable only as a
   * property. An opt-in has no such problem, and it is absent by default, which
   * is what every reflected property here has to be.
   */
  @property({ reflect: true, type: Boolean })
  announced = false

  protected override render(): TemplateResult {
    // `role="presentation"` is the honest default; `announced` is for the rule
    // that genuinely divides one thing from another rather than just drawing a
    // line under it.
    return html`<div
      part="line"
      role=${this.announced ? 'separator' : 'presentation'}
      aria-orientation=${this.announced ? (this.orientation ?? 'horizontal') : nothing}
    ></div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-divider': HelixBaseDivider
  }
}
