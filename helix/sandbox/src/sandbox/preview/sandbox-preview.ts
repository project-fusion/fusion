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
   * Stylesheet applied to the preview.
   *
   * Scoped by being written into the preview's own subtree rather than the
   * document, so an example that restyles `helix-card` restyles the one being
   * previewed and not the sandbox around it.
   */
  @property()
  styles = ''

  /**
   * Renders into a throwaway node, and writes the preview into the light DOM
   * by hand.
   *
   * The preview has to be in the light DOM so it sits under the page's own
   * stylesheets, and it replaces its children wholesale with the source markup.
   * Those two together rule out handing Lit this element: Lit keeps its part
   * markers among the children, replacing them ejects the markers, and the next
   * update throws rather than rendering.
   *
   * A wrapper the markup goes inside would fix that and break something worse.
   * This element is in the light DOM, so its children are part of the tree
   * React hydrates, and a node that appears on upgrade is a structural
   * hydration failure rather than a mismatched attribute.
   *
   * So Lit gets somewhere else to render, and loses nothing: `render` returns
   * nothing, and the preview writes into `this` itself.
   */
  protected override createRenderRoot(): HTMLElement {
    return document.createElement('div')
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
    if (changed.has('source') || changed.has('styles')) {
      this.applyStyles()
    }
  }

  /**
   * Puts the stylesheet inside the preview, after the markup.
   *
   * Re-created whenever the markup is, because setting `innerHTML` removes it
   * along with everything else.
   */
  private applyStyles(): void {
    if (this.styles === '') {
      return
    }
    const sheet = document.createElement('style')
    sheet.textContent = this.styles
    this.append(sheet)
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-sandbox-preview': HelixSandboxPreview
  }
}
