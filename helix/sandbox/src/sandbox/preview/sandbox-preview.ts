import { customElement, HelixElement } from '@helix-io/core'
import { nothing, type PropertyValues } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary Renders sandbox source as live markup.
 *
 * @description
 * Renders into the light DOM rather than a shadow root, which is the whole
 * reason this is an element and not a `<div>` someone sets `innerHTML` on.
 * Content inside a shadow root is cut off from the base layer, so a heading
 * would come out at the browser's default size and a link in the wrong colour,
 * and the preview would be a worse likeness the more the design system does.
 * In the light DOM it is styled exactly as it would be on a real page.
 *
 * **The source is trusted.** It is markup a developer typed into their own
 * sandbox, and it is rendered as markup. Never point this at input from anyone
 * else.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Result, Output
 * @documentation https://helix.fusion.dev/sandbox/preview
 */
@customElement('helix-sandbox-preview')
export class HelixSandboxPreview extends HelixElement {
  /** Markup to render. */
  @property()
  source = ''

  /**
   * Renders into the light DOM.
   *
   * Lit renders into a shadow root by default; returning `this` opts out, which
   * is what puts the preview under the page's own stylesheets.
   */
  protected override createRenderRoot(): HTMLElement {
    return this
  }

  /**
   * Nothing, because the children are set by hand below.
   *
   * The source is a string of markup rather than a template, and Lit's own
   * `unsafeHTML` would leave part markers among the previewed elements.
   */
  protected override render(): typeof nothing {
    return nothing
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    if (changed.has('source')) {
      this.innerHTML = this.source
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-sandbox-preview': HelixSandboxPreview
  }
}
