import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessChatComposer } from '@fusion.dev/helix-headless/chat'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles as dictationStyles } from '../../shared/dictation/dictation.css.js'
import { styles } from './chat-composer.css.js'

/** The angle the glow's sweep runs through, which the sheet animates. */
const SWEEP = '--helix-chat-composer-sweep'

/**
 * Registers the sweep's angle, once, so the browser can animate it.
 *
 * **From script, because a sheet cannot.** An `@property` rule inside a
 * shadow root is ignored, and a gradient's angle only interpolates once its
 * property is registered as an angle. A registration is the document's, so it
 * reaches every composer's shadow root. Where the browser has no
 * `registerProperty`, or on the server, the sweep shows and fades without
 * travelling, which is still the cue.
 */
let registered = false
function registerSweep(): void {
  if (registered || typeof CSS === 'undefined' || !('registerProperty' in CSS)) {
    return
  }
  registered = true
  try {
    CSS.registerProperty({ inherits: false, initialValue: '0deg', name: SWEEP, syntax: '<angle>' })
  } catch {
    // Registered already, by another copy of this module on the page.
  }
}

/**
 * @summary A field for writing a turn in a conversation.
 *
 * @description
 * The composer is one row, and the field takes the remaining width. The field
 * grows with its text up to a maximum height, through `field-sizing: content`.
 * Where that is not supported, the field keeps its rows and scrolls. The
 * maximum height keeps the composer from covering the transcript.
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
 * @cssproperty --chat-composer-glow-color - Color of the focus glow under `glow`. Defaults to the primary color.
 * @cssproperty --chat-composer-border-width - Width of the composer's edge, so your theme can remove it.
 * @cssproperty --chat-composer-max-block-size - Maximum height the field grows to.
 * @cssproperty --dictation-level - How loud the microphone is while the field listens for dictation, from 0 to 1, which the element sets; the ring around the dictation button grows with it.
 */
@customElement('helix-chat-composer')
export class HelixChatComposer extends HelixHeadlessChatComposer {
  static override tier = 'helix-'

  /**
   * Draws the composer's focus as a glow: a light that runs once around the
   * edge as the composer takes focus, then a soft steady edge while it holds
   * it, in place of the focus ring.
   *
   * **On focus, and only then.** It says the composer is listening. A glow
   * that ran while a reply was on its way would be a second indicator of what
   * the conversation already shows, and one that ran all the time would be
   * decoration that moves. With reduced motion asked for, the edge lights
   * without the sweep.
   *
   * The steady edge is the focus indicator, so the ring is not drawn as well.
   * Its color is `--chat-composer-glow-color`, the primary color unless set.
   */
  @property({ reflect: true, type: Boolean })
  glow = false

  override connectedCallback(): void {
    super.connectedCallback()
    registerSweep()
  }

  static override styles: CSSResultGroup = [styles, dictationStyles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-chat-composer': HelixChatComposer
  }
}
