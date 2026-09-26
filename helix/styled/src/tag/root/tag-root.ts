import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessTag } from '@fusion.dev/helix-headless/tag'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './tag-root.css.js'

/**
 * @summary A short label that adds metadata to content.
 *
 * @description
 * Seven tones. The fill is a tint of the status color, mixed with
 * `color-mix` rather than held as a token per status, so a theme that changes
 * the status colors gets the tints with them.
 *
 * @since 0.1.0
 * @status stable
 * @category markers
 * @aliases Chip, Pill, Label
 * @documentation https://fusion.dev/helix/components/tag
 *
 * @slot - The tag's label.
 *
 * @event {HelixDismissEvent} helix-dismiss - The remove button was pressed. The tag does not remove itself, so remove it in response. Cancelable.
 *
 * @csspart dismiss - The remove button, when `dismissible`.
 *
 * @cssproperty --tag-background-color - The fill behind the tag.
 * @cssproperty --tag-border-color - The color of the tag's edge.
 * @cssproperty --tag-foreground-color - The label color.
 * @cssproperty --tag-radius - The corner radius of the tag.
 */
@customElement('helix-tag')
export class HelixTag extends HelixHeadlessTag {
  /**
   * How strongly the tag shows its tone: `subtle`, `solid`, or `outlined`.
   *
   * - `subtle` is the default: a wash of the tone with the label in it, for a
   *   tag that labels something rather than warning about it.
   * - `solid` fills with the tone and puts the label on top of it, for the one
   *   that has to be seen first.
   * - `outlined` is the tone at its edge only, for a dense set where filling
   *   each of them turns a list into a mosaic.
   *
   * Independent of `tone` on purpose: an outlined danger tag and a solid danger
   * tag are both sensible, and one property welding color to fill can ask for
   * neither. That is the test the whole axis registry answers to.
   */
  @property({ reflect: true })
  emphasis?: 'outlined' | 'solid' | 'subtle'

  /**
   * The meaning the tag's color shows, such as `success` or `danger`.
   *
   * `tone` is semantic color, which is what these are and what `helix-text`
   * already calls them. `helix component`'s `axes` holds the vocabulary.
   *
   * **Not all seven are statuses, and `accent` is the one worth saying out
   * loud**: it is the second emphasis, a rotation off the brand seed rather than
   * a color of its own, so it stays in relation when somebody rethemes.
   * `primary` is the seed itself. The four that are statuses are the four
   * `HelixStatusTone` names, and those are the ones that would carry a glyph
   * somewhere that draws one.
   *
   * `Badge` and `Announcement` take the same seven, all three being a mark that
   * carries a meaning beside something else.
   */
  @property({ reflect: true })
  tone?: 'accent' | 'danger' | 'info' | 'neutral' | 'primary' | 'success' | 'warning'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-tag': HelixTag
  }
}
