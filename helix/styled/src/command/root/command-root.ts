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
 * The palette is a dialog holding a filterable listbox. This tier sets where
 * the dialog sits and how the list looks inside it. The dialog opens near the
 * top of the window, so the text field stays in place while the list grows and
 * shrinks as you type.
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
