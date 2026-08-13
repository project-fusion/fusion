import { customElement, HelixElement, WithOpen } from '@helix-io/core'
import { html, type TemplateResult } from 'lit'

/** Shadow-DOM id linking the trigger's aria-controls to the content region. */
const CONTENT_ID = 'content'

/**
 * Shadow-DOM id of the trigger, used to name the content region.
 *
 * A `role="region"` with no accessible name is not exposed as a landmark by
 * screen readers and is flagged by every automated audit, so the region borrows
 * the trigger's text. Both ids live in the same shadow root, so the reference
 * resolves; an IDREF pointing at the light DOM never would.
 */
const TRIGGER_ID = 'trigger'

/**
 * @summary One collapsible section of an accordion.
 *
 * @description
 * Carries its own open state, which is why it is an element rather than a slot.
 * Used alone it is a disclosure, and that is deliberate: shipping a separate
 * `Disclosure` meant two implementations of one behavior, which is what this
 * replaced.
 *
 * Content stays mounted when closed and is hidden by the styled tier's CSS, so
 * it can animate and so the text is present in server-rendered HTML. Closed
 * content is `inert`, keeping it out of the tab order and the accessibility
 * tree without removing it from the box tree.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Collapsible, Expander, Disclosure
 * @documentation https://helix.fusion.dev/components/accordion
 *
 * @slot summary - The always-visible trigger content.
 * @slot - The content revealed when open.
 *
 * @csspart container - The outer wrapper.
 * @csspart trigger - The clickable summary row.
 * @csspart content - The revealed region.
 * @csspart content-inner - Padding wrapper inside the animated region.
 *
 * @event {HelixOpenChangeEvent} OpenChange - Fired when the item opens or closes.
 */
@customElement('helix-base-accordion-item')
export class HelixBaseAccordionItem extends WithOpen(HelixElement) {
  protected handleToggle = (): void => {
    this.setOpen(!this.isOpen)
  }

  /**
   * Moves focus to this item's trigger.
   *
   * The parent accordion drives arrow-key navigation and cannot reach the
   * trigger itself, because it is inside this item's shadow root. Exposing the
   * intent as a method keeps the parent out of the child's internals.
   */
  focusTrigger(): void {
    this.renderRoot.querySelector<HTMLButtonElement>(`#${TRIGGER_ID}`)?.focus()
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
    'helix-base-accordion-item': HelixBaseAccordionItem
  }
}
