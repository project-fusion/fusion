import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessButtonGroup } from '@fusion.dev/helix-headless/button-group'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './button-group-root.css.js'

/**
 * @summary Groups related buttons into one control.
 *
 * @description
 * Joins the buttons into one shape: the outer corners keep their radius, the
 * inner corners lose it, and adjacent borders collapse into one line.
 *
 * The joining rule is in the base layer, paired with `data-button` like the
 * button's own box, because the corner is on the control inside each button's
 * shadow root, where this component's styles cannot reach. The same rule works
 * for your own anchor styled as a button.
 *
 * The buttons take their height from the region, so `size` makes every
 * button in the group smaller or larger together, as `data-density` on the
 * group does, and a button's own size still wins.
 *
 * @since 0.1.0
 * @status stable
 * @category actions
 * @aliases Segmented buttons, Split button
 * @documentation https://fusion.dev/helix/components/button-group
 *
 * @slot - The buttons in the group.
 *
 * @cssproperty --button-group-gap - Space between the buttons, when `spaced`.
 */
@customElement('helix-button-group')
export class HelixButtonGroup extends HelixHeadlessButtonGroup {
  static override styles: CSSResultGroup = styles

  /**
   * The size of every button in the group: their height, text, padding and
   * icons, from the density steps. Unset, the buttons take the size of the
   * region around the group.
   */
  @property({ reflect: true })
  size?: 'sm' | 'md' | 'lg'

  /**
   * Whether the buttons are one bar or a spaced row.
   *
   * Joined by default: one control made of parts, sharing borders, reading as a
   * segmented bar.
   *
   * `spaced` is the same set with air between them, for a row of related but
   * separate actions. The semantics and the joining are separate questions:
   * `role="group"` and a shared name are what make a set of buttons a set, and
   * `helix-flex` gives the spacing without the group.
   */
  @property({ reflect: true })
  variant?: 'joined' | 'spaced'
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-button-group': HelixButtonGroup
  }
}
