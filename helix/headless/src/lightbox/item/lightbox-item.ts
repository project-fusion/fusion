import { customElement, HelixElement } from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary One item a lightbox can show, such as a picture, a video frame, or a chart.
 *
 * @description
 * Wraps one piece of content in the lightbox, such as a picture, a video frame,
 * or a chart. The lightbox shows one item at a time, and the root decides
 * which.
 *
 * Each item is a `group` with the role description `slide`, named by its
 * `label` or, without one, by its place in the set, such as "2 of 5", as the
 * APG carousel pattern names a slide. The lightbox supplies both words, so they
 * are translated on the lightbox.
 *
 * An item that is not current is hidden and stays in the DOM, as a `TabPanel`
 * does. Crawlers can read it, it is in the server-rendered markup, and an
 * `<img>` that has decoded does not decode again when you go back to it.
 *
 * @since 0.100.0
 * @status stable
 * @category media
 * @aliases LightboxSlide, GalleryItem
 * @documentation https://fusion.dev/helix/components/lightbox
 *
 * @slot - The content to show.
 * @slot description - A line under the content that describes it.
 *
 * @csspart item - The box the content is shown in.
 *
 * @cssstate current - The item the lightbox is showing.
 */
@customElement('helix-headless-lightbox-item')
export class HelixHeadlessLightboxItem extends HelixElement {
  /**
   * Whether this item is the one shown.
   *
   * Written by the root, which is the only thing that sees the set.
   */
  @property({ type: Boolean })
  current = false

  /**
   * The item's name. It names the item's group, and fills `{label}` in the
   * lightbox's `status-label`.
   */
  @property()
  label = ''

  /**
   * @internal Set by the lightbox: the item's name where it has no `label`,
   * which is its place in the set.
   */
  @property({ attribute: false })
  position = ''

  /**
   * @internal Set by the lightbox: the word a screen reader says in place of
   * the item's role. Empty leaves the role as it is.
   */
  @property({ attribute: false })
  roleLabel = ''

  /**
   * The item's identifier. The root compares its `active` value against it.
   */
  @property()
  value = ''

  /**
   * Mirrors the shown state where a stylesheet can select on it.
   *
   * A custom state and never a reflected attribute, for the reason `TabPanel`
   * writes out at length: the parent writes this, so reflecting it would put
   * the element's own bookkeeping into markup a consumer never sent, which is a
   * hydration mismatch in React and a choice nobody made in a serialized tree.
   */
  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    this.toggleState('current', this.current)
  }

  protected override render(): TemplateResult {
    return html`<div
      part="item"
      role="group"
      aria-roledescription=${this.roleLabel || nothing}
      aria-label=${this.label || this.position || nothing}
      ?hidden=${!this.current}
    >
      <slot></slot>
      <slot name="description"></slot>
    </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-lightbox-item': HelixHeadlessLightboxItem
  }
}
