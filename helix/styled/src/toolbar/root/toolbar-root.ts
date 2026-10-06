import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessToolbar } from '@fusion.dev/helix-headless/toolbar'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './toolbar-root.css.js'

/**
 * @summary A group of controls that share one tab stop.
 *
 * @description
 * The toolbar draws no frame of its own, so it does not add a second frame
 * inside whatever already frames the bar.
 *
 * Its controls are the small size, since a toolbar is dense by nature, and a
 * control added later takes it without being told. `size="md"` or `"lg"`
 * makes every control in it larger together.
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
 * @cssproperty --toolbar-align - How the controls line up across the toolbar's axis. Centered unless set; `stretch` makes a vertical toolbar's controls as wide as it is.
 * @cssproperty --toolbar-background-color - The fill behind the controls. Transparent unless set.
 * @cssproperty --toolbar-border-color - The color of the toolbar's edge, once it has a width.
 * @cssproperty --toolbar-border-width - The width of the toolbar's edge. None unless set.
 * @cssproperty --toolbar-gap - The space between controls.
 * @cssproperty --toolbar-padding - The space between the toolbar's edge and its controls.
 * @cssproperty --toolbar-radius - The corner radius of the toolbar's fill.
 * @cssproperty --toolbar-separator-gap - Extra space either side of a `Divider` between controls, along the toolbar's axis. None unless set.
 */
@customElement('helix-toolbar')
export class HelixToolbar extends HelixHeadlessToolbar {
  static override styles: CSSResultGroup = styles

  /**
   * The size of every control in the toolbar: their height, icons, boxes and
   * tags. Unset is the small size, as a toolbar is dense by nature.
   */
  @property({ reflect: true })
  size?: 'sm' | 'md' | 'lg'
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-toolbar': HelixToolbar
  }
}
