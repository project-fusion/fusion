import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessAvatar } from '@fusion.dev/helix-headless/avatar'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './avatar-root.css.js'

/**
 * @summary A person or entity, shown as an image or as their initials.
 *
 * @description
 * Initials scale with the avatar rather than being sized per size, because the
 * font size is set in `em` against the avatar's own dimension. One rule covers
 * every size, including one a consumer sets themselves through
 * `--avatar-size`.
 *
 * @since 0.1.0
 * @status stable
 * @category media
 * @aliases Profile picture, Gravatar
 * @documentation https://fusion.dev/helix/components/avatar
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
export class HelixAvatar extends HelixHeadlessAvatar {
  /**
   * Whether the avatar is a circle or a rounded square.
   *
   * `rounded` and not `square`, which is the sharp-cornered pole of the same
   * axis and what `QrCode` draws with it. This corner is `radii-md`, so the word
   * for it is the one the registry already has.
   */
  @property({ reflect: true })
  shape?: 'circle' | 'rounded'

  /**
   * Edge length of the avatar.
   */
  @property({ reflect: true })
  size?: 'sm' | 'md' | 'lg'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-avatar': HelixAvatar
  }
}
