import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessTextarea } from '@fusion.dev/helix-headless/textarea'
import type { CSSResultGroup } from 'lit'
import { styles as fieldStyles } from '../../shared/field/field.css.js'
import { styles as fieldFrameStyles } from '../../shared/field/field-frame.css.js'
import { styles as fieldStackedStyles } from '../../shared/field/field-stacked.css.js'
import { styles } from './textarea-root.css.js'

/**
 * @summary A multi-line text field.
 *
 * @description
 * Uses the same frame as `Input`, so mixed fields in a form match. The
 * platform's resize handle is kept on the block axis only, so the field cannot
 * be dragged wider than its form.
 *
 * @since 0.1.0
 * @status stable
 * @category forms
 * @aliases Multiline, TextArea
 * @documentation https://fusion.dev/helix/components/textarea
 *
 * @cssproperty --textarea-background-color - Fill behind the text.
 * @cssproperty --textarea-border-color - Edge of the field at rest. Hover, focus and an error still draw their own.
 * @cssproperty --textarea-padding - Space between the edge of the field and the text.
 * @cssproperty --textarea-radius - Corner radius of the field.
 * @cssproperty --textarea-resize - Which way a reader can drag the field: `vertical` by default, `none`, `both` or `horizontal`. A field under `auto-grow` has nothing to drag.
 */
@customElement('helix-textarea')
export class HelixTextarea extends HelixHeadlessTextarea {
  static override styles: CSSResultGroup = [
    fieldStyles,
    fieldFrameStyles,
    fieldStackedStyles,
    styles,
  ]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-textarea': HelixTextarea
  }
}
