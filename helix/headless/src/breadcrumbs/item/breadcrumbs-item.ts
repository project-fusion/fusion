import { customElement, HelixElement } from '@helix-io/core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary One step in a breadcrumb trail.
 *
 * @description
 * An element rather than a slot because it carries API of its own: `href`,
 * whether it is the current page, and the separator that precedes it.
 *
 * Each item renders its own separator and hides it with `:host(:first-child)`,
 * so the trail needs no index and no coordination from the parent. Structural
 * pseudo-classes are allowed inside `:host()`, unlike `:has()`, and this was
 * verified in a browser before being relied on.
 *
 * The current page is a `<span>`, not a link. Linking a page to itself is a
 * known screen-reader annoyance, and `aria-current="page"` is what actually
 * conveys position.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Crumb
 * @documentation https://helix.fusion.dev/components/breadcrumbs
 *
 * @slot - The item's label.
 * @slot separator - Replaces the separator shown before this item.
 *
 * @csspart separator - The separator preceding the item.
 * @csspart link - The item's link, or its text when current.
 */
@customElement('helix-base-breadcrumbs-item')
export class HelixBaseBreadcrumbsItem extends HelixElement {
  /** Where the step leads. Ignored when the item is the current page. */
  @property()
  href = ''

  /** Whether this item is the page the reader is on. */
  @property({ reflect: true, type: Boolean })
  current = false

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    // On the host, because the item is an `<ol>` child in the flat tree and the
    // role has to be there for the list to have items. Set here rather than in
    // `connectedCallback`, which the server never calls; verified to serialize.
    this.internals.role = 'listitem'
  }

  protected override render(): TemplateResult {
    const label = html`<slot></slot>`

    return html`<span part="separator" aria-hidden="true"
        ><slot name="separator">/</slot></span
      >${
        this.current || !this.href
          ? html`<span part="link" aria-current=${this.current ? 'page' : nothing}>${label}</span>`
          : html`<a part="link" href=${this.href}>${label}</a>`
      }`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-breadcrumbs-item': HelixBaseBreadcrumbsItem
  }
}
