import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessAnnouncement } from '@fusion.dev/helix-headless/announcement'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './announcement-root.css.js'

/**
 * @summary A page-level message above the masthead, which can be dismissed.
 *
 * @description
 * Full width and flat, with the severity carried by a tinted fill and a
 * hairline beneath rather than by a border on four sides: an announcement is a
 * band across the top of the page, not a box that happens to be wide.
 *
 * @since 0.1.0
 * @status stable
 * @category feedback
 * @aliases Banner, Notification bar, Alert bar
 * @documentation https://fusion.dev/helix/components/announcement
 *
 * @cssproperty --announcement-block-size - How tall the band is at its shortest, so adding a control to it does not move the page down. A floor, not a cap: a message long enough to wrap still gets the room.
 * @cssproperty --announcement-inset - Inline padding, matched to the page.
 */
@customElement('helix-announcement')
export class HelixAnnouncement extends HelixHeadlessAnnouncement {
  /**
   * Which rung of the surface ladder the band rides.
   *
   * `filled` is the resting one, a well sunk below the page. `elevated` brings
   * it up to the surface step, for a band that reads as part of the furniture
   * rather than as a slot cut into it.
   *
   * **This was `tone="surface"`**, which put an elevation on the axis that says
   * what a thing means. The band's own doc admitted it, calling `surface` the
   * one value that was not a color. A band can be `info` and elevated at the
   * same time, and two values that can both be true are two axes.
   *
   * Styled and not headless, because a rung of a ladder is paint: the headless
   * tier has no stylesheet to sit a band on. `tone` crosses because meaning
   * survives having nothing to paint with, and it is the only axis that does.
   */
  @property({ reflect: true })
  separation?: 'elevated' | 'filled'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-announcement': HelixAnnouncement
  }
}
