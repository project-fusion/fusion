import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessToolbar } from '@fusion.dev/helix-headless/toolbar'
import type { CSSResultGroup } from 'lit'
import { styles } from './toolbar-root.css.js'

/**
 * @summary A group of controls that share one tab stop.
 *
 * @description
 * No chrome of its own: a toolbar is a place controls sit, and a border around
 * them would be a second frame inside whatever already frames the bar.
 *
 * @since 0.1.0
 * @status stable
 * @category layout
 * @aliases Actions, Action bar
 * @documentation https://fusion.dev/helix/components/toolbar
 *
 * @slot - The toolbar's controls.
 *
 * @csspart toolbar - The toolbar container.
 *
 * @cssproperty --toolbar-gap - The space between controls.
 */
@customElement('helix-toolbar')
export class HelixToolbar extends HelixHeadlessToolbar {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-toolbar': HelixToolbar
  }
}
