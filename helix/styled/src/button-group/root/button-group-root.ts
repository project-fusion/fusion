import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessButtonGroup } from '@fusion.dev/helix-headless/button-group'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './button-group-root.css.js'

/**
 * The button's own hooks a pressed button takes, each to the look this sheet
 * resolves on the group from the group's hooks.
 */
const PRESSED = [
  ['--button-background-color', 'var(--_button-group-pressed-background)'],
  ['--button-border-color', 'var(--_button-group-pressed-border)'],
  ['--button-foreground-color', 'var(--_button-group-pressed-foreground)'],
] as const

/**
 * @summary Groups related buttons into one control.
 *
 * @description
 * Joins the buttons into one shape: the outer corners keep their radius, the
 * inner corners lose it, and adjacent borders collapse into one line.
 *
 * A Helix button's corners are on the control inside its shadow root, where
 * this component's styles cannot reach, so the group flattens them through the
 * button's own `--button-radius-*` hooks. A native `<button>` and your own
 * anchor styled with `data-button` join through rules in the base layer,
 * because a page rule setting their radius would beat any rule in here.
 *
 * The buttons take their height from the region, so `size` makes every
 * button in the group smaller or larger together, as `data-density` on the
 * group does, and a button's own size still wins. A native `<button>` in a
 * sized group takes the height and the text size.
 *
 * With `selection-mode`, a pressed button takes the solid fill:
 * `--button-group-pressed-background-color` behind it and
 * `--button-group-pressed-color` for its words, set on the group or above it.
 *
 * @since 0.1.0
 * @status stable
 * @category actions
 * @aliases Segmented buttons, Split button, Toggle buttons
 * @documentation https://fusion.dev/helix/components/button-group
 *
 * @slot - The buttons in the group.
 *
 * @cssproperty --button-group-gap - Space between the buttons, when `spaced`.
 * @cssproperty --button-group-pressed-background-color - Fill behind a pressed button, in a selection mode. Defaults to the foreground color.
 * @cssproperty --button-group-pressed-border-color - Edge of a pressed button, in a selection mode. Defaults to its fill.
 * @cssproperty --button-group-pressed-color - Words and icons of a pressed button, in a selection mode. Defaults to the background color.
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

  /**
   * Draws a pressed button as well as saying so. On the control inside the
   * button, the only element that knows, and in the button's own hooks, so
   * hover and the focus ring stay the button's.
   */
  protected override markPressed(control: HTMLElement, pressed: boolean | undefined): void {
    super.markPressed(control, pressed)
    for (const [hook, value] of PRESSED) {
      if (pressed === true) {
        control.style.setProperty(hook, value)
      } else {
        control.style.removeProperty(hook)
      }
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-button-group': HelixButtonGroup
  }
}
