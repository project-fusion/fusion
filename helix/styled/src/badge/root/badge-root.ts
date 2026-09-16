import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessBadge } from '@fusion.dev/helix-headless/badge'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './badge-root.css.js'

/**
 * @summary Attaches a count or a presence mark to another element.
 *
 * @description
 * The indicator carries a ring in the page's own background color, so it stays
 * legible where it overlaps the thing it is pinned to. Without it a dark badge
 * on a dark icon reads as a bite taken out of the icon.
 *
 * @since 0.1.0
 * @status stable
 * @category markers
 * @aliases Count, Indicator, Pip
 * @documentation https://fusion.dev/helix/components/badge
 *
 * @cssproperty --badge-background-color - Fill of the indicator.
 * @cssproperty --badge-offset - Pulls the mark in from the corner, along both axes.
 * @cssproperty --badge-ring-color - The ring separating it from what is behind.
 */
@customElement('helix-badge')
export class HelixBadge extends HelixHeadlessBadge {
  /**
   * What the mark means, not how loudly it is drawn: the stylesheet picks a fill
   * from what the count *is*.
   *
   * **`Tag`'s vocabulary, because a badge is the same kind of thing.** Both are
   * a small mark carrying a meaning beside something else, and the two had
   * different sets for no reason anybody decided: a tag could say `success` and
   * a badge could not, so a page marking a build green wrote one word on the
   * chip and had no word for the count beside it. Every fill these name already
   * exists and every one carries `foreground-on-accent`, so this costs a rule
   * apiece and no new color.
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
