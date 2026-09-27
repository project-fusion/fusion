import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessAvatarGroup } from '@fusion.dev/helix-headless/avatar'
import type { CSSResultGroup } from 'lit'
import { styles } from './avatar-group.css.js'

/**
 * @summary Overlapping avatars, with a count for the ones not shown.
 *
 * @description
 * Avatars overlap by one step of space, so they read as a stack and each face
 * stays visible. Each avatar has a ring in the page background color, which
 * marks its edge against the avatar behind it.
 *
 * Each avatar is drawn over the one before it, in document order, with no
 * `z-index`. The group does not use `row-reverse` to put the first avatar on
 * top, because that also reverses the visual order: the person written first
 * would appear last.
 *
 * @since 0.1.0
 * @status stable
 * @aliases Avatar stack, Facepile
 * @documentation https://fusion.dev/helix/components/avatar
 *
 * @cssproperty --avatar-group-overlap - How far each avatar sits over the one before it.
 * @cssproperty --avatar-group-ring-color - Color of the ring that separates one avatar from the next.
 */
@customElement('helix-avatar-group')
export class HelixAvatarGroup extends HelixHeadlessAvatarGroup {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-avatar-group': HelixAvatarGroup
  }
}
