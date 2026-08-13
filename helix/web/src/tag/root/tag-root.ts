import { customElement } from '@helix-io/core'
import { HelixBaseTag } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './tag-root.css.js'

/**
 * @summary Labels content with a short piece of metadata.
 *
 * @description
 * Five appearances, drawn as a tinted fill derived from the status color with
 * `color-mix` rather than from a token per status. The alternative was eight
 * new tokens whose only job was to be a lighter version of one that already
 * existed, and they would have had to be re-derived by every theme.
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
 * @event {HelixRemoveRequestEvent} RemoveRequest - Fired when the reader asks to remove the tag.
 *
 * @cssproperty --tag-background-color - Fill behind the tag.
 * @cssproperty --tag-foreground-color - Label color.
 * @cssproperty --tag-radii - Corner radius of the tag.
 */
@customElement('helix-tag')
export class HelixTag extends HelixBaseTag {
  /** Which status the tag reports. */
  @property({ reflect: true })
  appearance: 'neutral' | 'primary' | 'success' | 'warning' | 'danger' = 'neutral'

  /** Height and inset of the tag. */
  @property({ reflect: true })
  size: 'sm' | 'md' = 'md'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-tag': HelixTag
  }
}
