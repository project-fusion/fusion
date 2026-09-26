import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessChatComposer } from '@fusion.dev/helix-headless/chat'
import type { CSSResultGroup } from 'lit'
import { styles } from './chat-composer.css.js'

/**
 * @summary A field for writing a turn in a conversation.
 *
 * @description
 * One row, and the field takes the room. **It grows with the text and stops at a
 * ceiling**, through `field-sizing: content` rather than a script measuring
 * anything: where that is not supported the field keeps its rows and scrolls,
 * which is the answer a textarea has always given. A composer that grows without
 * a ceiling eats the transcript it belongs to.
 *
 * @since 0.1.0
 * @status stable
 * @category forms
 * @documentation https://fusion.dev/helix/components/chat
 *
 * @slot end - Content under the field, beside the send button.
 * @slot start - Content under the field at the leading edge, such as an attachment button or a model picker.
 *
 * @csspart field - The text field.
 * @csspart send - The send button.
 * @csspart tools - The row under the field.
 *
 * @cssproperty --chat-composer-background-color - Fill behind the composer.
 * @cssproperty --chat-composer-border-width - Width of the composer's edge, so your theme can remove it.
 * @cssproperty --chat-composer-max-block-size - Maximum height the field grows to.
 */
@customElement('helix-chat-composer')
export class HelixChatComposer extends HelixHeadlessChatComposer {
  static override tier = 'helix-'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-chat-composer': HelixChatComposer
  }
}
