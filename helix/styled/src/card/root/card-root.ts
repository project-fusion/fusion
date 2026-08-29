import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessCard } from '@fusion.dev/helix-headless/card'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './card-root.css.js'

/**
 * @summary Groups related content and actions into a single surface.
 *
 * @description
 * Regions are bare slots with no wrapper element: `media`, `header`, the default
 * slot for content, and `footer`. An omitted one occupies no space without the
 * card having to detect that it is missing, so a card with only content needs no
 * wrapper markup at all. Style slotted content directly rather than reaching for
 * a part: a header is whatever element you slotted, not a wrapper around it.
 *
 * `media` runs edge to edge and clips to the card's corners, so an image needs
 * no inset correction. Set `orientation="horizontal"` to move it alongside the
 * header, content, and footer stack rather than above it, or
 * `media-placement="end"` to put it under the content instead of over it, which
 * is what a chart concluding a card wants.
 *
 * @since 0.1.0
 * @status stable
 * @category layout
 * @aliases Panel, Surface
 * @documentation https://helix.fusion.dev/components/card
 *
 * @slot - The card's main content.
 * @slot footer - Actions that conclude the card.
 * @slot header - Title and any actions for the whole card.
 * @slot media - Image, video, or chart that runs edge to edge, outside the inset.
 *
 * @cssproperty --card-align - How the regions pack when the card is stretched
 *   taller than its content. `start` by default, so the slack is at the bottom;
 *   `space-between` puts a footer on the floor.
 * @cssproperty --card-backdrop - Filter applied behind a `frosted` or `glass` card. Follows
 *   the theme's material policy; set it to override the strength on one card.
 * @cssproperty --card-background-color - Surface behind the card.
 * @cssproperty --card-border-color - Border color of the surface.
 * @cssproperty --card-border-width - Width of the surface's edge. Follows
 *   `--helix-border-surface`, a hairline, so the surface is told apart by its edge unless a
 *   theme says otherwise.
 * @cssproperty --card-media-block-size - Height of the media region. Defaults to
 *   `auto`, which is an image's own shape and is not a height a chart has.
 * @cssproperty --card-media-size - Width of the media column when horizontal.
 * @cssproperty --card-padding - Inset applied to each region.
 * @cssproperty --card-radius - Corner radius of the surface.
 * @cssproperty --card-shadow - Shadow under the surface. What `elevated` sets, and what a
 *   `data-card` link raises on hover.
 */
@customElement('helix-card')
export class HelixCard extends HelixHeadlessCard {
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

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-card': HelixCard
  }
}
