import { customElement } from '@helix-io/core'
import { HelixHeadlessChat } from '@helix-io/headless/chat'
import type { CSSResultGroup } from 'lit'
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
 * @slot header - Above the transcript.
 * @slot composer - Below the transcript, where the reader writes.
 * @slot status - Beside the composer: somebody typing, connection lost.
 * @slot resume - The way back to the bottom.
 *
 * @csspart log - The transcript, which is the thing that scrolls.
 * @csspart composer - The region the composer sits in.
 *
 * @cssproperty --chat-max-height - How tall the conversation may get before the transcript scrolls.
 * @cssproperty --chat-gap - Space between turns.
 * @cssproperty --chat-rule - The hairline under the header.
 * @cssproperty --chat-padding-inline - Space either side of every region.
 * @cssproperty --chat-resume-shadow - The lift under the way back, which floats over the transcript.
 */
@customElement('helix-chat')
export class HelixChat extends HelixHeadlessChat {
  static override tier = 'helix-'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-chat': HelixChat
  }
}
