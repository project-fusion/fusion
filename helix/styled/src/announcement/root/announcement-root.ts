import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessAnnouncement } from '@fusion.dev/helix-headless/announcement'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles as densityStyles } from '../../shared/density/density-sm.css.js'
import { styles as liveStyles } from '../../shared/live/live.css.js'
import { styles } from './announcement-root.css.js'

/**
 * @summary A message for the whole page, shown above its header, that can be dismissed.
 *
 * @description
 * Full width and flat. The tone is a tinted fill with no border, so the
 * announcement is a band across the top of the page. `separation="outlined"`
 * adds a hairline along the bottom edge.
 *
 * @since 0.1.0
 * @status stable
 * @category feedback
 * @aliases Banner, Notification bar, Alert bar
 * @documentation https://fusion.dev/helix/components/announcement
 *
 * @cssproperty --announcement-background-color - The band's fill, in place of the one its separation gives it. A tone's tint still paints over it, so a band that sets this usually carries no tone.
 * @cssproperty --announcement-block-size - The band's minimum height, so adding a control to it does not move the page down. A message long enough to wrap makes the band taller.
 * @cssproperty --announcement-font-size - The size of the message's text.
 * @cssproperty --announcement-foreground-color - The message's color, to pair with a fill set through the background hook.
 * @cssproperty --announcement-inset - The inline padding, matched to the page.
 * @cssproperty --announcement-text-align - Where the message sits in the band. Centered by default; `start` lines it up with the page under it.
 * @cssproperty --announcement-tone-color - The color a toned band's tint and outline are mixed from, in place of the tone's.
 */
@customElement('helix-announcement')
export class HelixAnnouncement extends HelixHeadlessAnnouncement {
  /**
   * The surface level the band sits on.
   *
   * Unset, the band is a well sunk below the page. `filled` brings it up to the
   * surface step, for a band that reads as part of the furniture rather than as
   * a slot cut into it. `outlined` has no fill and draws a hairline under the
   * band, in its tone where it has one; no other value draws a line. There is no
   * `elevated`: the band usually sits at the top of the page with nothing under
   * it to lift off.
   *
   * **`separation` and not `tone`, because a rung is not a meaning.** A band
   * can be `info` and filled at the same time, and two values that can both
   * be true are two axes, which is the test the registry answers to.
   *
   * Styled and not headless, because a rung of a ladder is paint: the headless
   * tier has no stylesheet to sit a band on. `tone` crosses because meaning
   * survives having nothing to paint with, and it is the only axis that does.
   */
  @property({ reflect: true })
  separation?: 'filled' | 'outlined'

  static override styles: CSSResultGroup = [densityStyles, liveStyles, styles]

  /**
   * The band's color.
   *
   * Paint only: unlike `Callout`, no value here draws a mark, changes the label,
   * or moves the live region off polite. `neutral` is the resting value, said
   * out loud so a consumer can put a band back to it from markup.
   *
   * **The set is `Tag`'s and `Badge`'s, and now actually is.** This doc claimed
   * to match `Tag` while differing from it in both directions: it carried
   * `surface`, which `Tag` does not, and lacked `accent`, which `Tag` has. Three
   * components saying what a thing means, in three vocabularies, one of which
   * described itself as a fourth.
   *
   * `accent` is the second emphasis, the second color a theme names, and the
   * brand itself until one is named. `primary` is the brand.
   *
   * **`surface` was never a color and has moved to `separation`**, which is the
   * axis that owns where a box sits relative to the page. It said the band rode
   * the surface step instead of the sunken one, which is an elevation, and a
   * band can be `info` and filled at once: two values true together are two
   * axes, which is the test the registry answers to.
   */
  @property({ reflect: true })
  tone?: 'accent' | 'danger' | 'info' | 'neutral' | 'primary' | 'success' | 'warning'
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-announcement': HelixAnnouncement
  }
}
