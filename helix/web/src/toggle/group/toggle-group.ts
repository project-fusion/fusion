import { customElement } from '@helix-io/core'
import { HelixBaseToggleGroup } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './toggle-group.css.js'

/**
 * @summary A row of options with the selection marked by a moving indicator.
 *
 * @description
 * The indicator travels between items rather than the fill swapping. A fill
 * that appears on one item as it disappears from another is two changes at once
 * and reads as a flicker; one object moving is something the eye follows, and
 * it says where the selection came from as well as where it went.
 *
 * It animates `translate` and `inline-size`. Width is a layout property and the
 * rule is transform and opacity only, but the indicator is out of flow, so
 * animating its width reflows nothing else. Scaling instead would distort the
 * corner radius, which is worse than the exception.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases SegmentedControl, Segmented, NavBar, Switcher
 * @documentation https://helix.fusion.dev/components/toggle-group
 *
 * @slot - The group's items.
 *
 * @csspart indicator - The moving marker behind the selected item.
 *
 * @cssproperty --toggle-group-indicator-color - Fill of the moving marker.
 */
@customElement('helix-toggle-group')
export class HelixToggleGroup extends HelixBaseToggleGroup {
  /** How much chrome the group carries around its items. */
  @property({ reflect: true })
  appearance?: 'filled' | 'plain'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-toggle-group': HelixToggleGroup
  }
}
