import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessSkipLink } from '@fusion.dev/helix-headless/skip-link'
import type { CSSResultGroup } from 'lit'
import { styles } from './skip-link-root.css.js'

/**
 * @summary A link at the start of a page that moves keyboard focus past the
 * header to the main content.
 *
 * @description
 * Hidden until it receives keyboard focus, then shown in the corner of the
 * viewport. It is hidden with the base layer's visually hidden helper, so it
 * stays in the tab order and the accessibility tree. This stylesheet adds the
 * reveal.
 *
 * It is fixed to the viewport, because the page may already be scrolled when
 * focus arrives, from a restored position or an anchor in the address.
 *
 * Put it first inside `<body>`, before the header, and give the content region
 * the id its `href` names.
 *
 * @since 0.1.0
 * @status stable
 * @category navigation
 * @aliases Skip navigation, Skip to content
 * @documentation https://fusion.dev/helix/components/skip-link
 *
 * @cssproperty --skip-link-border-color - The border color of the link while it is shown.
 * @cssproperty --skip-link-border-width - The border width of the link while it is shown. Follows
 *   `--helix-border-floating`, which is `0`, so the link is set apart by its shadow unless a
 *   theme sets a border.
 * @cssproperty --skip-link-shadow - The shadow under the link while it is shown. Follows
 *   `--helix-shadow-floating`, because the link sits over the corner of the page.
 */
@customElement('helix-skip-link')
export class HelixSkipLink extends HelixHeadlessSkipLink {
  static override tier = 'helix-'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-skip-link': HelixSkipLink
  }
}
