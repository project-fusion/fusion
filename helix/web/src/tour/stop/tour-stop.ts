import { customElement } from '@helix-io/core'
import { HelixBaseTourStop } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { styles } from './tour-stop.css.js'
import '../../button/index.js'

/**
 * @summary One stop on a tour: what it points at, and a panel to say it in.
 *
 * @description
 * The styled tier of `BaseTourStop`. The panel is `Popover`'s panel by another
 * name, on purpose.
 *
 * @since 0.1.0
 * @status experimental
 * @category overlays
 * @documentation https://helix.fusion.dev/components/tour
 *
 * @cssproperty --tour-arrow-size - The point's box, before it is rotated.
 * @cssproperty --tour-border-width - Width of the panel's edge. Follows
 *   `--helix-border-floating`, which is `0`, so the panel is told apart by its lift unless a
 *   theme says otherwise.
 * @cssproperty --tour-bubble-size - How wide the panel may grow.
 * @cssproperty --tour-padding - Inset inside the panel.
 * @cssproperty --tour-shadow - Lift under the panel. Follows `--helix-shadow-floating`: a
 *   floating surface sits over content nobody can predict, so it keeps a lift by default.
 * @cssproperty --tour-surface-color - The panel's own surface.
 */
@customElement('helix-tour-stop')
export class HelixTourStop extends HelixBaseTourStop {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-tour-stop': HelixTourStop
  }
}
