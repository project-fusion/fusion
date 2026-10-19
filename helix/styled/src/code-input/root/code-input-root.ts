import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessCodeInput } from '@fusion.dev/helix-headless/code-input'
import type { CSSResultGroup } from 'lit'
import { styles as dictationStyles } from '../../shared/dictation/dictation.css.js'
import { styles as fieldStyles } from '../../shared/field/field.css.js'
import { styles as fieldFrameStyles } from '../../shared/field/field-frame.css.js'
import { styles as fieldStackedStyles } from '../../shared/field/field-stacked.css.js'
import { styles } from './code-input-root.css.js'

/**
 * @summary A field for a short piece of code, highlighted as it is typed.
 *
 * @description
 * Uses the same frame as `Textarea` and `Input`, so a form of mixed fields
 * matches, with the code in the mono face at the size Code Block draws it.
 * The colors are the syntax tokens, through the highlighter the page
 * registered: `import '@fusion.dev/helix-sandbox/code-block'` colors every
 * Code Block and Code Input on the page.
 *
 * @since 0.216.0
 * @status experimental
 * @category forms
 * @aliases Code field, Code textarea, JSON input, Syntax highlighted input
 * @documentation https://fusion.dev/helix/components/code-input
 *
 * @cssproperty --code-input-background-color - Fill behind the code.
 * @cssproperty --code-input-border-color - Edge of the field at rest. Hover, focus and an error still draw their own.
 * @cssproperty --code-input-font-size - The code's size. Defaults to `text-sm`, and never under 16px on a touch screen.
 * @cssproperty --code-input-padding - Space between the edge of the field and the code.
 * @cssproperty --code-input-radius - Corner radius of the field.
 * @cssproperty --dictation-level - How loud the microphone is while the field listens for dictation, from 0 to 1, which the element sets; the ring around the dictation button grows with it.
 */
@customElement('helix-code-input')
export class HelixCodeInput extends HelixHeadlessCodeInput {
  static override styles: CSSResultGroup = [
    fieldStyles,
    fieldFrameStyles,
    fieldStackedStyles,
    styles,
    dictationStyles,
  ]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-code-input': HelixCodeInput
  }
}
