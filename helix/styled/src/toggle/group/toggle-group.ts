import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessToggleGroup } from '@fusion.dev/helix-headless/toggle'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles as fieldStyles } from '../../shared/field/field.css.js'
import { styles as fieldStackedStyles } from '../../shared/field/field-stacked.css.js'
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
 * @status stable
 * @aliases SegmentedControl, Segmented, Navigation, Switcher
 * @documentation https://fusion.dev/helix/components/toggle
 *
 * @slot - The group's items.
 * @slot end - Content after the track, on the same line, such as a count or a reset.
 * @slot start - Content before the track, on the same line, such as an icon or a caption.
 *
 * @csspart indicator - The moving marker behind the selected item.
 *
 * @cssproperty --toggle-group-indicator-color - The fill of the moving marker.
 */
@customElement('helix-toggle-group')
export class HelixToggleGroup extends HelixHeadlessToggleGroup {
  /**
   * How the group is set apart from the page.
   *
   * Separation rather than emphasis, because what `plain` drops is the
   * background *and* the border: the question is where the group ends, not how
   * much ink it claims. `outlined` because the frame is a border over the
   * group's own ground, exactly as a Card's is; the track's sunken fill stays
   * either way, being a groove for the thumb to sit in rather than a way of
   * being seen.
   *
   * **The track itself is not on this axis, and `Tabs` reaches the same one
   * from the other side.** There it is `variant="segmented"`, opted into,
   * because a row of tabs is a row until asked; here it is the resting state,
   * because a group of toggles is one control. Same groove, opposite polarity,
   * and what decides the polarity is which reading is ordinary for the family.
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
