import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessInput } from '@fusion.dev/helix-headless/input'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles as dictationStyles } from '../../shared/dictation/dictation.css.js'
import { styles as fieldStyles } from '../../shared/field/field.css.js'
import { styles as fieldFrameStyles } from '../../shared/field/field-frame.css.js'
import { styles as fieldGhostStyles } from '../../shared/field/field-ghost.css.js'
import { styles as fieldStackedStyles } from '../../shared/field/field-stacked.css.js'
import { styles as glyphStyles } from '../../shared/glyph/glyph.css.js'
import { styles } from './input-root.css.js'
import '../../voice-level/index.js'

/**
 * @summary A field for a single line of text.
 *
 * @description
 * The frame wraps the whole field, so anything slotted at either end sits in
 * the same box as the text, and the focus ring goes around the whole control.
 *
 * The inner input is the native one with its styling removed, so the caret,
 * selection, autofill, and a phone's keyboard all work natively.
 *
 * Height comes from `data-density` on a containing element, like every other
 * control. There is no `size` property. Invalid styling applies only with the
 * `invalid` custom state, so an empty field is not marked wrong before anyone
 * fills it in. `:user-invalid` cannot be used here, because it matches the
 * input inside the shadow root and never the host.
 *
 * @since 0.1.0
 * @status stable
 * @category forms
 * @aliases TextField, Field, TextInput
 * @documentation https://fusion.dev/helix/components/input
 *
 * @cssproperty --input-background-color - Fill behind the text.
 * @cssproperty --input-border-color - Edge of the field at rest. Hover, focus and an error still draw their own.
 * @cssproperty --input-ghost-align - Where a `ghost` value sits in its field at rest: `start`, `center`, or `end`. A `DataTable` sets it to its column's edge.
 * @cssproperty --input-ghost-underline - The color of the round dots under a `ghost` value at rest, which say it can be edited. None by default, and the subtle foreground on a touch screen. A `DataTable` sets it on every editable cell.
 * @cssproperty --input-padding-inline - Space between the edge of the field and what is inside it.
 * @cssproperty --input-radius - Corner radius of the field.
 * @cssproperty --input-size - Height of the field.
 *
 * @replaces input, input[type=text], input[type=email], input[type=password], input[type=search], input[type=tel], input[type=url]
 */
@customElement('helix-input')
export class HelixInput extends HelixHeadlessInput {
  /**
   * How loud the field is. `ghost` is the inline field: it reads as text at
   * rest, takes a well and a text cursor under the pointer, and draws a ring
   * inside its own box while it is edited, so a row it sits in keeps its
   * height. A `DataTable` opens its edited cells in it, and a details list can
   * use it outside a table. An error rings it in the danger color.
   */
  @property({ reflect: true })
  emphasis?: 'ghost'
  /** The tier its dictation button draws Voice Level from. */
  static override tier = 'helix-'

  static override styles: CSSResultGroup = [
    glyphStyles,
    fieldStyles,
    fieldFrameStyles,
    fieldGhostStyles,
    fieldStackedStyles,
    styles,
    dictationStyles,
  ]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-input': HelixInput
  }
}
