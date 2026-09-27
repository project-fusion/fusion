import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessTourStop } from '@fusion.dev/helix-headless/tour'
import type { CSSResultGroup } from 'lit'
import { styles } from './tour-stop.css.js'
import '../../button/index.js'

/**
 * @summary One stop on a tour: the element it points at, and a panel of content about it.
 *
 * @description
 * The panel uses the same styles as `Popover`'s panel, with a surface, an
 * inset, and a shadow, so a stop matches a popover on the same page. The styled
 * tier adds the pointer toward the target, which no other Helix surface draws.
 *
 * @since 0.1.0
 * @status stable
 * @category overlays
 * @documentation https://fusion.dev/helix/components/tour
 *
 * @cssproperty --tour-arrow-size - The size of the arrow's box, before it is rotated.
 * @cssproperty --tour-border-width - The width of the panel's border. It follows
 *   `--helix-border-floating`, which is `0`, so the panel stands out by its
 *   shadow unless a theme sets a border.
 * @cssproperty --tour-bubble-size - The widest the panel can grow.
 * @cssproperty --tour-padding - The padding inside the panel.
 * @cssproperty --tour-shadow - The shadow under the panel. It follows
 *   `--helix-shadow-floating`. The panel can sit over any content, so it has a
 *   shadow by default.
 * @cssproperty --tour-surface-color - The color of the panel's surface.
 */
@customElement('helix-tour-stop')
export class HelixTourStop extends HelixHeadlessTourStop {
  static override tier = 'helix-'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-tour-stop': HelixTourStop
  }
}
