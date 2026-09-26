import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessDialog } from '@fusion.dev/helix-headless/dialog'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './dialog-root.css.js'

/**
 * @summary A modal window built on the native `<dialog>` element.
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
 * @aliases Modal, Sheet
 * @documentation https://fusion.dev/helix/components/dialog
 *
 * @cssproperty --dialog-border-color - Color of the panel's edge.
 * @cssproperty --dialog-border-width - Width of the panel's edge. Follows
 *   `--helix-border-floating`, which is `0`, so the panel stands out by its shadow unless your
 *   theme sets a border.
 * @cssproperty --dialog-icon-size - How big the mark above the title is.
 * @cssproperty --dialog-inline-size - Width of the panel.
 * @cssproperty --dialog-padding - Padding inside the panel.
 * @cssproperty --dialog-rise - How far the panel rises as it opens. Follows
 *   `--helix-space-lg`.
 * @cssproperty --dialog-scrim - The tint over the page behind the dialog. Set it on the host, because a `var()` written inside `::backdrop` cannot read a token.
 * @cssproperty --dialog-shadow - Shadow under the panel. Follows `--helix-shadow-floating`. A
 *   floating surface can sit over any content, so it has a shadow by default.
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
   * region rather than a control in one, which is the other half of the axis's
   * domain: the rest of it is pictures, which are not controls either. Not
   * `appearance`, which says how a thing reads rather than how wide it is.
   */
  @property({ reflect: true })
  size?: 'sm' | 'md' | 'lg' | 'full'

  /**
   * Which way the panel's contents read.
   *
   * **Text alignment, and the name says so.** `Flex` and `Grid` ask the CSS
   * box-alignment question, where things sit in a container, and they are named
   * for the properties they mirror; this one is `text-align` on a panel of
   * prose, and `Table.Column` answers the same question under the same name.
   * One word for both questions is how a consumer who learned it on a layout
   * writes it here and gets no error, a value a component does not have leaving
   * the default in place and looking deliberate.
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
  @property({ attribute: 'text-align', reflect: true })
  textAlign?: 'center' | 'start'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-dialog': HelixDialog
  }
}
