import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessBadge } from '@fusion.dev/helix-headless/badge'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './badge-root.css.js'

/**
 * @summary A count or a dot pinned to the corner of another element.
 *
 * @description
 * The indicator has a ring in the page background color, so it stays legible
 * where it overlaps the element it is pinned to, such as a dark badge on a dark
 * icon.
 *
 * `placement` pins it to another corner, or puts it in the line with
 * `inline`. **Inside a control, `inline` puts the count in the control's
 * name**: `<button>Inbox <helix-badge placement="inline" value="8"
 * label="8 unread"></helix-badge></button>` is the button "Inbox 8 unread",
 * kept current by the badge with no label of yours to update.
 *
 * @since 0.1.0
 * @status stable
 * @category markers
 * @aliases Count, Indicator, Pip
 * @documentation https://fusion.dev/helix/components/badge
 *
 * @cssproperty --badge-background-color - The fill of the indicator.
 * @cssproperty --badge-color - The color of the count, to pair with a fill set through `--badge-background-color`.
 * @cssproperty --badge-gap - The space between the content and the count under `placement="inline"`.
 * @cssproperty --badge-offset - Pulls the mark in from the corner, along both axes.
 * @cssproperty --badge-ring-color - The color of the ring between the indicator and what is behind it.
 */
@customElement('helix-badge')
export class HelixBadge extends HelixHeadlessBadge {
  /**
   * Where the mark sits: a corner, `top-start`, `bottom-end` or `bottom-start`,
   * or `inline`, in the line after the content.
   *
   * Absent is the top end, the corner a count is looked for in. `inline` is
   * for a badge inside a control, where its count is read as part of the
   * control's name.
   */
  @property({ reflect: true })
  placement?: 'bottom-end' | 'bottom-start' | 'inline' | 'top-start'

  /**
   * What the mark means. The stylesheet picks the fill from it.
   *
   * **`Tag`'s vocabulary, because a badge is the same kind of thing.** Both are
   * a small mark carrying a meaning beside something else, and the two had
   * different sets for no reason anybody decided: a tag could say `success` and
   * a badge could not, so a page marking a build green wrote one word on the
   * chip and had no word for the count beside it. Every fill these name already
   * exists with its family's label, so this costs a rule apiece and no new
   * color.
   *
   * **`primary` is sayable as well as the default**, which is the reason
   * `Announcement` gives for its own neutral: a generated page should be able to
   * say what it means rather than express it by leaving an attribute off.
   */
  @property({ reflect: true })
  tone?: 'accent' | 'danger' | 'info' | 'neutral' | 'primary' | 'success' | 'warning'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-badge': HelixBadge
  }
}
