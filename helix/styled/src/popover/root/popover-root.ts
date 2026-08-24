import { customElement } from '@helix-io/core'
import { HelixHeadlessPopover } from '@helix-io/headless/popover'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './popover-root.css.js'

/**
 * @summary A panel that opens against a trigger and holds anything.
 *
 * @description
 * A surface with an inset and a shadow, and nothing about what goes in it. The
 * inset is the panel's rather than the consumer's, which is the same call
 * `Dialog` and `Drawer` make and for the same reason: everyone was writing it,
 * and everyone was writing the same one.
 *
 * It arrives from the side it opened on. `data-placement` is written by the
 * positioning, so the panel knows which way it flipped and can animate from the
 * trigger rather than from a fixed direction that would be backwards half the
 * time.
 *
 * @since 0.1.0
 * @status stable
 * @category overlays
 * @aliases Popper, Flyout, Overlay
 * @documentation https://helix.fusion.dev/components/popover
 *
 * @cssproperty --popover-border-color - Color of the panel's edge.
 * @cssproperty --popover-border-width - Width of the panel's edge. Follows
 *   `--helix-border-floating`, which is `0`, so the panel is told apart by its lift unless a
 *   theme says otherwise.
 * @cssproperty --popover-inline-size - Width of the panel.
 * @cssproperty --popover-inset - Space between the panel's edge and its contents.
 * @cssproperty --popover-max-block-size - Tallest the panel grows before it scrolls.
 * @cssproperty --popover-shadow - Lift under the panel. Follows `--helix-shadow-floating`: a
 *   floating surface sits over content nobody can predict, so it keeps a lift by default.
 */
@customElement('helix-popover')
export class HelixPopover extends HelixHeadlessPopover {
  /**
   * How the panel separates itself from what it floats over.
   *
   * One of the axis's four values, which is all this surface has meaning for: a
   * floating panel keeps its lift by default, `ThemeIntent.separation.floating`
   * refusing `space` for the reason it refuses it everywhere, that a panel over
   * content nobody can predict has to be readable.
   *
   * Unset is a surface with an inset, which is what a panel of content wants.
   * `plain` removes both, for a panel holding something that brings its own,
   * such as a list whose rows run to the edges.
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
