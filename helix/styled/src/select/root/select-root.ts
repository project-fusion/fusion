import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessSelect } from '@fusion.dev/helix-headless/select'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles as fieldStyles } from '../../shared/field/field.css.js'
import { styles as fieldStackedStyles } from '../../shared/field/field-stacked.css.js'
import { styles as floatingEntranceStyles } from '../../shared/floating/entrance.css.js'
import { styles as floatingPanelStyles } from '../../shared/floating/panel.css.js'
import { styles } from './select-root.css.js'
/* Without these, a consumer importing `@fusion.dev/helix/select` alone gets a
   select whose panel never upgrades. The suite hid it too, some other file
   happening to supply the registration, so it showed as a spec that passes
   together and fails alone. */
import '../../listbox/index.js'
import '../../option/index.js'

/**
 * @summary A control that opens a list of options to choose from.
 *
 * @description
 * The trigger uses the same frame as `Input`, so it lines up with the fields
 * beside it in a form. A trigger that looked like a button would read as an
 * action.
 *
 * The panel uses an overlay surface. Its shadow shows that it sits over the
 * page and sets it apart from the field it opened from.
 *
 * @since 0.1.0
 * @status stable
 * @category forms
 * @aliases Dropdown, Picker
 * @documentation https://fusion.dev/helix/components/select
 *
 * @cssproperty --select-border-color - Color of the panel's edge.
 * @cssproperty --select-border-width - Width of the panel's edge. Defaults to
 *   `--helix-border-floating`, which is `0`, so the panel stands out by its shadow unless
 *   your theme sets a width.
 * @cssproperty --select-shadow - Shadow under the panel. Defaults to
 *   `--helix-shadow-floating`, because the panel can sit over any content.
 * @cssproperty --select-surface-max-block-size - Maximum height of the panel.
 */
@customElement('helix-select')
export class HelixSelect extends HelixHeadlessSelect {
  static override tier = 'helix-'

  static override styles: CSSResultGroup = [
    fieldStyles,
    fieldStackedStyles,
    floatingPanelStyles,
    floatingEntranceStyles,
    styles,
  ]

  /**
   * How strongly the trigger is drawn. Leave it unset for a framed field, or
   * set `ghost` for a trigger with no fill or edge.
   *
   * **The first field in this library to take an axis, and the case that asked
   * for it is a control in a row rather than a control on a form.** A chat's
   * composer wants a model picker beside an attachment button and a send button:
   * at the field's own frame it is 40 pixels of bordered well in a line of 28
   * pixel glyphs, and it reads as the composer's subject rather than as one of
   * its tools. The same is true of a select in a toolbar, in a table header, or
   * inside a sentence.
   *
   * - Unset is the frame an `Input` wears, which is what a form wants: a control
   *   that looks like a button among fields reads as an action rather than an
   *   answer.
   * - `ghost` drops the fill and the edge, takes the width of what is in it, and
   *   puts the mark against the value instead of at the far end of the control.
   *
   * **`emphasis` and not `separation`, which the registry decides rather than
   * taste.** Emphasis is asked of controls, how loud this one is; separation is
   * asked of containers, where the surface ends. A trigger is a control, and a
   * family may not declare both. Three of the five values are refused: `solid`
   * and `subtle` are a button's way of being the one thing to press, which is
   * not a thing an answer should ever be, and `muted` is the quiet ink `Text`
   * takes, where a trigger's loudness is its frame rather than its ink.
   * `outlined` is what the unset frame already draws, so writing it would be
   * writing the resting state out.
   *
   * **Every field wearing `field-frame.css` wants this too and does not have it
   * yet**, which this trigger is not one of: it draws its own frame below. An
   * inline number input in a toolbar is as reasonable as an inline select. They
   * are left alone rather than swept, because each has a different thing inside
   * the frame and guessing at a set of them is how an axis ends up meaning four
   * things, which is the fault `appearance` was retired for.
   */
  @property({ reflect: true })
  emphasis?: 'ghost'
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-select': HelixSelect
  }
}
