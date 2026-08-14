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
 * @aliases Chip, Pill, Label
 * @documentation https://helix.fusion.dev/components/tag
 *
 * @slot - The tag's label.
 *
 * @csspart remove - The remove button, when `removable`.
 *
 * @event {HelixDismissEvent} helix-dismiss - Fired when the reader asks to remove the tag.
 *
 * @cssproperty --tag-background-color - Fill behind the tag.
 * @cssproperty --tag-foreground-color - Label color.
 * @cssproperty --tag-radii - Corner radius of the tag.
 */
@customElement('helix-tag')
export class HelixTag extends HelixBaseTag {
  /** Which status the tag reports. */
  @property({ reflect: true })
  appearance?: 'neutral' | 'primary' | 'success' | 'warning' | 'danger'

  /** Height and inset of the tag. */
  @property({ reflect: true })
  size?: 'sm' | 'md'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-tag': HelixTag
  }
}
