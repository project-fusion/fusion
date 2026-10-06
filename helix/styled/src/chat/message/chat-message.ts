import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessChatMessage } from '@fusion.dev/helix-headless/chat'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles as typingStyles } from '../typing.css.js'
import { styles } from './chat-message.css.js'

/**
 * @summary One turn in a conversation, with its state, such as sending or failed.
 *
 * @description
 * `author="me"` is the only style that shows whose turn it is, and it sets
 * which edge the turn sits against. Everything else about a turn looks the same
 * on both sides.
 *
 * Only a failed turn takes a tone, because the user has to find a failure.
 * `streaming` has no extra style, because the arriving text already shows it.
 *
 * @since 0.1.0
 * @status stable
 * @category feedback
 * @documentation https://fusion.dev/helix/components/chat
 *
 * @slot - The turn's content.
 * @slot actions - Controls for the turn.
 * @slot avatar - The author's avatar.
 * @slot indicator - The indicator shown before the first token arrives. Replaces the three dots.
 *
 * @csspart content - The turn's content.
 * @csspart indicator - The three dots, shown when nothing is in the `indicator` slot.
 * @csspart meta - The time and the state together.
 *
 * @cssproperty --chat-indicator-background-color - Fill behind a slotted indicator, drawn as a chip so its icon and its text read as one unit.
 * @cssproperty --chat-message-background-color - Fill behind a turn.
 * @cssproperty --chat-message-background-color-me - Fill behind turns by `me`.
 * @cssproperty --chat-message-color - Text color in a turn.
 * @cssproperty --chat-message-color-me - Text color in turns by `me`.
 * @cssproperty --chat-message-measure - Maximum width of a turn before its text wraps.
 * @cssproperty --chat-message-meta-color - Color of the line under a turn, with its time and state.
 * @cssproperty --chat-message-padding-block - Space above and below a turn's content inside its bubble.
 * @cssproperty --chat-message-padding-inline - Space either side of a turn's content inside its bubble.
 * @cssproperty --chat-message-radius - Corner radius of a turn's bubble.
 */
@customElement('helix-chat-message')
export class HelixChatMessage extends HelixHeadlessChatMessage {
  static override tier = 'helix-'

  static override styles: CSSResultGroup = [typingStyles, styles]

  /**
   * How the turn is set apart. `filled` draws a bubble, and `plain` draws the
   * turn as text on the transcript.
   *
   * **A bubble is one answer and not the only one.** Two people messaging read
   * as two columns of bubbles; an assistant answering does not, the reply being
   * a paragraph with code and lists in it, set as prose with the reader's own
   * turns in bubbles beside it.
   *
   * - `filled` is the default and is told apart by its own ground, which is the
   *   bubble.
   * - `plain` has no ground and no edge: the turn is text on the transcript, and
   *   the space around it and the avatar beside it are what separate it. For an
   *   assistant's side of a conversation, and for any turn long enough that a
   *   fill reads as a wall.
   *
   * **On this tier**, because `separation` is paint and the headless tier has
   * no ground to end. The two values are a subset of the registry's four:
   * `elevated` reads as a card and `outlined` as an input, so neither is a
   * thing a turn should be.
   */
  @property({ reflect: true })
  separation?: 'filled' | 'plain'
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-chat-message': HelixChatMessage
  }
}
