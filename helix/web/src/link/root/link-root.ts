import { customElement, HelixElement } from '@helix-io/core'
import type { CSSResultGroup, TemplateResult } from 'lit'
import { html, nothing } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './link-root.css.js'

/**
 * @summary Navigates to another page or resource.
 *
 * @description
 * Renders a real `<a>`, so middle-click, copy-link-address, and the browser's
 * own status bar all work without anything being reimplemented.
 *
 * A new browsing context gets `rel="noreferrer noopener"` unless told
 * otherwise, because without it the opened page can reach back through
 * `window.opener`, and it is marked with an indicator so the reader knows
 * before they click rather than after.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Anchor, A
 * @documentation https://helix.fusion.dev/components/link
 *
 * @slot - The link text.
 *
 * @csspart link - The anchor.
 */
@customElement('helix-link')
export class HelixLink extends HelixElement {
  /** Where the link goes. */
  @property()
  href = ''

  /** Browsing context, such as `_blank`. */
  @property()
  target = ''

  /** Relationship of the linked URL, defaulted when opening a new tab. */
  @property()
  rel = ''

  /** Size on the type scale. */
  @property({ reflect: true })
  size: 'xs' | 'sm' | 'md' | 'lg' = 'md'

  /** How much the link announces itself. */
  @property({ reflect: true })
  appearance: 'default' | 'subtle' | 'quiet' = 'default'

  /** Whether the underline waits for hover. */
  @property({ attribute: 'underline-on-hover', reflect: true, type: Boolean })
  underlineOnHover = false

  private get resolvedRel(): string {
    if (this.rel) {
      return this.rel
    }
    return this.target === '_blank' ? 'noreferrer noopener' : ''
  }

  protected override render(): TemplateResult {
    return html`<a
      part="link"
      href=${this.href || nothing}
      target=${this.target || nothing}
      rel=${this.resolvedRel || nothing}
      ><slot></slot
    ></a>`
  }

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-link': HelixLink
  }
}
