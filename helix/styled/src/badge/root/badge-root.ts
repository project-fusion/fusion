import { customElement, reducedMotion } from '@fusion.dev/helix-core'
import { HelixHeadlessBadge } from '@fusion.dev/helix-headless/badge'
import type { CSSResultGroup, PropertyValues } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './badge-root.generated.css.js'

/**
 * @summary A count or a dot pinned to the corner of another element.
 *
 * @description
 * The indicator has a ring in the page background color, so it stays legible
 * where it overlaps the element it is pinned to, such as a dark badge on a dark
 * icon.
 *
 * `placement` pins it to another corner, or puts it in the line with
 * `inline`.
 *
 * @since 0.1.0
 * @status stable
 * @category markers
 * @aliases Count, Indicator, Pip
 * @use A count on an icon, a tab, or a button, or a dot that marks something new.
 * @instead tag - A word that describes the content.
 * @instead stat - A number that is the content itself.
 * @anatomy indicator
 * @practice {inline} Put the badge inside a control, with `placement="inline"`, to read its count in the control's name. - The button is then "Inbox 8 unread", and the badge keeps the name current with no label of yours to update.
 * @documentation https://fusion.dev/helix/components/badge
 *
 * @cssproperty --badge-attention-duration - How long one beat of `attention` takes.
 * @cssproperty --badge-background-color - The fill of the indicator.
 * @cssproperty --badge-bump-duration - How long the mark takes to swell and settle when its count changes. Defaults to `--helix-duration-normal`; `0ms` changes the count with no bump.
 * @cssproperty --badge-color - The color of the count, to pair with a fill set through `--badge-background-color`.
 * @cssproperty --badge-font-weight - The weight of the count.
 * @cssproperty --badge-gap - The space between the content and the count under `placement="inline"`.
 * @cssproperty --badge-icon-size - The size of an icon in the `icon` slot. The count's own size by default.
 * @cssproperty --badge-offset - Pulls the mark in from the corner, along both axes.
 * @cssproperty --badge-radius - How far the indicator's corners are rounded.
 * @cssproperty --badge-ring-color - The color of the ring between the indicator and what is behind it.
 */
@customElement('helix-badge')
export class HelixBadge extends HelixHeadlessBadge {
  /**
   * An effect that draws the eye to the mark: `pulse` swells it in a loop and
   * `bounce` hops it, as Web Awesome's badge does.
   *
   * Absent is still, which is right for almost every count: a mark that moves
   * is a mark that interrupts. Still for a reader who asked the system for
   * less motion, and while the mark is going away.
   */
  @property({ reflect: true })
  attention?: 'bounce' | 'pulse'

  /**
   * How strongly the mark is drawn: `solid`, `outlined` or `subtle`, `Tag`'s
   * axis.
   *
   * Absent is `solid`, the tone's fill. `outlined` draws the fill as a ring on
   * the page's ground and `subtle` as a tint, both with the page's ink.
   */
  @property({ reflect: true })
  emphasis?: 'outlined' | 'solid' | 'subtle'

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

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed)
    /* **A count that changes swells and settles**, so a new message is seen
       arriving on a mark that was already there. Not on the first render, nor
       when the mark itself arrives or goes, which the sheet's own scale draws. */
    const was = changed.get('value') as number | string | undefined
    if (changed.has('value') && was !== undefined && was !== '' && this.value !== '') {
      this.bump()
    }
  }

  /** Swells the mark and settles it, over the time `--badge-bump-duration` holds. */
  private bump(): void {
    const mark = this.partNamed('indicator')
    if (
      !mark ||
      mark.hasAttribute('data-blank') ||
      typeof mark.animate !== 'function' ||
      reducedMotion()
    ) {
      return
    }
    const written = getComputedStyle(this).getPropertyValue('--badge-bump-duration').trim()
    const amount = Number.parseFloat(written)
    const duration = written.endsWith('ms') ? amount : amount * 1000
    if (!(duration >= 1)) {
      return
    }
    mark.animate([{ scale: '1' }, { offset: 0.35, scale: '1.2' }, { scale: '1' }], {
      duration,
      easing: 'ease-out',
    })
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-badge': HelixBadge
  }
}
