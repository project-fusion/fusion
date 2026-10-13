import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessCommand } from '@fusion.dev/helix-headless/command'
import type { CSSResultGroup, PropertyValues } from 'lit'
import { property } from 'lit/decorators.js'
import '../../dialog/index.js'
import '../../listbox/index.js'
import '../../option/index.js'
import { styles as liveStyles } from '../../shared/live/live.css.js'
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
 * @cssproperty --command-radius - The corners of the palette's panel. Defaults to the dialog's.
 * @cssproperty --command-size - How wide the palette is. Defaults to `40rem`.
 */
@customElement('helix-command')
export class HelixCommand extends HelixHeadlessCommand {
  static override tier = 'helix-'

  /**
   * The panel's surface: `frosted` or `glass`, as on `Dialog`, which the
   * palette opens in and hands the value to.
   *
   * Absent is the opaque overlay surface. `glass` is the page's translucent
   * ground over the theme's blur, and `frosted` the same pair turned up, so a
   * page whose panels are frosted has a palette that matches. Its strength is
   * the theme's, as on `Popover`, `Menu` and `Drawer`.
   *
   * **No `transparent`, deliberately.** A palette over arbitrary page content
   * is only readable because it has a ground.
   */
  @property({ reflect: true })
  material?: 'frosted' | 'glass'

  static override styles: CSSResultGroup = [liveStyles, styles]

  protected override updated(changed: PropertyValues): void {
    super.updated?.(changed)
    // The dialog is rendered by the headless tier, which knows no material, so
    // the value is handed to it here.
    const dialog = this.renderRoot.querySelector<HTMLElement & { material?: string }>(
      'helix-dialog',
    )
    if (dialog && dialog.material !== this.material) {
      if (this.material === undefined) {
        dialog.removeAttribute('material')
      } else {
        dialog.material = this.material
      }
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-command': HelixCommand
  }
}
