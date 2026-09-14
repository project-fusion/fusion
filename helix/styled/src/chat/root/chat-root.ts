import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessChat } from '@fusion.dev/helix-headless/chat'
import type { CSSResultGroup } from 'lit'
import { styles as collectionStateStyles } from '../../shared/collection/state.css.js'
import { styles } from './chat-root.css.js'
import '../composer/chat-composer.js'
import '../message/chat-message.js'

/**
 * @summary A conversation: the turns, and where the reader is in them.
 *
 * @description
 * Three regions stacked, and only the transcript scrolls: a composer that slid
 * away as the reader scrolled up to re-read would be the thing they were about
 * to type into.
 *
 * **The transcript keeps its turns at the bottom when there are too few to fill
 * it**, which is what a conversation looks like. A new one starting at the top
 * of an empty column reads as a document.
 *
 * The way back sits over the transcript rather than in the column, so offering
 * it does not move what the reader is reading, which is the whole point of
 * offering it.
 *
 * @since 0.1.0
 * @status experimental
 * @category feedback
 * @documentation https://helix.fusion.dev/components/chat
 *
 * @slot - The turns, as `helix-chat-message` children.
 * @slot composer - Below the transcript, where the reader writes.
 * @slot header - Above the transcript.
 * @slot resume - The way back to the bottom.
 * @slot status - Beside the composer: somebody typing, connection lost.
 *
 * @csspart composer - The region the composer sits in.
 * @csspart log - The transcript, which is the thing that scrolls.
 *
 * @cssproperty --chat-gap - Space between turns.
 * @cssproperty --chat-max-block-size - How tall the conversation may get before the transcript scrolls.
 * @cssproperty --chat-padding-inline - Space either side of every region.
 * @cssproperty --chat-resume-border-color - The edge around the way back.
 * @cssproperty --chat-resume-border-width - How thick that edge is, for a surface over content.
 * @cssproperty --chat-resume-shadow - The lift under the way back, which floats over the transcript.
 * @cssproperty --chat-rule - The hairline under the header.
 */
@customElement('helix-chat')
export class HelixChat extends HelixHeadlessChat {
  static override tier = 'helix-'

  static override styles: CSSResultGroup = [collectionStateStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-chat': HelixChat
  }
}
