import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessOutline } from '@fusion.dev/helix-headless/outline'
import type { CSSResultGroup } from 'lit'
import { styles } from './outline-root.css.js'

/**
 * @summary Links to the headings on the page, with the section in view marked.
 *
 * @description
 * A rule runs down the leading edge, and the current section is highlighted
 * along it.
 *
 * Set nesting with `data-level` on each link, using the heading levels: `2`
 * through `6` each add one step of `--outline-indent`, and a link without
 * `data-level` is at the top level. The outline does not read heading levels
 * from the document, because the headings are not always in the document.
 *
 * Links in a nested `<ul>` take their indentation from your own stylesheet:
 * the outline's styles reach the elements slotted into it and nothing inside
 * them. Write the links flat with `data-level` for the indentation drawn here,
 * and screen readers still hear them as nested lists.
 *
 * A heading slotted into `heading` is set above the links, lined up with them.
 *
 * @since 0.1.0
 * @status stable
 * @category navigation
 * @aliases Table of contents, On this page, Outline
 * @documentation https://fusion.dev/helix/components/outline
 *
 * @cssproperty --outline-indent - How far each level is inset from the one above.
 * @cssproperty --outline-rail - The width of the gutter that holds the line and the moving mark.
 */
@customElement('helix-outline')
export class HelixOutline extends HelixHeadlessOutline {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-outline': HelixOutline
  }
}
