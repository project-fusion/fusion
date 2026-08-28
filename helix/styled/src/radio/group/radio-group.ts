import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessRadioGroup } from '@fusion.dev/helix-headless/radio'
import type { CSSResultGroup } from 'lit'
import { styles as fieldStyles } from '../../shared/field/field.css.js'
import { styles as fieldStackedStyles } from '../../shared/field/field-stacked.css.js'
import { styles } from './radio-group.css.js'

/**
 * @summary A set of choices where exactly one is the answer.
 *
 * @description
 * The field's three parts, laid out the way every other field lays them out: a
 * question over the set, and one line under it that is help until something is
 * wrong. `orientation` lays out the choices and not the field, so a horizontal
 * group keeps its question above the row rather than beside the first choice.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases RadioButtons, Choice group
 * @documentation https://helix.fusion.dev/components/radio-group
 *
 * @cssproperty --radio-group-gap - Space between the choices.
 */
@customElement('helix-radio-group')
export class HelixRadioGroup extends HelixHeadlessRadioGroup {
  static override styles: CSSResultGroup = [fieldStyles, fieldStackedStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-radio-group': HelixRadioGroup
  }
}
