import { customElement } from '@helix-io/core'
import { HelixBaseCommand } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
/* Side-effect imports: this renders both, and a custom element registers on
   import, so a consumer importing this family alone would otherwise get two
   inert unknown elements. */
import '../../dialog/index.js'
import '../../listbox/index.js'
import { styles } from './command-root.css.js'

/**
 * @summary A list of commands, opened from anywhere and filtered by typing.
 *
 * @description
 * The palette is a dialog holding a filterable listbox, so what this tier adds
 * is where that dialog sits and how the list reads inside it. It opens against
 * the top of the window rather than centred, which is where every palette a
 * reader has used opens: a list that grows and shrinks as it is filtered would
 * otherwise walk up and down the screen under the words being typed.
 *
 * @since 0.1.0
 * @status experimental
 * @category navigation
 * @documentation https://helix.fusion.dev/components/command
 *
 * @cssproperty --command-size - How wide the palette is. Defaults to `40rem`.
 * @cssproperty --command-list-size - How tall the list grows before it scrolls.
 */
@customElement('helix-command')
export class HelixCommand extends HelixBaseCommand {
  static override tier = 'helix-'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-command': HelixCommand
  }
}
