import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessDrawer } from '@fusion.dev/helix-headless/drawer'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './drawer-root.css.js'

/**
 * @summary A panel that slides in from an edge.
 *
 * @description
 * The panel slides and the scrim fades, animating only `transform` and
 * `opacity`. At rest the surface is flat, and the motion shows that the drawer
 * opened or closed.
 *
 * @since 0.1.0
 * @status stable
 * @category overlays
 * @aliases Sheet, Sidebar, Panel, Off-canvas
 * @documentation https://fusion.dev/helix/components/drawer
 *
 * @slot - The drawer's content.
 * @slot header - Content pinned above the scrolling area.
 *
 * @csspart content - The scrolling content region.
 * @csspart header - The header region.
 * @csspart panel - The sliding panel.
 *
 * @cssproperty --drawer-backdrop - Filter applied behind a `frosted` or `glass` drawer.
 *   Follows the theme's material policy. Set it to change the strength on one drawer.
 * @cssproperty --drawer-background-color - Surface behind the panel.
 * @cssproperty --drawer-border-color - Color of the panel's edge.
 * @cssproperty --drawer-border-width - Width of the panel's edge. Follows
 *   `--helix-border-floating`, which is `0`, so the panel stands out by its shadow unless your
 *   theme sets a border.
 * @cssproperty --drawer-padding - Padding inside the panel.
 * @cssproperty --drawer-padding-block-start - Padding above the header. It is one step larger than
 *   the other three sides, so the first line clears the window's edge. Falls back to
 *   `--drawer-padding`, so setting that alone sets all four sides.
 * @cssproperty --drawer-radius - Corner radius on the edges that face the page.
 * @cssproperty --drawer-scrim - The tint over the page behind the drawer. Set it on the host, because a `var()` written inside `::backdrop` cannot read a token.
 * @cssproperty --drawer-shadow - Shadow under the panel. Follows `--helix-shadow-floating`. A
 *   floating surface can sit over any content, so it has a shadow by default.
 * @cssproperty --drawer-size - Width or height of the panel.
 */
@customElement('helix-drawer')
export class HelixDrawer extends HelixHeadlessDrawer {
  /**
   * Makes the panel translucent, as `frosted` or `glass`. When it is not set,
   * the panel is opaque.
   *
   * **The same pair `Card` and `App Header` draw**, and one attribute for the
   * same reason: a backdrop filter behind an opaque ground filters nothing and a
   * translucent ground with no filter is a tint, so a consumer says what it
   * wants rather than assembling it out of two hooks.
   *
   * Absent is opaque, per the rule that a reflected property takes no default,
   * so the stylesheet only describes the departure.
   *
   * **No `transparent`, deliberately.** A panel floating over arbitrary page
   * content is only readable because it has a ground; dropping it makes an
   * unreadable drawer rather than a lighter one. `frosted` and `glass` are the
   * two honest points here.
   */
  @property({ reflect: true })
  material?: 'frosted' | 'glass'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-drawer': HelixDrawer
  }
}
