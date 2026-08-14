import { customElement, HelixElement } from '@helix-io/core'
import { caretRight } from '@helix-io/icons'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'

/**
 * @summary One step in a breadcrumb trail.
 *
 * @description
 * Contributes the separator and the list-item role. The link is the consumer's
 * own, slotted in, because an anchor rendered into this element's shadow root
 * is unreachable to the framework that owns the route: a router renders its own
 * `<a>`, and one written here would be a full page load instead.
 *
 * Each item renders its own separator and hides it with `:host(:first-child)`,
 * so the trail needs no index and no coordination from the parent. `:host()`
 * takes a structural pseudo-class, unlike `:has()`, which it rejects.
 *
 * The current page is text, not a link. Linking a page to itself is a known
 * screen-reader annoyance, and `aria-current="page"` on the host is what
 * conveys position.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Crumb
 * @documentation https://helix.fusion.dev/components/breadcrumbs
 *
 * @slot - The step: a link, or the text of the current page. A link is styled
 * with `data-link="quiet"`, since a slotted anchor belongs to the outer tree
 * and cannot be reached from this component's styles.
 * @slot separator - Replaces the chevron shown before this item.
 *
 * @csspart separator - The separator preceding the item.
 */
@customElement('helix-base-breadcrumb')
export class HelixBaseBreadcrumb extends HelixElement {
  /** Whether this item is the page the reader is on. */
  @property({ reflect: true, type: Boolean })
  current = false

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    // On the host, because the item is an `<ol>` child in the flat tree and the
    // role has to be there for the list to have items. In `willUpdate` rather
    // than `connectedCallback`, which the server never calls.
    this.internals.role = 'listitem'
    this.internals.ariaCurrent = this.current ? 'page' : null
  }

  protected override render(): TemplateResult {
    // The chevron is the slot's own fallback, so replacing it is a matter of
    // filling the slot and costs the consumer no way to opt out of the default.
    return html`<span part="separator" aria-hidden="true"
        ><slot name="separator"
          ><svg fill="currentColor" viewBox=${caretRight.viewBox}>
            ${unsafeSVG(caretRight.content)}
          </svg></slot
        ></span
      ><slot></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-breadcrumb': HelixBaseBreadcrumb
  }
}
