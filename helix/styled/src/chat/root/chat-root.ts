import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessChat } from '@fusion.dev/helix-headless/chat'
import type { CSSResultGroup } from 'lit'
import { styles as collectionStateStyles } from '../../shared/collection/state.css.js'
import { styles as liveStyles } from '../../shared/live/live.css.js'
import { styles } from './chat-root.css.js'
import '../composer/chat-composer.js'
import '../message/chat-message.js'

/**
 * @summary A conversation's turns in a scrolling transcript that keeps the user's place.
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
 * @status stable
 * @category feedback
 * @documentation https://fusion.dev/helix/components/chat
 *
 * @slot - The turns.
 * @slot composer - The composer, below the transcript.
 * @slot header - Content above the transcript.
 * @slot resume - The control that returns to the bottom.
 * @slot status - Status beside the composer, such as someone typing or a lost connection.
 *
 * @csspart composer - The region the composer sits in.
 * @csspart log - The transcript, which scrolls.
 *
 * @cssproperty --chat-gap - Space between turns.
 * @cssproperty --chat-max-block-size - How tall the conversation may get before the transcript scrolls.
 * @cssproperty --chat-padding-inline - Space either side of every region.
 * @cssproperty --chat-resume-border-color - Color of the edge around the resume control.
 * @cssproperty --chat-resume-border-width - Width of the edge around the resume control, which sits over content.
 * @cssproperty --chat-resume-shadow - Shadow under the resume control, which floats over the transcript.
 * @cssproperty --chat-rule - The hairline under the header.
 */
@customElement('helix-chat')
export class HelixChat extends HelixHeadlessChat {
  static override tier = 'helix-'

  static override styles: CSSResultGroup = [liveStyles, collectionStateStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-chat': HelixChat
  }
}
