import { customElement } from '@helix-io/core'
import { HelixBaseToggleGroup } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles as fieldStyles } from '../../field/field.css.js'
import { styles as fieldStackedStyles } from '../../field/field-stacked.css.js'
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
 * @aliases SegmentedControl, Segmented, Navigation, Switcher
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
  /**
   * How the group separates itself from the page.
   *
   * **Classified by what it does rather than by what its values were called.**
   * These were `filled` and `plain` under `appearance`, and `filled` reads like
   * a fill weight, which is how it came to be listed as emphasis when the axes
   * were first sorted. The stylesheet settles it: what `plain` drops is the
   * background *and* the border, so this is where the group ends, not how much
   * ink it claims. `outlined` because the frame is a border over the group's
   * own ground, exactly as a Card's is; the track's sunken fill stays either
   * way, being a groove for the thumb to sit in rather than a way of being
   * seen.
   */
  @property({ reflect: true })
  separation?: 'outlined' | 'plain'

  static override styles: CSSResultGroup = [fieldStyles, fieldStackedStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-toggle-group': HelixToggleGroup
  }
}
