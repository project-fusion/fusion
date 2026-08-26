import { customElement } from '@helix-io/core'
import { HelixHeadlessAvatarGroup } from '@helix-io/headless/avatar'
import type { CSSResultGroup } from 'lit'
import { styles } from './avatar-group.css.js'

/**
 * @summary Overlapping avatars, with a count for the ones not shown.
 *
 * @description
 * They overlap by a step of space, which is enough to read as a stack without
 * the faces occluding each other. Each carries a ring in the page's own
 * background color, because a stack with no separation between its members
 * reads as one shape rather than several: the ring is what makes the edge of
 * each avatar visible against the one behind it.
 *
 * Each avatar is drawn over the one before it, which falls out of document
 * order and needs no `z-index`. The familiar trick for putting the *first*
 * avatar on top is `row-reverse`, and it also reverses the row: the person
 * written first appears last. A facepile whose reading order is the reverse of
 * its markup is the worse trade of the two.
 *
 * @since 0.1.0
 * @status stable
 * @aliases Avatar stack, Facepile
 * @documentation https://helix.fusion.dev/components/avatar
 *
 * @cssproperty --avatar-group-overlap - How far each avatar sits over the one before it.
 * @cssproperty --avatar-group-ring-color - The separation drawn between one avatar and the next.
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
