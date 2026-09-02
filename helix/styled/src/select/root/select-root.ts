import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessSelect } from '@fusion.dev/helix-headless/select'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles as fieldStyles } from '../../shared/field/field.css.js'
import { styles as fieldStackedStyles } from '../../shared/field/field-stacked.css.js'
import { styles } from './select-root.css.js'
/* Without these, a consumer importing `@fusion.dev/helix/select` alone gets a
   select whose panel never upgrades. The suite hid it too, some other file
   happening to supply the registration, so it showed as a spec that passes
   together and fails alone. */
import '../../listbox/index.js'
import '../../option/index.js'

/**
 * @summary A closed list that opens to be chosen from.
 *
 * @description
 * The trigger wears the same frame as an `Input`, because in a form it stands
 * in a row with them and a control that looks like a button among fields reads
 * as an action rather than an answer.
 *
 * The panel is an overlay surface rather than a sunken one: it sits over the
 * page instead of on it, which is what its shadow says and what tells it apart
 * from the field it came out of.
 *
 * @since 0.1.0
 * @status experimental
 * @category forms
 * @aliases Dropdown, Picker
 * @documentation https://helix.fusion.dev/components/select
 *
 * @cssproperty --select-border-color - Color of the panel's edge.
 * @cssproperty --select-border-width - Width of the panel's edge. Follows
 *   `--helix-border-floating`, which is `0`, so the panel is told apart by its lift unless a
 *   theme says otherwise.
 * @cssproperty --select-shadow - Lift under the panel. Follows `--helix-shadow-floating`: a
 *   floating surface sits over content nobody can predict, so it keeps a lift by default.
 * @cssproperty --select-surface-max-block-size - How tall the panel gets.
 */
@customElement('helix-select')
export class HelixSelect extends HelixHeadlessSelect {
  static override tier = 'helix-'

  static override styles: CSSResultGroup = [fieldStyles, fieldStackedStyles, styles]

  /**
   * How much ink the trigger claims.
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
   * family may not declare both. Two of the four values are refused: `solid` and
   * `subtle` are a button's way of being the one thing to press, which is not a
   * thing an answer should ever be.
   *
   * **The other three fields want this too and do not have it yet.** `Input`,
   * `Textarea` and `Combobox` wear the same frame from the same shared
   * stylesheet, and an inline one of each is as reasonable as an inline select.
   * They are left alone rather than swept, because each has a different thing
   * inside the frame and guessing at three is how an axis ends up meaning four
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
