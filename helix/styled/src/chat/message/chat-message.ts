import { customElement } from '@helix-io/core'
import { HelixHeadlessChatMessage } from '@helix-io/headless/chat'
import type { CSSResultGroup } from 'lit'
import { styles } from './chat-message.css.js'

/**
 * @summary One turn in a conversation, and what has happened to it.
 *
 * @description
 * **`author="me"` is the one piece of paint that says whose turn it is**, and it
 * says it by which edge the turn sits against. Everything else about a turn is
 * the same on both sides, because two bubble styles is two components.
 *
 * A failure is the only state that takes a tone, because it is the one a reader
 * has to find rather than notice. `streaming` is left alone: the text arriving
 * is the signal, and decorating it competes with the thing it is decorating.
 *
 * @since 0.1.0
 * @status experimental
 * @category feedback
 * @documentation https://helix.fusion.dev/components/chat
 *
 * @slot - What was said.
 * @slot avatar - Who said it.
 * @slot actions - What can be done with it.
 *
 * @csspart content - What was said.
 * @csspart meta - The time and the state together.
 *
 * @cssproperty --chat-message-background - Fill behind a turn.
 * @cssproperty --chat-message-background-me - Fill behind the reader's own turns.
 * @cssproperty --chat-message-color - Ink in a turn.
 * @cssproperty --chat-message-measure - How wide a turn may get before it wraps.
 */
@customElement('helix-chat-message')
export class HelixChatMessage extends HelixHeadlessChatMessage {
  static override tier = 'helix-'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-chat-message': HelixChatMessage
  }
}
