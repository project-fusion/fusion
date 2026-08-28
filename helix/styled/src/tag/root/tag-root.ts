import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessTag } from '@fusion.dev/helix-headless/tag'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './tag-root.css.js'

/**
 * @summary Labels content with a short piece of metadata.
 *
 * @description
 * Five tones. The fill is a tint of the status color, mixed with
 * `color-mix` rather than held as a token per status, so a theme that changes
 * the status colors gets the tints with them.
 *
 * @since 0.1.0
 * @status stable
 * @category markers
 * @aliases Chip, Pill, Label
 * @documentation https://helix.fusion.dev/components/tag
 *
 * @slot - The tag's label.
 *
 * @event {HelixDismissEvent} helix-dismiss - Fired when the reader asks to remove the tag. Cancelable: refusing it takes the decision and nothing moves.
 *
 * @csspart dismiss - The remove button, when `dismissible`.
 *
 * @cssproperty --tag-background-color - Fill behind the tag.
 * @cssproperty --tag-border-color - Color of the edge, for a chip that separates by fill alone.
 * @cssproperty --tag-foreground-color - Label color.
 * @cssproperty --tag-radii - Corner radius of the tag.
 */
@customElement('helix-tag')
export class HelixTag extends HelixHeadlessTag {
  /**
   * Which status the tag reports.
   *
   * This was called `appearance`, and it never was one. `tone` is semantic
   * color, which is what these are and what `helix-text` already calls them.
   * One axis was wearing the other's name, and the axis it should have held did
   * not exist.
   *
   * **Written before there was a registry, and it turned out to be the first
   * instance of a general fault rather than a local one.** `appearance` was not
   * a treatment either: it held four different questions across 21 components,
   * and this file found one of them the hard way. The rest is `check:axes`.
   */
  @property({ reflect: true })
  tone?: 'accent' | 'danger' | 'info' | 'neutral' | 'primary' | 'success' | 'warning'

  /**
   * How much of the tone the tag wears.
   *
   * - `subtle` is the default: a wash of the tone with the label in it, for a
   *   tag that labels something rather than warning about it.
   * - `solid` fills with the tone and puts the label on top of it, for the one
   *   that has to be seen first.
   * - `outlined` is the tone at its edge only, for a dense set where filling
   *   each of them turns a list into a mosaic.
   *
   * Independent of `tone` on purpose: an outlined danger tag and a solid danger
   * tag are both sensible, and until these were two properties you could ask
   * for neither, because color and fill were welded together. Which is the same
   * test the whole axis registry answers to, arrived at here first and one
   * component at a time.
   */
  @property({ reflect: true })
  emphasis?: 'outlined' | 'solid' | 'subtle'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-tag': HelixTag
  }
}
