import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessRadioGroup } from '@fusion.dev/helix-headless/radio'
import type { CSSResultGroup } from 'lit'
import { styles as fieldStyles } from '../../shared/field/field.css.js'
import { styles as fieldStackedStyles } from '../../shared/field/field-stacked.css.js'
import { styles } from './radio-group.css.js'

/**
 * @summary A set of radios where exactly one can be chosen.
 *
 * @description
 * Lays out the field's three parts the same way as every other field: the
 * question above the set, and one line below it that shows the hint, or the
 * message when something is wrong. `orientation` lays out the choices only, so
 * a horizontal group keeps its question above the row.
 *
 * @since 0.1.0
 * @status stable
 * @aliases RadioButtons, Choice group
 * @documentation https://fusion.dev/helix/components/radio
 *
 * @cssproperty --radio-group-gap - The space between the choices.
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
