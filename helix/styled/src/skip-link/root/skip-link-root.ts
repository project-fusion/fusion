import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessSkipLink } from '@fusion.dev/helix-headless/skip-link'
import type { CSSResultGroup } from 'lit'
import { styles } from './skip-link-root.css.js'

/**
 * @summary The first stop on a page, which moves the reader past everything
 * repeated on every page.
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
 * @status experimental
 * @category navigation
 * @documentation https://helix.fusion.dev/components/skip-link
 *
 * @cssproperty --skip-link-border-color - Color of the revealed link's edge.
 * @cssproperty --skip-link-border-width - Width of the revealed link's edge. Follows
 *   `--helix-border-floating`, which is `0`, so the link is told apart by its lift unless a
 *   theme says otherwise.
 * @cssproperty --skip-link-shadow - Lift under the revealed link. Follows
 *   `--helix-shadow-floating`, since it sits over whatever the page has at its corner.
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
