import { customElement, HelixElement } from '@helix-io/core'
import { html, type TemplateResult } from 'lit'
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
  orientation: 'horizontal' | 'vertical' = 'horizontal'

  protected override render(): TemplateResult {
    return html`<div part="line" role="separator" aria-orientation=${this.orientation}></div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-divider': HelixBaseDivider
  }
}
