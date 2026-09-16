import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessCheckboxGroup } from '@fusion.dev/helix-headless/checkbox-group'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles as fieldStyles } from '../../shared/field/field.css.js'
import { styles as fieldStackedStyles } from '../../shared/field/field-stacked.css.js'
import { styles } from './checkbox-group-root.css.js'

/**
 * @summary Groups related checkboxes, and reports them as one set.
 *
 * @description
 * A column by default, which is what a list of choices wants: the eye scans one
 * line per answer rather than hunting along a row.
 *
 * @since 0.1.0
 * @status stable
 * @category forms
 * @aliases Checkbox list, Multi-select
 * @documentation https://fusion.dev/helix/components/checkbox-group
 *
 * @cssproperty --checkbox-group-gap - Space between the boxes.
 */
@customElement('helix-checkbox-group')
export class HelixCheckboxGroup extends HelixHeadlessCheckboxGroup {
  /**
   * Which way the boxes run.
   */
  @property({ reflect: true })
  orientation?: 'horizontal'

  static override styles: CSSResultGroup = [fieldStyles, fieldStackedStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-checkbox-group': HelixCheckboxGroup
  }
}
