import { customElement, HelixElement, WithOpen } from '@helix-io/core'
import { html, type TemplateResult } from 'lit'

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
 * @summary Shows and hides a section of related content.
 *
 * @description
 * Content stays mounted when closed and is hidden by the styled tier's CSS, so
 * an open and close transition is possible and the text is present in
 * server-rendered HTML. Closed content is `inert`, keeping it out of the tab
 * order and the accessibility tree without removing it from the box tree.
 *
 * Slated to become `Accordion.Item`: a disclosure is an accordion with one
 * section, and shipping both means two implementations of one behavior.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Collapsible, Expander
 * @documentation https://helix.fusion.dev/components/disclosure
 *
 * @slot summary - The always-visible trigger content.
 * @slot - The content revealed when open.
 *
 * @csspart container - The outer wrapper.
 * @csspart trigger - The clickable summary row.
 * @csspart content - The revealed region.
 * @csspart content-inner - Padding wrapper inside the animated region.
 *
 * @event {HelixOpenChangeEvent} helix-open-change - Fired when the disclosure opens or closes.
 */
@customElement('helix-base-disclosure')
export class HelixBaseDisclosure extends WithOpen(HelixElement) {
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
          ?inert=${!open}
          role="region"
        >
          <div part="content-inner">
            <slot></slot>
          </div>
        </div>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-disclosure': HelixBaseDisclosure
  }
}
