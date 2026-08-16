import { customElement } from '@helix-io/core'
import { HelixBaseDialog } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './dialog-root.css.js'

/**
 * @summary A modal window, on the platform's own dialog.
 *
 * @description
 * The panel is `surface-overlay` with a shadow, because that is what it is: a
 * thing over the page rather than on it. The scrim is drawn on `::backdrop`,
 * which is the platform's own element for it and sits in the top layer with the
 * dialog rather than being a div somebody positioned.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Modal, Lightbox, Sheet
 * @documentation https://helix.fusion.dev/components/dialog
 *
 * @property appearance - How wide the panel is allowed to be.
 *
 * @cssproperty --dialog-inline-size - Width of the panel.
 * @cssproperty --dialog-inset - Padding inside the panel.
 */
@customElement('helix-dialog')
export class HelixDialog extends HelixBaseDialog {
  /**
   * How wide the panel is allowed to be.
   *
   * Three steps rather than a number, because a dialog's width is a fact about
   * what is in it: a confirmation is narrow, a form is not, and picking pixels
   * per dialog is how a product ends up with nine of them.
   */
  @property({ reflect: true })
  appearance?: 'compact' | 'wide'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-dialog': HelixDialog
  }
}
