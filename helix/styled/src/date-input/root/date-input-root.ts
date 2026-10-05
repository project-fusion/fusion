import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessDateInput } from '@fusion.dev/helix-headless/date-input'
import type { CSSResultGroup } from 'lit'
/* The headless template names `helix-date-picker` rather than the base tag, so
   without this a consumer importing this family alone got a panel whose calendar
   was an empty inert box. It looked right only because the sandbox imports the
   whole barrel. Same arrangement Select uses for its listbox. */
import '../../date-picker/index.js'
import '../../tag/index.js'
import { styles as fieldStyles } from '../../shared/field/field.css.js'
import { styles as fieldFrameStyles } from '../../shared/field/field-frame.css.js'
import { styles as fieldSegmentsStyles } from '../../shared/field/field-segments.css.js'
import { styles as fieldStackedStyles } from '../../shared/field/field-stacked.css.js'
import { styles as floatingEntranceStyles } from '../../shared/floating/entrance.css.js'
import { styles as floatingPanelStyles } from '../../shared/floating/panel.css.js'
import { styles as tagRowStyles } from '../../shared/tags/tags.css.js'
import { styles } from './date-input-root.css.js'

/**
 * @summary A date, typed or picked from a calendar.
 *
 * @description
 * The frame is drawn around the whole field, so the trigger sits inside the
 * same box as the text and the focus ring surrounds the whole control. The
 * trigger is a mark inside that box, so the field reads as one control.
 *
 * The calendar is the real `helix-date-picker`, in a panel with no border. Its
 * shadow and what it covers set it apart from the page.
 *
 * Height comes from the region, like every other control. Set `data-density` on
 * the element that holds it.
 *
 * @since 0.1.0
 * @status stable
 * @category forms
 * @aliases DatePicker, DateField, InputDate
 * @documentation https://fusion.dev/helix/components/date-input
 *
 * @cssproperty --date-input-background-color - The fill behind the field.
 * @cssproperty --date-input-border-color - The color of the panel's border.
 * @cssproperty --date-input-border-width - The width of the panel's border. It
 *   follows `--helix-border-floating`, which is `0`, so the panel stands out by its
 *   shadow unless a theme sets a border.
 * @cssproperty --date-input-segment-focus-background-color - The fill behind the
 *   segment with focus, in `segmented`. It follows `--helix-color-primary`.
 * @cssproperty --date-input-segment-focus-color - The text of the segment with
 *   focus, in `segmented`.
 * @cssproperty --date-input-segment-literal-color - The text the locale writes
 *   between two segments, in `segmented`.
 * @cssproperty --date-input-segment-placeholder-color - The dashes of a segment
 *   with nothing in it, in `segmented`. It matches the text field's placeholder.
 * @cssproperty --date-input-shadow - The shadow under the panel. It follows
 *   `--helix-shadow-floating`. The panel can sit over any content, so it has a
 *   shadow by default.
 */
@customElement('helix-date-input')
export class HelixDateInput extends HelixHeadlessDateInput {
  static override tier = 'helix-'

  static override styles: CSSResultGroup = [
    fieldStyles,
    fieldFrameStyles,
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
    'helix-date-input': HelixDateInput
  }
}
