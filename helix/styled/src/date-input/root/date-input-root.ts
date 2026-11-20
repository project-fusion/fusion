import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessDateInput } from '@fusion.dev/helix-headless/date-input'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
/* The headless template names `helix-date-picker` rather than the base tag, so
   without this a consumer importing this family alone got a panel whose calendar
   was an empty inert box. It looked right only because the sandbox imports the
   whole barrel. Same arrangement Select uses for its listbox. */
import '../../date-picker/index.js'
import '../../tag/root/index.js'
import { styles } from './date-input-root.generated.css.js'

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
 * @use A date in a form, typed or picked from a calendar that opens, such as a start date.
 * @instead date-picker - A calendar that stays open on the page, such as on a booking page.
 * @instead time-input - A time of day in a form.
 * @anatomy label
 * @anatomy field
 * @anatomy trigger
 * @anatomy hint?
 * @anatomy surface
 * @documentation https://fusion.dev/helix/components/date-input
 *
 * @cssproperty --date-input-background-color - The fill behind the field.
 * @cssproperty --date-input-border-color - The color of the panel's border.
 * @cssproperty --date-input-border-width - The width of the panel's border. It
 *   follows `--helix-border-floating`, a hairline, so the panel has an edge as well as its shadow over a dark page. Set it to `0` for the shadow alone.
 * @cssproperty --date-input-ghost-align - Where a `ghost` value sits in its field at rest: `start`, `center`, or `end`. A `DataTable` sets it to its column's edge.
 * @cssproperty --date-input-ghost-underline - The color of the round dots under a `ghost` value at rest, which say it can be edited. None by default, and the subtle foreground on a touch screen. A `DataTable` sets it on every editable cell.
 * @cssproperty --date-input-move-duration - How long a date takes to fade in, to fade as it leaves, or to slide to its new place. Defaults to `--helix-duration-normal`. `0ms` moves nothing.
 * @cssproperty --date-input-move-easing - The curve a date fades and slides along. Defaults to `--helix-easing-standard`.
 * @cssproperty --date-input-segment-focus-background-color - The fill behind the
 *   segment with focus, in `segmented`. It follows `--helix-color-primary-surface`.
 * @cssproperty --date-input-segment-focus-color - The text of the segment with
 *   focus, in `segmented`.
 * @cssproperty --date-input-segment-literal-color - The text the locale writes
 *   between two segments, in `segmented`.
 * @cssproperty --date-input-segment-placeholder-color - The dashes of a segment
 *   with nothing in it, in `segmented`. It matches the text field's placeholder.
 * @cssproperty --date-input-shadow - The shadow under the panel. It follows
 *   `--helix-shadow-floating`. The panel can sit over any content, so it has a
 *   shadow by default.
 * @cssproperty --date-input-size - The least height of the field.
 *
 * @replaces input[type=date]
 */
@customElement('helix-date-input')
export class HelixDateInput extends HelixHeadlessDateInput {
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

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-date-input': HelixDateInput
  }
}
