import { customElement } from '@helix-io/core'
import { HelixHeadlessChatMessage } from '@helix-io/headless/chat'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
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
 * @cssproperty --chat-message-border-width - The edge every turn carries, which only a failed one colors.
 * @cssproperty --chat-message-background-me - Fill behind the reader's own turns.
 * @cssproperty --chat-message-color - Ink in a turn.
 * @cssproperty --chat-message-measure - How wide a turn may get before it wraps.
 */
@customElement('helix-chat-message')
export class HelixChatMessage extends HelixHeadlessChatMessage {
  static override tier = 'helix-'

  static override styles: CSSResultGroup = styles

  /**
   * Where the turn's surface ends.
   *
   * **A bubble is one answer and not the only one, and the category has moved.**
   * Two people messaging read as two columns of bubbles, which is what the form
   * has looked like since it existed. An assistant answering does not: the reply
   * is a paragraph, often a long one with code and lists in it, and every AI
   * surface worth copying sets it as prose with the reader's own turns in
   * bubbles beside it. A component that can only draw bubbles cannot render the
   * conversation most people are now building.
   *
   * - `filled` is the default and is told apart by its own ground, which is the
   *   bubble.
   * - `plain` has no ground and no edge: the turn is text on the transcript, and
   *   the space around it and the avatar beside it are what separate it. For an
   *   assistant's side of a conversation, and for any turn long enough that a
   *   fill reads as a wall.
   *
   * **On this tier, because it is where the surface ends and nothing else.**
   * `check:axes` keeps `separation` off the headless tier for the reason it
   * keeps every painted axis off it: that tier has no ground to end. The two
   * values are a subset of the registry's four; `elevated` and `outlined` are
   * available and neither is a thing a turn should be, a lifted message reading
   * as a card and an outlined one as an input.
   */
  @property({ reflect: true })
  separation?: 'filled' | 'plain'
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-chat-message': HelixChatMessage
  }
}
