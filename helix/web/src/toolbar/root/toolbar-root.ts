import { customElement } from '@helix-io/core'
import { HelixBaseToolbar } from '@helix-io/headless'
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
 * @status experimental
 * @category layout
 * @aliases Actions, Action bar
 * @documentation https://helix.fusion.dev/components/toolbar
 *
 * @slot - The toolbar's controls.
 *
 * @csspart toolbar - The toolbar container.
 *
 * @cssproperty --toolbar-gap - Space between controls.
 */
@customElement('helix-toolbar')
export class HelixToolbar extends HelixBaseToolbar {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-toolbar': HelixToolbar
  }
}
