import { customElement } from '@helix-io/core'
import { HelixHeadlessTextarea } from '@helix-io/headless/textarea'
import type { CSSResultGroup } from 'lit'
import { styles as fieldStyles } from '../../field/field.css.js'
import { styles as fieldStackedStyles } from '../../field/field-stacked.css.js'
import { styles } from './textarea-root.css.js'

/**
 * @summary Several lines of text a reader types into.
 *
 * @description
 * The same frame an `Input` wears, so a form of mixed fields reads as one set
 * rather than as two kinds of box. What differs is the resize handle, which is
 * the platform's and is left alone on the block axis only: a field that can be
 * dragged wider than the form holding it is a field that breaks the layout.
 *
 * @since 0.1.0
 * @status stable
 * @category forms
 * @aliases Multiline, TextArea
 * @documentation https://helix.fusion.dev/components/textarea
 *
 * @cssproperty --textarea-background-color - Fill behind the text.
 */
@customElement('helix-textarea')
export class HelixTextarea extends HelixHeadlessTextarea {
  static override styles: CSSResultGroup = [fieldStyles, fieldStackedStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-textarea': HelixTextarea
  }
}
