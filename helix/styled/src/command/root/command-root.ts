import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessCommand } from '@fusion.dev/helix-headless/command'
import type { CSSResultGroup } from 'lit'
import '../../dialog/index.js'
import '../../listbox/index.js'
import { styles } from './command-root.css.js'

/**
 * @summary A command palette: a list of commands that opens from anywhere on the page and filters as you type.
 *
 * @description
 * The palette is a dialog holding a filterable listbox, so what this tier adds
 * is where that dialog sits and how the list reads inside it. It opens against
 * the top of the window rather than centered, which is where every palette a
 * reader has used opens: a list that grows and shrinks as it is filtered would
 * otherwise walk up and down the screen under the words being typed.
 *
 * @since 0.1.0
 * @status stable
 * @category navigation
 * @documentation https://fusion.dev/helix/components/command
 *
 * @cssproperty --command-list-size - How tall the list grows before it scrolls.
 * @cssproperty --command-size - How wide the palette is. Defaults to `40rem`.
 */
@customElement('helix-command')
export class HelixCommand extends HelixHeadlessCommand {
  static override tier = 'helix-'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-command': HelixCommand
  }
}
