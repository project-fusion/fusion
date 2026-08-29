import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessDialog } from '@fusion.dev/helix-headless/dialog'
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
 * @status stable
 * @category overlays
 * @aliases Modal, Lightbox, Sheet
 * @documentation https://helix.fusion.dev/components/dialog
 *
 * @cssproperty --dialog-border-color - Color of the panel's edge.
 * @cssproperty --dialog-border-width - Width of the panel's edge. Follows
 *   `--helix-border-floating`, which is `0`, so the panel is told apart by its lift unless a
 *   theme says otherwise.
 * @cssproperty --dialog-icon-size - How big the mark above the title is.
 * @cssproperty --dialog-inline-size - Width of the panel.
 * @cssproperty --dialog-padding - Padding inside the panel.
 * @cssproperty --dialog-rise - How far the panel rises as it opens. Follows
 *   `--helix-space-lg`.
 * @cssproperty --dialog-scrim - The wash over the page behind the dialog. Set on the host, where a token still resolves: a `var()` written inside `::backdrop` cannot see one.
 * @cssproperty --dialog-shadow - Lift under the panel. Follows `--helix-shadow-floating`: a
 *   floating surface sits over content nobody can predict, so it keeps a lift by default.
 *
 * @property align - Whether the panel's contents run from the start or center on it.
 * @property size - How wide the panel is allowed to be.
 */
@customElement('helix-dialog')
export class HelixDialog extends HelixHeadlessDialog {
  /**
   * How wide the panel is allowed to be.
   *
   * Steps rather than a number, because a dialog's width is a fact about what is
   * in it: a confirmation is narrow, a form is not, and picking pixels per
   * dialog is how a product ends up with nine of them. `full` takes the viewport
   * less the same inset every step already stops short by, so a takeover is one
   * more rung and not a second property.
   *
   * Unset is `md`, read as `:host(:not([size]))` beside `:host([size="md"])`
   * rather than assigned here, for the reason `Drawer.placement` gives: this
   * reflects, and a default would put `size="md"` into markup no consumer wrote.
   *
   * `size` is right despite the rule that controls have no size, because that
   * rule's own test is whether two of them sitting together could legitimately
   * differ, and it is answering "a ragged row is unwritable". Two dialogs never
   * sit together. One is on screen at a time, in the top layer, and it is the
   * region rather than a control in one, which is the same reason `Avatar` and
   * `Spinner` keep theirs. Not `appearance`, which says how a thing reads
   * rather than how wide it is.
   */
  @property({ reflect: true })
  size?: 'sm' | 'md' | 'lg' | 'full'

  /**
   * Which way the panel's contents read.
   *
   * One property for the whole panel rather than one per region. The regions are
   * never mixed in practice: a dialog that asks a short question centers its
   * mark, its title, its sentence and its buttons together, and a dialog holding
   * a form runs all four from the start. Three properties would be three ways to
   * write the same two arrangements, and a fourth way to get one of them wrong.
   *
   * Unset is `start` and stays unset, so a reflected default cannot appear on a
   * host whose server output never had it.
   */
  @property({ reflect: true })
  align?: 'center' | 'start'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-dialog': HelixDialog
  }
}
