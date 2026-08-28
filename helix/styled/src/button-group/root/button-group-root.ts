import { customElement } from '@helix-io/core'
import { HelixHeadlessButtonGroup } from '@helix-io/headless/button-group'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './button-group-root.css.js'

/**
 * @summary Groups related buttons into one control.
 *
 * @description
 * The buttons are joined into a single shape: the outer corners keep their
 * radius, the inner ones lose it, and adjacent borders collapse into one line.
 *
 * That joining is in the base layer, paired with `data-button` the way the
 * button's own box is, because the corner belongs to the control inside each
 * button's shadow root and a rule in here cannot reach it. The same rule
 * therefore serves a consumer's own anchor styled as a button.
 *
 * @since 0.1.0
 * @status stable
 * @category actions
 * @aliases Segmented buttons, Split button
 * @documentation https://helix.fusion.dev/components/button-group
 *
 * @slot - The buttons in the group.
 *
 * @cssproperty --button-group-gap - Space between the buttons, when `spaced`.
 *
 * @property appearance - Whether the buttons are one bar or a spaced row.
 */
@customElement('helix-button-group')
export class HelixButtonGroup extends HelixHeadlessButtonGroup {
  static override styles: CSSResultGroup = styles

  /**
   * Whether the buttons are one bar or a spaced row.
   *
   * Joined by default, which is what a button group has always meant here: one
   * control made of parts, sharing borders, reading as a segmented bar.
   *
   * `spaced` is the same set with air between them, for a row of related but
   * separate actions. It exists because the semantics and the joining were one
   * thing and should not have been: `role="group"` and a shared name are what
   * make a set of buttons a set, and a consumer who wanted that *and* ordinary
   * spacing had to choose. `helix-flex` gives the spacing and no group; this
   * gave the group and no choice about the spacing.
   */
  @property({ reflect: true })
  variant?: 'joined' | 'spaced'
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-button-group': HelixButtonGroup
  }
}
