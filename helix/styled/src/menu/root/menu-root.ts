import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessMenu } from '@fusion.dev/helix-headless/menu'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles as liveStyles } from '../../shared/live/live.css.js'
import { styles } from './menu-root.generated.css.js'

/**
 * @summary A menu of commands that opens from a trigger.
 *
 * @description
 * The surface is in the top layer, so it needs no `z-index` and its container
 * cannot clip it.
 *
 * A submenu replaces the current page, so the menu stays one panel and works
 * the same on a phone as on a desktop. In a window narrower than 30rem the
 * panel is a sheet along the window's bottom edge, over a scrim. A press on
 * the scrim closes the sheet and reaches nothing under it.
 *
 * @since 0.1.0
 * @status stable
 * @category overlays
 * @aliases Dropdown, Action menu
 * @documentation https://fusion.dev/helix/components/menu
 *
 * @cssproperty --menu-backdrop - Filter applied behind a `frosted` or `glass` panel.
 *   Follows the theme's material policy.
 * @cssproperty --menu-background-color - Fill of the surface.
 * @cssproperty --menu-bleed - How far a item's fill reaches past its words unless `bleed` is `none`. Defaults to `--helix-space-row-bleed`, which follows the density.
 * @cssproperty --menu-border-color - Color of the panel's edge.
 * @cssproperty --menu-border-width - Width of the panel's edge. Defaults to `--helix-border-floating`, a hairline, so the panel has an edge as well as its shadow over a dark page. Set it to `0` for the shadow alone.
 * @cssproperty --menu-max-block-size - The tallest the menu grows before it scrolls.
 * @cssproperty --menu-min-inline-size - The narrowest the menu gets.
 * @cssproperty --menu-scrim - Color of the scrim behind the panel while it is a sheet.
 * @cssproperty --menu-shadow - Shadow under the panel. Defaults to `--helix-shadow-floating`, so the panel keeps a shadow over any content below it.
 */
@customElement('helix-menu')
export class HelixMenu extends HelixHeadlessMenu {
  /**
   * Whether a highlighted row is drawn as a fill inset from the panel's edge.
   *
   * By default the words stay on the column the section headings are set on,
   * and the fill reaches `--menu-bleed` past them on each side, rounded, rather than
   * running across the panel edge to edge. `none` draws the band edge to edge,
   * as before.
   */
  @property({ reflect: true })
  bleed?: 'none'

  /**
   * The panel's surface: `frosted` or `glass`.
   *
   * Absent is the opaque overlay surface. `glass` is the page's translucent
   * ground over a blur, for a page whose surfaces are glass, so a panel opened
   * over a glass window is not the one opaque slab on it. `frosted` is the same
   * pair turned up, a ground that admits less and a heavier blur.
   *
   * The strength is the theme's: `--helix-material-panel` for `glass`,
   * `--helix-material-translucent-strong` for `frosted`, and
   * `--helix-material-backdrop` are what the policy moves. `Drawer` and `Tooltip` carry the same attribute.
   *
   * **No `transparent`, deliberately.** A panel floating over arbitrary page
   * content is only readable because it has a ground.
   */
  @property({ reflect: true })
  material?: 'frosted' | 'glass'

  static override styles: CSSResultGroup = [liveStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-menu': HelixMenu
  }
}
