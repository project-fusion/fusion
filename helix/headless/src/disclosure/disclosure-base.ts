import { HelixElement, WithOpen } from '@helix-io/core'
import { html, nothing, type TemplateResult } from 'lit'

/**
 * Disclosures let users show and hide a section of related content.
 *
 * The headless tier owns structure, accessibility wiring, and state. It ships
 * no CSS and references no tokens: styling is the styled tier's job. Consumers
 * who want to bring their own styling entirely can use this tier directly.
 *
 * @slot summary - The always-visible trigger content.
 * @slot - The content revealed when open.
 */
export class HelixDisclosureBase extends WithOpen(HelixElement) {
  static contentId = 'content'

  protected handleToggle = (): void => {
    this.setOpen(!this.isOpen)
  }

  protected override render(): TemplateResult {
    const open = this.isOpen
    return html`
      <div part="container">
        <button
          aria-controls=${HelixDisclosureBase.contentId}
          aria-expanded=${open ? 'true' : 'false'}
          part="trigger"
          type="button"
          @click=${this.handleToggle}
        >
          <slot name="summary"></slot>
        </button>
        <div
          id=${HelixDisclosureBase.contentId}
          part="content"
          ?hidden=${!open}
          role="region"
        >
          ${open ? html`<slot></slot>` : nothing}
        </div>
      </div>
    `
  }
}
