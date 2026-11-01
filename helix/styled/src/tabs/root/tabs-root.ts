import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessTabs } from '@fusion.dev/helix-headless/tabs'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './tabs-root.css.js'

/**
 * @summary A row of tabs and the panel each one shows.
 *
 * @description
 * One mark moves between the tabs to show the current one. A moving mark is a
 * single object that is easy to follow, and it shows where the selection came
 * from. A fill that switches from tab to tab changes two things at once and
 * looks like a flicker. `Navigation` marks its destinations the same way.
 *
 * The mark depends on `marker`:
 *
 * - Unset, it is a raised pill on the selected tab, with nothing behind the
 *   row.
 * - `underlined` makes it a bar along the bottom of the strip, on a rule.
 * - `segmented` makes it the size of the tab's box, inside a sunken track.
 *
 * `emphasis="subtle"` makes the mark quieter, for tabs inside other chrome
 * such as a pane's header: a tint with no edge or shadow, the same wash a
 * subtle button takes.
 *
 * **Tabs with no panels are a strip.** Where what each tab stands for lives
 * outside the set, such as a pane's pages or shells, leave the panels out: the
 * tabs keep their keys and their selection, `active` and `helix-activate` say
 * which is current, and the page shows the rest. Put a control that adds a tab,
 * such as a plus, beside the set rather than in it, so the tab list holds tabs
 * alone. With `dismissible` tabs, `dismiss-marks="hover"` keeps each close
 * mark out of sight until the tab is current, under the pointer, or holds
 * focus, as a browser's tabs do.
 *
 * @since 0.1.0
 * @status stable
 * @category navigation
 * @documentation https://fusion.dev/helix/components/tabs
 *
 * @slot - The tabs, as direct children of this element.
 * @slot indicator - A mark of your own, drawn inside the `indicator` part, where the selected tab's place and size reach it.
 * @slot panels - The panels, as direct children of this element. Panels inside a wrapper are not paired with tabs, because pairing reads only the direct children.
 * @slot scroll-end-icon - Replaces the glyph on the button that scrolls the strip toward its end.
 * @slot scroll-start-icon - Replaces the glyph on the button that scrolls the strip toward its start.
 *
 * @csspart indicator - The mark that moves to the selected tab. It carries the selected tab's place and size as `--indicator-x`, `--indicator-y`, `--indicator-inline-size` and `--indicator-block-size`.
 * @csspart panels - The panel container.
 * @csspart scroll-end - The button that scrolls the strip toward its end, shown under `scroll-controls` while there is more that way. It holds to the end of the strip.
 * @csspart scroll-end-mark - The glyph on that button, where none is slotted.
 * @csspart scroll-start - The button that scrolls the strip toward its start, shown under `scroll-controls` while there is more that way. It holds to the start of the strip.
 * @csspart scroll-start-mark - The glyph on that button, where none is slotted.
 * @csspart tabs - The tab list.
 *
 * @cssproperty --tabs-gap - The space between tabs.
 * @cssproperty --tabs-indicator-color - The fill of the mark on the current tab: the bar under `underlined`, and the pill otherwise.
 * @cssproperty --tabs-indicator-radius - The corners of the mark.
 * @cssproperty --tabs-indicator-shadow - The shadow under the mark, which the pill and `segmented` draw.
 * @cssproperty --tabs-indicator-thickness - The height of the bar under `underlined`.
 * @cssproperty --tabs-rule-color - The color of the rule under the row in `underlined`.
 * @cssproperty --tabs-scroll-background-color - The fill behind the scroll buttons, over the tabs that pass under them.
 */
@customElement('helix-tabs')
export class HelixTabs extends HelixHeadlessTabs {
  static override styles: CSSResultGroup = styles

  /**
   * When the close mark of each `dismissible` tab shows.
   *
   * Unset, or `always`, every mark shows. `hover` shows a tab's mark while it
   * is current, under the pointer, or holds focus, and keeps its room on every
   * tab, so the labels do not move as the marks come and go. For a strip of
   * many dismissible tabs, where a mark on each reads as a row of crosses. A
   * keyboard closes a tab with Delete whether its mark shows or not.
   */
  @property({ attribute: 'dismiss-marks', reflect: true })
  dismissMarks?: 'always' | 'hover'

  /**
   * How loud the mark on the current tab is.
   *
   * Unset is the mark `marker` draws at rest. `subtle` is a tint with no
   * edge or shadow: the raised pill becomes a wash, the `segmented` track's
   * pill does the same inside it, and the `underlined` bar takes the
   * foreground's ink in place of the primary color. For tabs inside other
   * chrome, where a raised mark reads as a control laid on top of it.
   *
   * Independent of `marker`, since each of its marks has a quiet form: the two
   * answer different questions, which is the test the axis registry applies.
   */
  @property({ reflect: true })
  emphasis?: 'subtle'
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-tabs': HelixTabs
  }
}
