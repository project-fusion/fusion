import { customElement } from '@helix-io/core'
import { HelixBaseDrawer } from '@helix-io/headless/drawer'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './drawer-root.css.js'

/**
 * @summary A panel that slides in from an edge.
 *
 * @description
 * The panel translates and the scrim fades, both on transform and opacity only,
 * which is the one place motion is allowed to carry the work: the surface at
 * rest is flat and the movement is what says something happened.
 *
 * @since 0.1.0
 * @status experimental
 * @category overlays
 * @aliases Sheet, Sidebar, Panel, Off-canvas
 * @documentation https://helix.fusion.dev/components/drawer
 *
 * @slot - The drawer's content.
 * @slot header - Content pinned above the scrolling area.
 *
 * @csspart panel - The sliding panel.
 * @csspart header - The header region.
 * @csspart content - The scrolling content region.
 *
 * @event {HelixOpenEvent} helix-open - Fired when the drawer opens or closes.
 *
 * @cssproperty --drawer-backdrop - Filter applied behind a `material="glass"` drawer.
 *   Follows the theme's material policy; set it to override the strength on one drawer.
 * @cssproperty --drawer-background-color - Surface behind the panel.
 * @cssproperty --drawer-border-color - Color of the panel's edge.
 * @cssproperty --drawer-border-width - Width of the panel's edge. Follows
 *   `--helix-border-floating`, which is `0`, so the panel is told apart by its lift unless a
 *   theme says otherwise.
 * @cssproperty --drawer-inset - Padding inside the panel.
 * @cssproperty --drawer-inset-block-start - Padding above the content, which clears the close control.
 * @cssproperty --drawer-radii - Corner radius on the edges that face the page.
 * @cssproperty --drawer-scrim - The wash over the page behind the drawer. Set on the host, where a token still resolves: a `var()` written inside `::backdrop` cannot see one.
 * @cssproperty --drawer-shadow - Lift under the panel. Follows `--helix-shadow-floating`: a
 *   floating surface sits over content nobody can predict, so it keeps a lift by default.
 * @cssproperty --drawer-size - Width or height of the panel.
 */
@customElement('helix-drawer')
export class HelixDrawer extends HelixBaseDrawer {
  /**
   * Whether the panel is glass rather than opaque.
   *
   * **The same pair `Card` and `App Header` draw**, and one attribute for the
   * same reason: a backdrop filter behind an opaque ground filters nothing and a
   * translucent ground with no filter is a tint, so a consumer says what it
   * wants rather than assembling it out of two hooks.
   *
   * A drawer is the case where the pair earns the most, because there is already
   * something behind it worth seeing: the page it covers, under its own scrim.
   *
   * Absent is opaque, per the rule that a reflected property takes no default,
   * so the stylesheet only describes the departure.
   */
  @property({ reflect: true })
  material?: 'glass'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-drawer': HelixDrawer
  }
}
