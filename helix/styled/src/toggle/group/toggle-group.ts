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
 * The indicator moves between items, so a change of selection is one moving
 * object the eye can follow.
 *
 * It animates `translate` and `inline-size`. Animating width is an exception to
 * the transform and opacity rule, and it is safe because the indicator is out
 * of flow and its width reflows nothing else. Scaling would distort the corner
 * radius.
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
