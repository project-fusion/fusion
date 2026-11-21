import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessChat } from '@fusion.dev/helix-headless/chat/root'
import type { CSSResultGroup } from 'lit'
import { styles as collectionStateStyles } from '../../shared/collection/state.css.js'
import { styles as liveStyles } from '../../shared/live/live.css.js'
import { styles as typingStyles } from '../typing.css.js'
import { styles } from './chat-root.css.js'
import '../message/chat-message.js'

/**
 * @summary A conversation's turns in a scrolling transcript that keeps the user's place.
 *
 * @description
 * The chat stacks three regions, and only the transcript scrolls, so the
 * composer stays in view while the user scrolls back to read.
 *
 * When there are too few turns to fill the transcript, they sit at the bottom,
 * the way a conversation looks.
 *
 * The control that returns to the bottom sits over the transcript, so showing
 * it does not move the text the user is reading.
 *
 * @since 0.1.0
 * @status stable
 * @category feedback
 * @use A conversation between people, or with an agent, such as a support thread.
 * @instead log - Output from a process, such as a build, that you follow as it runs.
 * @instead timeline - Events in the order they happened, such as an audit trail.
 * @instead notifications - A record of events you mark read.
 * @anatomy header?
 * @anatomy message
 * @anatomy status?
 * @anatomy composer
 * @practice Pass the turns either as children or as `turns`. - A chat given both draws every turn from `turns` and then the children.
 * @practice Import `@fusion.dev/helix/chat/composer` beside `@fusion.dev/helix/chat/root` where you write a `Chat.Composer`. - A chat that only shows a conversation needs no composer, so the root's entry leaves it out.
 * @documentation https://fusion.dev/design/components/chat
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
 * @cssproperty --chat-scrollbar-thumb-color - The thumb of the transcript's scrollbar. Defaults to `--helix-scrollbar-thumb-color`.
 * @cssproperty --chat-scrollbar-thumb-hover-color - The thumb while the pointer is over the transcript. Defaults to `--helix-scrollbar-thumb-hover-color`.
 * @cssproperty --chat-scrollbar-track-color - The track of the transcript's scrollbar. Defaults to `--helix-scrollbar-track-color`.
 * @cssproperty --chat-typing-color - The color of the dots and the words that say who is typing.
 * @cssproperty --chat-typing-gap - The space between the dots and the words that say who is typing.
 */
@customElement('helix-chat')
export class HelixChat extends HelixHeadlessChat {
  static override tier = 'helix-'

  static override styles: CSSResultGroup = [liveStyles, collectionStateStyles, typingStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-chat': HelixChat
  }
}
