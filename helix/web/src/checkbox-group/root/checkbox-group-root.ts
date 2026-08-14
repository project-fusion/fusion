import { customElement } from '@helix-io/core'
import { HelixBaseCheckboxGroup } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './checkbox-group-root.css.js'

/**
 * @summary Groups related checkboxes, and reports them as one set.
 *
 * @description
 * A column by default, which is what a list of choices wants: the eye scans one
 * line per answer rather than hunting along a row.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Checkbox list, Multi-select
 * @documentation https://helix.fusion.dev/components/checkbox-group
 *
 * @cssproperty --checkbox-group-gap - Space between the boxes.
 */
@customElement('helix-checkbox-group')
export class HelixCheckboxGroup extends HelixBaseCheckboxGroup {
  /** Which way the boxes run. */
  @property({ reflect: true })
  orientation?: 'horizontal'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-checkbox-group': HelixCheckboxGroup
  }
}
