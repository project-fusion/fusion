import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessOutline } from '@fusion.dev/helix-headless/outline'
import type { CSSResultGroup } from 'lit'
import { styles } from './outline-root.generated.css.js'

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
 * Links in a nested `<ul>` are styled by `helix.css`, since the outline's own
 * styles reach the elements slotted into it and nothing inside them: the lists
 * lose their bullets, each inner list is inset by `--outline-indent`, and the
 * links read the same hooks as flat ones. Those rules have no specificity, so
 * any rule of yours wins. Screen readers hear the levels either way.
 *
 * A heading slotted into `heading` is set above the links, lined up with them.
 *
 * **The rail.** With `marker="rail"` the outline is a slim column of ticks,
 * one per section, at the edge of a long scroll. The section in view is a longer
 * tick in the primary color, and a deeper level is a shorter one. Hovering or
 * focusing the rail opens a frosted surface of the titles, as Popover's frosted
 * material is drawn, each on one line with the current one lit. Escape,
 * the pointer leaving and focus leaving close it.
 *
 * @since 0.1.0
 * @status stable
 * @category navigation
 * @aliases Table of contents, On this page, Outline
 * @documentation https://fusion.dev/helix/components/outline
 *
 * @cssproperty --outline-heading-color - The color of the heading in the `heading` slot.
 * @cssproperty --outline-indent - How far each level is inset from the one above.
 * @cssproperty --outline-indicator-color - The color of the mark that moves to the section in view.
 * @cssproperty --outline-link-color - The color of a link.
 * @cssproperty --outline-link-current-color - The color of the link to the section in view.
 * @cssproperty --outline-link-current-weight - The weight of the link to the section in view.
 * @cssproperty --outline-link-font-size - The size of a link's text.
 * @cssproperty --outline-link-hover-background-color - The fill behind a link under the pointer.
 * @cssproperty --outline-link-hover-color - The color of a link under the pointer.
 * @cssproperty --outline-link-padding-block - The space above and below a link's text.
 * @cssproperty --outline-link-padding-inline - The space either side of a link's text, before any indent.
 * @cssproperty --outline-link-radius - The corner radius of a link's hover fill.
 * @cssproperty --outline-rail - The width of the gutter that holds the line and the moving mark.
 * @cssproperty --outline-rule-color - The color of the line down the leading edge.
 * @cssproperty --outline-surface-backdrop - The backdrop filter of that surface, which blurs what is behind it.
 * @cssproperty --outline-surface-background-color - The fill of the surface the rail opens into.
 * @cssproperty --outline-surface-max-inline-size - The widest the surface grows before a title is cut with an ellipsis.
 * @cssproperty --outline-tick-color - The color of a tick in the rail.
 * @cssproperty --outline-tick-current-color - The color of the tick of the section in view.
 * @cssproperty --outline-tick-gap - The space between ticks.
 * @cssproperty --outline-tick-length - The length of a top-level tick, from which deeper levels are shortened and the current one lengthened.
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
