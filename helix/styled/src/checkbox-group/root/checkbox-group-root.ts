import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessCheckboxGroup } from '@fusion.dev/helix-headless/checkbox-group'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles as fieldStyles } from '../../shared/field/field.css.js'
import { styles as fieldStackedStyles } from '../../shared/field/field-stacked.css.js'
import { styles } from './checkbox-group-root.css.js'
import '../../checkbox/index.js'

/**
 * @summary A group of related checkboxes under one label, with one value for the set.
 *
 * @description
 * Lays the checkboxes out in a column by default, one choice per line, which is
 * easier to scan than a row.
 *
 * @since 0.1.0
 * @status stable
 * @category forms
 * @aliases Checkbox list, Multi-select
 * @use Several choices from one set, such as the places you receive updates.
 * @instead checkbox - One choice that stands on its own, such as accepting the terms.
 * @instead radio - One choice from a set of up to five options.
 * @instead listbox - A list too long to show as boxes, from which you choose several.
 * @anatomy label
 * @anatomy items
 * @anatomy hint?
 * @practice Write `name` once, on the group. - Each checkbox submits its own value under that name, and the group adds no value of its own.
 * @practice Set `feedback` for a message about the whole set. - The group never sets a form value, so the browser writes no message for it.
 * @documentation https://fusion.dev/design/components/checkbox-group
 *
 * @cssproperty --checkbox-group-gap - The space between the checkboxes.
 */
@customElement('helix-checkbox-group')
export class HelixCheckboxGroup extends HelixHeadlessCheckboxGroup {
  static override tier = 'helix-'

  /**
   * The direction the checkboxes run. Set `horizontal` for a row. Unset is a
   * column.
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
