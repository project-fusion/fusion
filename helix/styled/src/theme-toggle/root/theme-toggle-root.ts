import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessThemeToggle } from '@fusion.dev/helix-headless/theme-toggle'
import type { CSSResultGroup } from 'lit'
import { styles } from './theme-toggle-root.css.js'

/**
 * @summary A button that switches the page between light and dark, with the new mode spreading from the button.
 *
 * @description
 * A quiet square button on the floating surface, as `Motion Toggle` is, with
 * the moon while the page is light and the sun while it is dark. Text slotted
 * into it stands beside the icon.
 *
 * @since 0.241.0
 * @status experimental
 * @category actions
 * @use A control in the page's header that switches the page between light and dark.
 * @instead toggle - A choice among light, dark, and the system setting.
 * @instead switch - A color mode setting among the other settings of a form.
 * @instead motion-toggle - A press that pauses the motion on the page.
 * @anatomy button
 * @anatomy icon
 * @practice Listen for the change event, and write the mode into the next page you serve. - The button sets the mode on the page in front of you, and the next page starts from its own markup.
 * @documentation https://fusion.dev/design/components/theme-toggle
 *
 * @cssproperty --theme-toggle-background-color - The button's fill. Defaults to the floating overlay surface.
 */
@customElement('helix-theme-toggle')
export class HelixThemeToggle extends HelixHeadlessThemeToggle {
  static override tier = 'helix-'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-theme-toggle': HelixThemeToggle
  }
}
