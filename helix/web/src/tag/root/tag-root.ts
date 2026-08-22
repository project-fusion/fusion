import { customElement } from '@helix-io/core'
import { HelixBaseTag } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './tag-root.css.js'

/**
 * @summary Labels content with a short piece of metadata.
 *
 * @description
 * Five appearances. The fill is a tint of the status color, mixed with
 * `color-mix` rather than held as a token per status, so a theme that changes
 * the status colors gets the tints with them.
 *
 * @since 0.1.0
 * @status experimental
 * @category content
 * @aliases Chip, Pill, Label
 * @documentation https://helix.fusion.dev/components/tag
 *
 * @slot - The tag's label.
 *
 * @csspart dismiss - The remove button, when `dismissible`.
 *
 * @event {HelixDismissEvent} helix-dismiss - Fired when the reader asks to remove the tag.
 *
 * @cssproperty --tag-background-color - Fill behind the tag.
 * @cssproperty --tag-foreground-color - Label color.
 * @cssproperty --tag-radii - Corner radius of the tag.
 */
@customElement('helix-tag')
export class HelixTag extends HelixBaseTag {
  /**
   * Which status the tag reports.
   *
   * This was called `appearance`, and it never was one. Everywhere else in the
   * library `appearance` is a treatment (`outlined`, `elevated`, `plain`) and
   * `tone` is semantic color, which is what these five are and what
   * `helix-text` already calls them. One axis was wearing the other's name, and
   * the axis it should have held did not exist.
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
   * for neither, because color and fill were welded together.
   */
  @property({ reflect: true })
  appearance?: 'outlined' | 'solid' | 'subtle'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-tag': HelixTag
  }
}
