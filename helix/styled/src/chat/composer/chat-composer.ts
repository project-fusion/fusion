import { customElement } from '@helix-io/core'
import { HelixHeadlessChatComposer } from '@helix-io/headless/chat'
import type { CSSResultGroup } from 'lit'
import { styles } from './chat-composer.css.js'

/**
 * @summary Where the reader writes their turn.
 *
 * @description
 * One row, and the field takes the room. **It grows with the text and stops at a
 * ceiling**, through `field-sizing: content` rather than a script measuring
 * anything: where that is not supported the field keeps its rows and scrolls,
 * which is the answer a textarea has always given. A composer that grows without
 * a ceiling eats the transcript it belongs to.
 *
 * @since 0.1.0
 * @status experimental
 * @category forms
 * @documentation https://helix.fusion.dev/components/chat
 *
 * @slot start - Before the field: attachments, a model picker.
 * @slot end - After the field, beside the send control.
 *
 * @csspart field - The text field.
 * @csspart send - The control that offers the turn.
 *
 * @cssproperty --chat-composer-background - Fill behind the field.
 * @cssproperty --chat-composer-max-height - How tall the field may grow.
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
