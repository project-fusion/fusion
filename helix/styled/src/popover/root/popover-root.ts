import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessPopover } from '@fusion.dev/helix-headless/popover'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './popover-root.generated.css.js'

/**
 * @summary A panel that opens next to its trigger and holds any content.
 *
 * @description
 * The styled tier draws a surface with an inset and a shadow and styles nothing
 * inside it. The panel sets its own inset, as `Dialog` and `Drawer` do, because
 * every use needed the same one.
 *
 * The panel animates in from the side it opened on. The host is in the
 * `placed-` state of the side the panel landed on, so the panel animates from
 * the trigger's side, including after it flips.
 *
 * @since 0.1.0
 * @status stable
 * @category overlays
 * @aliases Popper, Flyout, Overlay
 * @documentation https://fusion.dev/helix/components/popover
 *
 * @cssproperty --popover-arrow-size - Size of the point drawn with `arrow`. Tooltip's point is the same size.
 * @cssproperty --popover-backdrop - Filter applied behind a `frosted` or `glass` panel.
 *   Follows the theme's material policy.
 * @cssproperty --popover-background-color - Fill of the surface.
 * @cssproperty --popover-border-color - Color of the panel's edge.
 * @cssproperty --popover-border-width - Width of the panel's edge. Defaults to
 *   `--helix-border-floating`, a hairline, so the panel has an edge as well as its shadow over a dark page. Set it to `0` for the shadow alone.
 * @cssproperty --popover-inline-size - Width of the panel.
 * @cssproperty --popover-max-block-size - Maximum height of the panel before it scrolls.
 * @cssproperty --popover-padding - Space between the panel's edge and its contents.
 * @cssproperty --popover-shadow - Shadow under the panel. Defaults to
 *   `--helix-shadow-floating`, because the panel can sit over any content.
 */
@customElement('helix-popover')
export class HelixPopover extends HelixHeadlessPopover {
  /**
   * The panel's surface: `frosted` or `glass`.
   *
   * Absent is the opaque overlay surface. `glass` is the page's translucent
   * ground over a blur, for a page whose surfaces are glass, so a panel opened
   * over a glass window is not the one opaque slab on it. `frosted` is the same
   * pair turned up, a ground that admits less and a heavier blur.
   *
   * The strength is the theme's: `--helix-material-translucent`,
   * `--helix-material-translucent-strong` and `--helix-material-backdrop` are
   * what the policy moves. `Drawer` and `Tooltip` carry the same attribute.
   *
   * **No `transparent`, deliberately.** A panel floating over arbitrary page
   * content is only readable because it has a ground.
   */
  @property({ reflect: true })
  material?: 'frosted' | 'glass'

  /**
   * How the panel is set apart from the content under it.
   *
   * One of the axis's four values, which is all this surface has meaning for: a
   * floating panel keeps its lift by default, `ThemeIntent.separation.floating`
   * refusing `space` for the reason it refuses it everywhere, that a panel over
   * content nobody can predict has to be readable.
   *
   * Unset is a surface with an inset, which is what a panel of content wants.
   * `plain` removes the inset and keeps the surface, for a panel holding
   * something that brings its own, such as a list whose rows run to the edges.
   */
  @property({ reflect: true })
  separation?: 'plain'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-popover': HelixPopover
  }
}
