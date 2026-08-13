import { HelixElement, WithOpen } from '@helix-io/core'
import { html, nothing, type TemplateResult } from 'lit'

/** Shadow-DOM id linking the trigger's aria-controls to the content region. */
const CONTENT_ID = 'content'

/**
 * Shadow-DOM id of the trigger, used to name the content region.
 *
 * A `role="region"` with no accessible name is not exposed as a landmark by
 * screen readers and is flagged by every automated audit, so the region borrows
 * the trigger's text.
 */
const TRIGGER_ID = 'trigger'

/**
 * Disclosures let users show and hide a section of related content.
 *
 * The headless tier owns structure, accessibility wiring, and state. It ships
 * no CSS and references no tokens: styling is the styled tier's job. Consumers
 * who want to bring their own styling entirely can use this tier directly.
 *
 * `open`, `defaultOpen`, `isOpen`, and `setOpen` come from the `WithOpen` mixin
 * and resolve into this component's manifest automatically, because
 * `@helix-io/core` publishes one and the analyzer runs with
 * `dependencies: true`.
 *
 * The event is declared here rather than inferred. It is dispatched through a
 * generic helper, and the analyzer can only record the parameter identifier of
 * a dynamic dispatch, not the name it resolves to at runtime.
 *
 * @slot summary - The always-visible trigger content.
 * @slot - The content revealed when open.
 *
 * @event open-change - Fired when the disclosure is opened or closed. Carries
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
          id=${TRIGGER_ID}
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
          aria-labelledby=${TRIGGER_ID}
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
