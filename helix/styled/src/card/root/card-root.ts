import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessCard } from '@fusion.dev/helix-headless/card'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './card-root.css.js'

/**
 * @summary Groups related content and actions into a single surface.
 *
 * @description
 * The regions are the `media`, `header`, and `footer` slots and the default
 * slot for content. None of them has a wrapper element. A region you leave out
 * takes no space, so a card with only content needs no extra markup. Style
 * slotted content directly: a header is the element you slotted, so there is no
 * part to target.
 *
 * `header-actions` and `footer-actions` put controls at the end of the header's
 * and the footer's line; the footer then moves to the start of its line. Put a
 * header of more than one element in one wrapper, since the header and its
 * actions share a line.
 *
 * `media` runs edge to edge and clips to the card's corners, so an image needs
 * no inset. Set `orientation="horizontal"` to put the media beside the header,
 * content, and footer. Set `media-placement="end"` to put it below the content,
 * for example for a chart that ends a card.
 *
 * @since 0.1.0
 * @status stable
 * @category layout
 * @aliases Panel, Surface
 * @documentation https://fusion.dev/helix/components/card
 *
 * @slot - The card's main content.
 * @slot footer - Actions that conclude the card.
 * @slot footer-actions - Controls at the end of the footer's line, with the footer at its start.
 * @slot header - Title and any actions for the whole card.
 * @slot header-actions - Controls for the whole card at the end of the header's line, such as a menu.
 * @slot media - Image, video, or chart that runs edge to edge, outside the inset.
 *
 * @csspart footer-row - The line holding `footer` and `footer-actions`, drawn only while `footer-actions` holds something.
 * @csspart header-row - The line holding `header` and `header-actions`, drawn only while `header-actions` holds something.
 *
 * @cssproperty --card-align - How the regions pack when the card is stretched
 *   taller than its content. `start` by default, so the slack is at the bottom;
 *   `space-between` puts a footer on the floor.
 * @cssproperty --card-backdrop - Filter applied behind a `frosted` or `glass` card. Follows
 *   the theme's material policy; set it to override the strength on one card.
 * @cssproperty --card-background-color - Surface behind the card.
 * @cssproperty --card-border-color - Border color of the surface.
 * @cssproperty --card-border-width - Width of the surface's edge. Follows
 *   `--helix-border-surface`, which is a hairline unless your theme sets another width.
 *   The edge is what sets the surface apart.
 * @cssproperty --card-gap - Space between the regions, and between a header or footer and its actions.
 * @cssproperty --card-media-block-size - Height of the media region. Defaults to
 *   `auto`, which follows an image's own proportions. A chart has no height of its own,
 *   so set one here for a chart.
 * @cssproperty --card-media-size - Width of the media column when horizontal.
 * @cssproperty --card-padding - Inset applied to each region.
 * @cssproperty --card-radius - Corner radius of the surface.
 * @cssproperty --card-shadow - Shadow under the surface. `elevated` sets it, and a
 *   `data-card` link raises it on hover.
 */
@customElement('helix-card')
export class HelixCard extends HelixHeadlessCard {
  /**
   * What the card is made of.
   *
   * **A third axis, and it passes the test the other two answer to.**
   * `separation` is where the surface ends and `tone` is what it means; both of
   * those can be true at once with this, an elevated glass card being a
   * perfectly ordinary thing to want, so it is not a value of either.
   *
   * **An attribute rather than a hook, because glass is not one declaration.**
   * It is a translucent ground *and* a backdrop filter, and either without the
   * other does nothing: a blur behind an opaque background is invisible, and a
   * translucent card over an unfiltered page is a smear. `--card-backdrop` on
   * its own is that trap, a published hook a consumer could set and see nothing
   * happen. The component owns the pair; a theme owns how strong it is.
   *
   * Absent is opaque, per the rule that a reflected property takes no default,
   * so the stylesheet only describes the departure.
   *
   * **The whole axis, not one point of it.** `frosted` is the same pair turned
   * up, the heavier ground under the heavier blur, for a card that has to stay
   * readable over a busy page; `transparent` drops both, for one that is
   * structure and spacing with the page showing through.
   */
  @property({ reflect: true })
  material?: 'frosted' | 'glass' | 'transparent'

  /**
   * Whether media sits above the content stack or beside it.
   */
  @property({ reflect: true })
  orientation?: 'vertical' | 'horizontal'

  /**
   * How the card separates itself from the page.
   *
   * **One value per mechanism, and the theme has the same four.**
   * `ThemeIntent.separation` is `border | fill | shadow | space`, so these are
   * the component's words for what a theme states as a policy, one to one.
   *
   * - `outlined` is the default, and a hairline is usually enough. It costs
   *   less attention than a shadow: a screen of shadowed cards reads as a stack
   *   of things floating, none of them settled.
   * - `elevated` is lifted off the page instead of framed, for a card on a
   *   colored or busy background, where a line has to compete with whatever is
   *   behind it and a shadow does not.
   * - `filled` is told apart by its own color, with neither edge nor lift. For
   *   a dense surface where a border on every card is a grid of lines, and for
   *   a theme whose `separation` policy is `fill`, which pushes the surface
   *   ladder away from the page precisely so this reads.
   * - `plain` has no frame at all: the card is a layout and whatever it sits in
   *   is the surface. For a card inside something already bounded, where a
   *   second box adds a line and no meaning.
   *
   * `filled` closes a hole `plain` cannot: `plain` clears the ground *and* the
   * edge, so a surface with its own color and neither edge nor lift would
   * otherwise be unsayable while being one of the four things a theme can ask
   * for.
   */
  @property({ reflect: true })
  separation?: 'elevated' | 'filled' | 'outlined' | 'plain'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-card': HelixCard
  }
}
