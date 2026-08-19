import { customElement, HelixElement, hostAria } from '@helix-io/core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary Says that a region has nothing in it, and what to do about it.
 *
 * @description
 * An empty region with no explanation is indistinguishable from one that failed
 * to load, so this exists to tell the difference: what would be here, and the
 * one action that would put something here.
 *
 * `role="status"` on a polite live region, because an empty view usually
 * arrives in place of content that was being fetched. Announcing it is the only
 * way a screen-reader user learns the search returned nothing, rather than
 * being left waiting.
 *
 * Every region is a bare slot. The reference ships an `empty-state-heading` and
 * an `empty-state-actions` whose only job is to assign themselves a slot on
 * connect, which is a component for something the consumer can write.
 *
 * @since 0.1.0
 * @status experimental
 * @category feedback
 * @aliases Placeholder, NoResults, Blank
 * @documentation https://helix.fusion.dev/components/empty
 *
 * @slot icon - A mark above the heading.
 * @slot heading - What is missing.
 * @slot - Why, and what to do about it.
 * @slot actions - The way out.
 */
@customElement('helix-base-empty')
export class HelixBaseEmpty extends HelixElement {
  /**
   * Whether the state is announced when it appears.
   *
   * On by default: an empty view almost always replaces something that was
   * loading. Turn it off for one that was on the page from the start, which
   * has nothing to announce because nothing changed.
   */
  @property({ attribute: 'no-announce', reflect: true, type: Boolean })
  noAnnounce = false

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    hostAria(this.internals, { role: this.noAnnounce ? '' : 'status' })
    this.internals.ariaLive = this.noAnnounce ? null : 'polite'
  }

  protected override render(): TemplateResult {
    return html`<slot name="icon"></slot>
      <slot name="heading"></slot>
      <slot></slot>
      <slot name="actions"></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-empty': HelixBaseEmpty
  }
}
