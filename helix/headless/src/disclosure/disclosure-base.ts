import { HelixElement, WithOpen } from '@helix-io/core'
import { html, nothing, type TemplateResult } from 'lit'

/** Shadow-DOM id linking the trigger's aria-controls to the content region. */
const CONTENT_ID = 'content'

/**
 * Disclosures let users show and hide a section of related content.
 *
 * The headless tier owns structure, accessibility wiring, and state. It ships
 * no CSS and references no tokens: styling is the styled tier's job. Consumers
 * who want to bring their own styling entirely can use this tier directly.
 *
 * `open` and `defaultOpen` come from the `WithOpen` mixin, and the analyzer
 * cannot follow a mixin into another package, so the event it emits is declared
 * here. Any mixin-provided API a component exposes has to be documented on the
 * component or it is invisible to tooling.
 *
 * @slot summary - The always-visible trigger content.
 * @slot - The content revealed when open.
 *
 * @fires open-change - Fired when the disclosure is opened or closed. Carries
 * `{ open: boolean }`. In controlled mode this is the only signal; the element
 * does not update itself.
 */
export class HelixDisclosureBase extends WithOpen(HelixElement) {
  protected handleToggle = (): void => {
    this.setOpen(!this.isOpen)
  }

  protected override render(): TemplateResult {
    const open = this.isOpen
    return html`
      <div part="container">
        <button
          aria-controls=${CONTENT_ID}
          aria-expanded=${open ? 'true' : 'false'}
          part="trigger"
          type="button"
          @click=${this.handleToggle}
        >
          <slot name="summary"></slot>
        </button>
        <div
          id=${CONTENT_ID}
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
