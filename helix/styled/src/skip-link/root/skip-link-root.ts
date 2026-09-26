import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessSkipLink } from '@fusion.dev/helix-headless/skip-link'
import type { CSSResultGroup } from 'lit'
import { styles } from './skip-link-root.css.js'

/**
 * @summary A link at the start of a page that moves keyboard focus past the
 * header to the main content.
 *
 * @description
 * Out of sight until the keyboard reaches it, then in the corner of the
 * viewport and impossible to miss. The hiding is the base layer's visually
 * hidden helper, so the link stays in the tab order and in the accessibility
 * tree while nobody can see it; `display: none` would have taken it out of
 * both. The reveal is this sheet's.
 *
 * **Fixed to the viewport rather than placed where it sits in the document**,
 * because it is first in the document and the page may already be scrolled
 * when focus arrives, by a restored position or an anchor in the address. A
 * link revealed above the top of the screen is revealed to nobody.
 *
 * Put it first inside `<body>`, before the header, and give the content
 * region the id its `href` names.
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
