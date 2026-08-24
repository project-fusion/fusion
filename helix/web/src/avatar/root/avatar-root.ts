import { customElement } from '@helix-io/core'
import { HelixBaseAvatar } from '@helix-io/headless/avatar'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './avatar-root.css.js'

/**
 * @summary Represents a person or entity with an image or their initials.
 *
 * @description
 * Initials scale with the avatar rather than being sized per size, because the
 * font size is set in `em` against the avatar's own dimension. One rule covers
 * every size, including one a consumer sets themselves through
 * `--avatar-size`.
 *
 * @since 0.1.0
 * @status experimental
 * @category media
 * @aliases Profile picture, Gravatar
 * @documentation https://helix.fusion.dev/components/avatar
 *
 * @slot - Replaces the image and initials entirely, for an icon.
 *
 * @csspart image - The image, when one is loading or loaded.
 * @csspart initials - The initials shown when there is no usable image.
 *
 * @cssproperty --avatar-background-color - Fill behind the initials.
 * @cssproperty --avatar-size - Edge length of the avatar.
 */
@customElement('helix-avatar')
export class HelixAvatar extends HelixBaseAvatar {
  /** Whether the avatar is a circle or a rounded square. */
  @property({ reflect: true })
  shape?: 'circle' | 'square'

  /** Edge length of the avatar. */
  @property({ reflect: true })
  size?: 'sm' | 'md' | 'lg'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-avatar': HelixAvatar
  }
}
