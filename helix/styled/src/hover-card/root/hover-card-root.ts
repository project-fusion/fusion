import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessHoverCard } from '@fusion.dev/helix-headless/hover-card'
import type { CSSResultGroup } from 'lit'
import { styles } from './hover-card-root.css.js'

/**
 * @summary A card that opens beside a link while the pointer rests on it or focus is on it, such as a preview of a person or a page.
 *
 * @description
 * A floating panel on the overlay surface, as `Popover`'s is, with room inside
 * for a short preview: a picture, a name, a line or two, and a link or a
 * button. It rises a little out of the edge it opens against, and fades in
 * place under reduced motion.
 *
 * @since 0.241.0
 * @status experimental
 * @category overlays
 * @use A preview of a person or a page that opens from a link while the pointer rests on it.
 * @instead tooltip - A short text that names a control.
 * @instead popover - Content that opens on a press, such as a short form.
 * @practice Put nothing in the card that you can reach only there. - A touch screen has no hover, so it follows the link without opening the card.
 * @practice Place the card right after the link that `for` names. - The next Tab from the link goes into the card, whose content follows the link in the page's order.
 * @documentation https://fusion.dev/design/components/hover-card
 *
 * @cssproperty --hover-card-background-color - The card's fill. Defaults to the floating overlay surface.
 * @cssproperty --hover-card-inline-size - The card's width. Defaults to 20rem, and never wider than the window.
 * @cssproperty --hover-card-padding - The space inside the card. Defaults to `--helix-space-md`.
 * @cssproperty --hover-card-shadow - The shadow that lifts the card over the page. Defaults to `--helix-shadow-floating`.
 */
@customElement('helix-hover-card')
export class HelixHoverCard extends HelixHeadlessHoverCard {
  static override tier = 'helix-'

  static override styles: CSSResultGroup = [super.styles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-hover-card': HelixHoverCard
  }
}
