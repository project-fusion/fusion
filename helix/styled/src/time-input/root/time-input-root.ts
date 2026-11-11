import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessTimeInput } from '@fusion.dev/helix-headless/time-input'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
/* Inherited from the base along with the template: this file has neither tag in
   it to remind anyone. */
import '../../tag/root/index.js'
import '../../time-picker/index.js'
import { styles as fieldStyles } from '../../shared/field/field.css.js'
import { styles as fieldFrameStyles } from '../../shared/field/field-frame.css.js'
import { styles as fieldGhostStyles } from '../../shared/field/field-ghost.css.js'
import { styles as fieldSegmentsStyles } from '../../shared/field/field-segments.css.js'
import { styles as fieldStackedStyles } from '../../shared/field/field-stacked.css.js'
import { styles as floatingEntranceStyles } from '../../shared/floating/entrance.css.js'
import { styles as floatingPanelStyles } from '../../shared/floating/panel.css.js'
import { styles as tagRowStyles } from '../../shared/tags/tags.css.js'
import { styles } from './time-input-root.css.js'

/**
 * @summary A field for a time, typed or picked from a list.
 *
 * @description
 * The frame wraps the whole field, so the trigger sits in the same box as the
 * text and the focus ring goes around the whole control. The trigger is drawn
 * inside that box, as in Date Input.
 *
 * The panel is as wide as the field. This is the one difference from Input
 * Date, whose calendar has seven columns and a width of its own. A list of
 * times is one column, so it matches the control, as Select's list does.
 *
 * @since 0.1.0
 * @status stable
 * @category forms
 * @aliases TimeField, InputTime
 * @documentation https://fusion.dev/helix/components/time-input
 *
 * @cssproperty --time-input-background-color - Fill behind the field.
 * @cssproperty --time-input-border-color - Color of the panel's edge.
 * @cssproperty --time-input-border-width - Width of the panel's edge. Defaults to
 *   `--helix-border-floating`, a hairline, so the panel has an edge as well as its shadow over a dark page. Set it to `0` for the shadow alone.
 * @cssproperty --time-input-segment-focus-background-color - The fill behind the
 *   segment with focus, in `segmented`. It follows `--helix-color-primary-surface`.
 * @cssproperty --time-input-segment-focus-color - The text of the segment with
 *   focus, in `segmented`.
 * @cssproperty --time-input-segment-literal-color - The text the locale writes
 *   between two segments, in `segmented`.
 * @cssproperty --time-input-segment-placeholder-color - The dashes of a segment
 *   with nothing in it, in `segmented`. It matches the text field's placeholder.
 * @cssproperty --time-input-shadow - Shadow under the panel. Defaults to
 *   `--helix-shadow-floating`, because the panel can sit over any content.
 *
 * @replaces input[type=time]
 */
@customElement('helix-time-input')
export class HelixTimeInput extends HelixHeadlessTimeInput {
  /**
   * How loud the field is. `ghost` is the inline field: it reads as text at
   * rest, takes a well and a text cursor under the pointer, and draws a ring
   * inside its own box while it is edited, so a row it sits in keeps its
   * height. A `DataTable` opens its edited cells in it, and a details list can
   * use it outside a table. An error rings it in the danger color.
   */
  @property({ reflect: true })
  emphasis?: 'ghost'
  static override tier = 'helix-'

  static override styles: CSSResultGroup = [
    fieldStyles,
    fieldFrameStyles,
    fieldGhostStyles,
    fieldStackedStyles,
    fieldSegmentsStyles,
    tagRowStyles,
    floatingPanelStyles,
    floatingEntranceStyles,
    styles,
  ]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-time-input': HelixTimeInput
  }
}
